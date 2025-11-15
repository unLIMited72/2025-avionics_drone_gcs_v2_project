const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds

export type LockState = 'idle' | 'requesting' | 'acquired' | 'denied' | 'lost';

export interface LockResponse {
  ok: boolean;
  code?: string;
  message?: string;
  ownerId?: string;
}

export class GcsLockService {
  private clientId: string;
  private heartbeatTimer: number | null = null;
  private onLockLostCallback: (() => void) | null = null;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  setOnLockLost(callback: () => void) {
    this.onLockLostCallback = callback;
  }

  async acquireLock(): Promise<LockResponse> {
    try {
      const url = `${SUPABASE_URL}/functions/v1/gcs-acquire-lock`;
      console.log('[GcsLockService] Acquiring lock at:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId: this.clientId }),
      });

      console.log('[GcsLockService] Acquire lock response status:', response.status);
      const data = await response.json();
      console.log('[GcsLockService] Acquire lock response data:', data);
      return data;
    } catch (error) {
      console.error('[GcsLockService] Error acquiring lock:', error);
      return {
        ok: false,
        code: 'NETWORK_ERROR',
        message: '네트워크 오류가 발생했습니다.',
      };
    }
  }

  async sendHeartbeat(): Promise<LockResponse> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/gcs-heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId: this.clientId }),
      });

      const data = await response.json();
      if (!data.ok) {
        console.warn('[GcsLockService] Heartbeat failed:', data);
      }
      return data;
    } catch (error) {
      console.error('[GcsLockService] Error sending heartbeat:', error);
      return {
        ok: false,
        code: 'NETWORK_ERROR',
        message: '네트워크 오류가 발생했습니다.',
      };
    }
  }

  async releaseLock(): Promise<LockResponse> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/gcs-release-lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId: this.clientId }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error releasing lock:', error);
      return {
        ok: false,
        code: 'NETWORK_ERROR',
        message: '네트워크 오류가 발생했습니다.',
      };
    }
  }

  startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = window.setInterval(async () => {
      const result = await this.sendHeartbeat();

      if (!result.ok) {
        this.stopHeartbeat();
        if (this.onLockLostCallback) {
          this.onLockLostCallback();
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  cleanup() {
    this.stopHeartbeat();
  }
}
