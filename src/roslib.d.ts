declare module 'roslib' {
  export default ROSLIB;

  namespace ROSLIB {
    interface RosOptions {
      url: string;
    }

    class Ros {
      constructor(options: RosOptions);
      on(event: 'connection', callback: () => void): void;
      on(event: 'close', callback: () => void): void;
      on(event: 'error', callback: (error: Error) => void): void;
      close(): void;
      connected: boolean;
    }

    interface TopicOptions {
      ros: Ros;
      name: string;
      messageType: string;
      queue_length?: number;
    }

    class Topic {
      constructor(options: TopicOptions);
      subscribe(callback: (message: any) => void): void;
      unsubscribe(): void;
      publish(message: any): void;
      advertise(): void;
      unadvertise(): void;
    }

    interface ServiceOptions {
      ros: Ros;
      name: string;
      serviceType: string;
    }

    class Service {
      constructor(options: ServiceOptions);
      callService(request: any, callback: (response: any) => void): void;
    }
  }
}
