import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

const supabase = createClient(supabaseUrl, supabaseKey);

const SESSION_DURATION = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL = 30 * 1000;

export class SessionManager {
  private sessionToken: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private onSessionLost: (() => void) | null = null;

  constructor() {
    this.sessionToken = this.getOrCreateSessionToken();
  }

  setOnSessionLost(callback: () => void) {
    this.onSessionLost = callback;
  }

  private getOrCreateSessionToken(): string {
    let token = localStorage.getItem('session_token');
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem('session_token', token);
    }
    return token;
  }

  async checkAndAcquireSession(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.cleanupExpiredSessions();

      const { data: existingSessions } = await supabase
        .from('active_sessions')
        .select('*')
        .gt('expires_at', new Date().toISOString());

      if (existingSessions && existingSessions.length > 0) {
        const mySession = existingSessions.find(s => s.session_token === this.sessionToken);

        if (mySession) {
          await this.updateHeartbeat();
          this.startHeartbeat();
          this.subscribeToSessionChanges();
          return { success: true };
        }

        return {
          success: false,
          message: '현재 다른 사용자가 접속 중입니다.'
        };
      }

      const { data: myOldSession } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('session_token', this.sessionToken)
        .maybeSingle();

      if (myOldSession) {
        await supabase
          .from('active_sessions')
          .delete()
          .eq('session_token', this.sessionToken);
      }

      const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();
      const { error } = await supabase
        .from('active_sessions')
        .insert({
          session_token: this.sessionToken,
          expires_at: expiresAt
        });

      if (error) {
        console.error('Failed to create session:', error);
        return { success: false, message: '세션 생성에 실패했습니다.' };
      }

      this.startHeartbeat();
      this.subscribeToSessionChanges();
      return { success: true };
    } catch (error) {
      console.error('Session check error:', error);
      return { success: false, message: '세션 확인 중 오류가 발생했습니다.' };
    }
  }

  private subscribeToSessionChanges(): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
    }

    this.realtimeChannel = supabase
      .channel('session_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_sessions'
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedToken = payload.old.session_token;
            if (deletedToken === this.sessionToken) {
              if (this.onSessionLost) {
                this.onSessionLost();
              }
            }
          } else if (payload.eventType === 'INSERT') {
            const insertedToken = payload.new.session_token;
            if (insertedToken !== this.sessionToken) {
              const { data: sessions } = await supabase
                .from('active_sessions')
                .select('*')
                .gt('expires_at', new Date().toISOString());

              if (sessions && sessions.length > 1) {
                const mySession = sessions.find(s => s.session_token === this.sessionToken);
                if (!mySession) {
                  if (this.onSessionLost) {
                    this.onSessionLost();
                  }
                }
              }
            }
          }
        }
      )
      .subscribe();
  }

  private async cleanupExpiredSessions(): Promise<void> {
    try {
      await supabase
        .from('active_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  private async updateHeartbeat(): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();
      await supabase
        .from('active_sessions')
        .update({
          last_heartbeat: new Date().toISOString(),
          expires_at: expiresAt
        })
        .eq('session_token', this.sessionToken);
    } catch (error) {
      console.error('Heartbeat update error:', error);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.updateHeartbeat();
    }, HEARTBEAT_INTERVAL);
  }

  releaseSession(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }

    navigator.sendBeacon(
      `${supabaseUrl}/rest/v1/active_sessions?session_token=eq.${this.sessionToken}`,
      JSON.stringify({})
    );

    fetch(`${supabaseUrl}/rest/v1/active_sessions?session_token=eq.${this.sessionToken}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      keepalive: true
    }).catch(() => {});
  }
}
