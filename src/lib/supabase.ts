import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export interface GCSState {
  id: string;
  selected_drones: number[];
  flight_mode: 'mission' | 'gyro' | null;
  target_altitude: number;
  target_speed: number;
  mission_active: boolean;
  is_airborne: boolean;
  drone_positions: Array<{
    droneNumber: number;
    lat: number;
    lng: number;
    heading: number;
  }>;
  updated_at: string;
  updated_by: string;
}

const GCS_STATE_ID = '00000000-0000-0000-0000-000000000001';

export async function getGCSState(): Promise<GCSState | null> {
  const { data, error } = await supabase
    .from('gcs_state')
    .select('*')
    .eq('id', GCS_STATE_ID)
    .maybeSingle();

  if (error) {
    console.error('Error fetching GCS state:', error);
    return null;
  }

  return data;
}

export async function updateGCSState(updates: Partial<GCSState>, updatedBy: string): Promise<boolean> {
  const { error } = await supabase
    .from('gcs_state')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy
    })
    .eq('id', GCS_STATE_ID);

  if (error) {
    console.error('Error updating GCS state:', error);
    return false;
  }

  return true;
}

export function subscribeToGCSState(callback: (state: GCSState) => void) {
  const channel = supabase
    .channel('gcs_state_changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'gcs_state',
        filter: `id=eq.${GCS_STATE_ID}`
      },
      (payload) => {
        callback(payload.new as GCSState);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
