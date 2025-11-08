declare module 'roslib' {
  export = ROSLIB;

  namespace ROSLIB {
    class Ros {
      constructor(options: { url: string });
      on(event: string, callback: (error?: Error) => void): void;
      close(): void;
      isConnected: boolean;
    }

    class Topic {
      constructor(options: { ros: Ros; name: string; messageType: string });
      subscribe(callback: (message: any) => void): void;
      unsubscribe(): void;
    }
  }
}
