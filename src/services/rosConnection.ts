import ROSLIB from 'roslib';
import { MissionStatusMessage } from '../roslib';

export interface DroneStatus {
  id: string;
  connected: boolean;
  battery: number;
  ready: boolean;
  armed: boolean;
  status: 'Normal' | 'Warning' | 'Danger';
  latitude?: number;
  longitude?: number;
  headingDeg?: number;
}

export interface UIStatusMessage {
  timestamp: number;
  drone_ids: string[];
  heartbeats: boolean[];
  battery_percentages: number[];
  flight_readies: boolean[];
  armeds: boolean[];
  status_in_flights: number[];
  latitudes: number[];
  longitudes: number[];
  heading_degs: number[];
}

export interface MissionStatus {
  mission_id: string;
  state: number;
  drone_ids: string[];
}

export const MissionStateEnum = {
  STATE_IDLE: 0,
  STATE_ACTIVE: 1,
  STATE_PAUSED: 2,
  STATE_EMERGENCY: 3,
  STATE_COMPLETED: 4,
  STATE_ABORTED: 5,
} as const;

export interface GyroControlPayload {
  drone_id: string;
  command: 'TAKEOFF' | 'LAND' | 'CONTROL';
  target_altitude_m?: number;
  yaw_deg?: number;
  vx_mps?: number;
  vy_mps?: number;
}

class ROSConnection {
  private ros: ROSLIB.Ros | null = null;
  private uiStatusTopic: ROSLIB.Topic | null = null;
  private missionStatusTopic: ROSLIB.Topic | null = null;
  private gyroControlTopic: ROSLIB.Topic | null = null;
  private connectionCallbacks: ((connected: boolean) => void)[] = [];
  private statusCallbacks: ((drones: DroneStatus[]) => void)[] = [];
  private missionStatusCallbacks: ((status: MissionStatus) => void)[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private lastMessageTime: number = 0;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private isDisconnecting: boolean = false;
  private connected: boolean = false;
  private currentMissionStatus: MissionStatus | null = null;
  private droneTrails: Map<string, Array<{lat: number, lng: number, timestamp: number}>> = new Map();
  private trailCallbacks: ((trails: Map<string, Array<{lat: number, lng: number, timestamp: number}>>) => void)[] = [];

  connect(url: string) {
    this.disconnect();
    this.isDisconnecting = false;

    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('ws://')) {
      url = url.replace('ws://', 'wss://');
    }

    console.log(`Connecting to ROS bridge at: ${url}`);

    this.ros = new ROSLIB.Ros({
      url: url
    });

    this.ros.on('connection', () => {
      console.log('ROS bridge connected');
      this.connected = true;
      console.log('[ROSConnection] State after connection - ros:', !!this.ros, 'connected:', this.connected);
      this.notifyConnectionStatus(true);

      setTimeout(() => {
        this.subscribeTopic();
        this.subscribeMissionStatus();
        this.setupGyroControlTopic();
        this.startConnectionCheck();
      }, 100);
    });

    this.ros.on('error', (error?: Error) => {
      console.error('ROS connection error:', error);
      this.connected = false;
      this.notifyConnectionStatus(false);
      this.scheduleReconnect(url);
    });

    this.ros.on('close', () => {
      console.log('ROS connection closed');
      this.connected = false;
      this.notifyConnectionStatus(false);
      this.scheduleReconnect(url);
    });
  }

  private decodeBase64ToUint8Array(base64: string): number[] {
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
  }

  private parseStatusArray(statusInFlights: any): number[] {
    if (typeof statusInFlights === 'string') {
      return this.decodeBase64ToUint8Array(statusInFlights);
    } else if (Array.isArray(statusInFlights)) {
      return statusInFlights;
    }
    console.error('Unexpected status_in_flights format:', statusInFlights);
    return [];
  }

  private setupGyroControlTopic() {
    if (!this.ros) return;
    if (this.gyroControlTopic) return;

    this.gyroControlTopic = new ROSLIB.Topic({
      ros: this.ros,
      name: '/gcs/gyro_control_raw',
      messageType: 'std_msgs/String',
    });

    this.gyroControlTopic.advertise();
    console.log('[ROSConnection] Advertised /gcs/gyro_control_raw');
  }

  private subscribeMissionStatus() {
    if (!this.ros) return;

    this.missionStatusTopic = new ROSLIB.Topic({
      ros: this.ros,
      name: '/gcs/mission_status',
      messageType: 'px4_interface/msg/MissionStatus'
    });

    this.missionStatusTopic.subscribe((message: any) => {
      const msg = message as MissionStatusMessage;
      const status: MissionStatus = {
        mission_id: msg.mission_id || '',
        state: msg.state || 0,
        drone_ids: msg.drone_ids || [],
      };

      this.currentMissionStatus = status;
      this.notifyMissionStatusUpdate(status);

      if (status.state === MissionStateEnum.STATE_COMPLETED ||
          status.state === MissionStateEnum.STATE_ABORTED ||
          status.state === MissionStateEnum.STATE_IDLE) {
        this.clearDroneTrails();
      }
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

      const statusArray = this.parseStatusArray(msg.status_in_flights);

      const statusMap: { [key: number]: 'Normal' | 'Warning' | 'Danger' } = {
        0: 'Normal',
        1: 'Warning',
        2: 'Danger'
      };

      const drones: DroneStatus[] = msg.drone_ids.map((id: string, i: number) => {
        const statusValue = statusArray[i];
        const status = statusMap[statusValue] !== undefined ? statusMap[statusValue] : 'Normal';

        const lat = msg.latitudes?.[i];
        const lon = msg.longitudes?.[i];
        const heading = msg.heading_degs?.[i];

        const drone = {
          id,
          connected: msg.heartbeats[i],
          battery: msg.battery_percentages[i],
          ready: msg.flight_readies[i],
          armed: msg.armeds[i],
          status,
          latitude: (lat !== undefined && lat !== 0) ? lat : undefined,
          longitude: (lon !== undefined && lon !== 0) ? lon : undefined,
          headingDeg: heading !== undefined ? heading : undefined,
        };

        if (this.currentMissionStatus?.state === MissionStateEnum.STATE_ACTIVE ||
            this.currentMissionStatus?.state === MissionStateEnum.STATE_PAUSED) {
          if (lat !== undefined && lon !== undefined && lat !== 0 && lon !== 0) {
            this.addDroneTrailPoint(id, lat, lon);
          }
        }

        return drone;
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
      if (this.lastMessageTime > 0 && now - this.lastMessageTime > 10000) {
        this.notifyStatusUpdate([]);
      }
    }, 2000);
  }

  private scheduleReconnect(url: string) {
    if (this.isDisconnecting) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      console.warn('Attempting to reconnect to ROS bridge...');
      this.connect(url);
    }, 5000);
  }

  disconnect() {
    this.isDisconnecting = true;

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

    if (this.missionStatusTopic) {
      this.missionStatusTopic.unsubscribe();
      this.missionStatusTopic = null;
    }

    if (this.gyroControlTopic) {
      try {
        this.gyroControlTopic.unadvertise();
      } catch (e) {
        console.warn('Gyro control topic unadvertise error:', e);
      }
      this.gyroControlTopic = null;
    }

    const rosToClose = this.ros;
    this.ros = null;
    this.connected = false;
    this.lastMessageTime = 0;
    this.currentMissionStatus = null;
    this.clearDroneTrails();
    this.notifyConnectionStatus(false);

    if (rosToClose) {
      try {
        console.log('Closing existing ROS connection...');
        rosToClose.close();
      } catch (e) {
        console.warn('ROS close error:', e);
      }
    }

    setTimeout(() => {
      this.isDisconnecting = false;
    }, 100);
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

  onMissionStatusUpdate(callback: (status: MissionStatus) => void) {
    this.missionStatusCallbacks.push(callback);
    if (this.currentMissionStatus) {
      callback(this.currentMissionStatus);
    }
    return () => {
      this.missionStatusCallbacks = this.missionStatusCallbacks.filter(cb => cb !== callback);
    };
  }

  onTrailUpdate(callback: (trails: Map<string, Array<{lat: number, lng: number, timestamp: number}>>) => void) {
    this.trailCallbacks.push(callback);
    callback(this.droneTrails);
    return () => {
      this.trailCallbacks = this.trailCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyConnectionStatus(connected: boolean) {
    this.connectionCallbacks.forEach(cb => cb(connected));
  }

  private notifyStatusUpdate(drones: DroneStatus[]) {
    this.statusCallbacks.forEach(cb => cb(drones));
  }

  private notifyMissionStatusUpdate(status: MissionStatus) {
    this.missionStatusCallbacks.forEach(cb => cb(status));
  }

  private notifyTrailUpdate() {
    this.trailCallbacks.forEach(cb => cb(this.droneTrails));
  }

  private addDroneTrailPoint(droneId: string, lat: number, lng: number) {
    if (!this.droneTrails.has(droneId)) {
      this.droneTrails.set(droneId, []);
    }

    const trail = this.droneTrails.get(droneId)!;
    const timestamp = Date.now();

    if (trail.length > 0) {
      const lastPoint = trail[trail.length - 1];
      const distance = Math.sqrt(
        Math.pow(lat - lastPoint.lat, 2) + Math.pow(lng - lastPoint.lng, 2)
      );

      if (distance < 0.00001) {
        return;
      }
    }

    trail.push({ lat, lng, timestamp });

    const MAX_TRAIL_POINTS = 500;
    if (trail.length > MAX_TRAIL_POINTS) {
      trail.shift();
    }

    this.notifyTrailUpdate();
  }

  private clearDroneTrails() {
    this.droneTrails.clear();
    this.notifyTrailUpdate();
  }

  getCurrentMissionStatus(): MissionStatus | null {
    return this.currentMissionStatus;
  }

  getDroneTrails(): Map<string, Array<{lat: number, lng: number, timestamp: number}>> {
    return this.droneTrails;
  }

  isConnected(): boolean {
    return !!this.ros && this.connected;
  }

  getRos(): ROSLIB.Ros | null {
    return this.ros;
  }

  sendGyroCommand(payload: GyroControlPayload): boolean {
    if (!this.ros || !this.connected) {
      console.warn('[ROSConnection] Cannot send gyro command: not connected');
      return false;
    }
    if (!this.gyroControlTopic) {
      this.setupGyroControlTopic();
      if (!this.gyroControlTopic) {
        console.warn('[ROSConnection] gyroControlTopic not ready');
        return false;
      }
    }

    try {
      const msg = new ROSLIB.Message({
        data: JSON.stringify(payload),
      });
      this.gyroControlTopic.publish(msg);
      console.log('[ROSConnection] Gyro command sent:', payload.command);
      return true;
    } catch (e) {
      console.error('[ROSConnection] Failed to publish gyro command:', e);
      return false;
    }
  }
}

export const rosConnection = new ROSConnection();
