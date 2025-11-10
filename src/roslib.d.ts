declare module 'roslib' {
  namespace ROSLIB {
    // ROS 연결
    class Ros {
      constructor(options: { url: string });

      on(event: 'connection', callback: () => void): void;
      on(event: 'error', callback: (error: Error) => void): void;
      on(event: 'close', callback: () => void): void;
      on(event: string, callback: (...args: any[]) => void): void;

      close(): void;
      isConnected: boolean;
    }

    // Topic 옵션
    interface TopicOptions {
      ros: Ros;
      name: string;
      messageType: string;
      queue_size?: number;
      throttle_rate?: number;
      latch?: boolean;
    }

    // Topic
    class Topic {
      constructor(options: TopicOptions);

      publish(message: Message): void;
      subscribe(callback: (message: any) => void): void;
      unsubscribe(): void;

      advertise(): void;
      unadvertise(): void;
    }

    // Message
    class Message {
      constructor(values: any);
    }
  }

  export = ROSLIB;
}

export interface MissionStatusMessage {
  mission_id: string;
  state: number;
  drone_ids: string[];
}
