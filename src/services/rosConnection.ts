import ROSLIB from 'roslib';

export interface DroneStatus {
  id: string;
  connected: boolean;
  battery: number;
  ready: boolean;
  armed: boolean;
  status: 'Normal' | 'Warning' | 'Danger';
}

export interface UIStatusMessage {
  timestamp: number;
  drone_ids: string[];
  heartbeats: boolean[];
  battery_percentages: number[];
  flight_readies: boolean[];
  armeds: boolean[];
  status_in_flights: number[];
}

class ROSConnection {
  private ros: ROSLIB.Ros | null = null;
  private uiStatusTopic: ROSLIB.Topic | null = null;
  private connectionCallbacks: ((connected: boolean) => void)[] = [];
  private statusCallbacks: ((drones: DroneStatus[]) => void)[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastMessageTime: number = 0;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  connect(url: string) {
    this.disconnect();

    this.ros = new ROSLIB.Ros({
      url: url
    });

    this.ros.on('connection', () => {
      console.log('Connected to ROS bridge');
      this.notifyConnectionStatus(true);
      this.subscribeTopic();
      this.startConnectionCheck();
    });

    this.ros.on('error', (error?: Error) => {
      console.error('ROS connection error:', error);
      this.notifyConnectionStatus(false);
      this.scheduleReconnect(url);
    });

    this.ros.on('close', () => {
      console.log('Connection to ROS bridge closed');
      this.notifyConnectionStatus(false);
      this.scheduleReconnect(url);
    });
  }

  private subscribeTopic() {
    if (!this.ros) return;

    this.uiStatusTopic = new ROSLIB.Topic({
      ros: this.ros,
      name: '/gcs/ui_status',
      messageType: 'px4_interface/msg/UIStatus'
    });

    this.uiStatusTopic.subscribe((message: any) => {
      this.lastMessageTime = Date.now();
      const msg = message as any;

      // Base64 디코딩 함수
      const decodeBase64ToUint8Array = (base64: string): number[] => {
        try {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return Array.from(bytes);
        } catch (e) {
          console.error('Base64 decoding error:', e);
          return [];
        }
      };

      // status_in_flights가 Base64 문자열인 경우 디코딩
      let statusArray: number[];
      if (typeof msg.status_in_flights === 'string') {
        statusArray = decodeBase64ToUint8Array(msg.status_in_flights);
      } else if (Array.isArray(msg.status_in_flights)) {
        statusArray = msg.status_in_flights;
      } else {
        statusArray = [];
        console.error('Unexpected status_in_flights format:', msg.status_in_flights);
      }

      const statusMap: { [key: number]: 'Normal' | 'Warning' | 'Danger' } = {
        0: 'Normal',
        1: 'Warning',
        2: 'Danger'
      };

      const drones: DroneStatus[] = msg.drone_ids.map((id: string, i: number) => {
        const statusValue = statusArray[i];
        const status = statusMap[statusValue] !== undefined ? statusMap[statusValue] : 'Normal';

        return {
          id,
          connected: msg.heartbeats[i],
          battery: msg.battery_percentages[i],
          ready: msg.flight_readies[i],
          armed: msg.armeds[i],
          status,
        };
      });

      this.notifyStatusUpdate(drones);
    });
  }

  private startConnectionCheck() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(() => {
      const now = Date.now();
      if (this.lastMessageTime > 0 && now - this.lastMessageTime > 3000) {
        this.notifyStatusUpdate([]);
      }
    }, 1000);
  }

  private scheduleReconnect(url: string) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect(url);
    }, 3000);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    if (this.uiStatusTopic) {
      this.uiStatusTopic.unsubscribe();
      this.uiStatusTopic = null;
    }

    if (this.ros) {
      this.ros.close();
      this.ros = null;
    }

    this.lastMessageTime = 0;
    this.notifyConnectionStatus(false);
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionCallbacks.push(callback);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }

  onStatusUpdate(callback: (drones: DroneStatus[]) => void) {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyConnectionStatus(connected: boolean) {
    this.connectionCallbacks.forEach(cb => cb(connected));
  }

  private notifyStatusUpdate(drones: DroneStatus[]) {
    this.statusCallbacks.forEach(cb => cb(drones));
  }

  isConnected(): boolean {
    return this.ros !== null && this.ros.isConnected;
  }
}

export const rosConnection = new ROSConnection();
