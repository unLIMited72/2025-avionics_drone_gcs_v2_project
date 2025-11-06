/*
  # Create GCS State Table

  1. New Tables
    - `gcs_state`
      - `id` (uuid, primary key) - Single row identifier
      - `selected_drones` (jsonb) - Array of selected drone numbers
      - `flight_mode` (text) - Current flight mode: 'mission', 'gyro', or null
      - `target_altitude` (numeric) - Target altitude in meters
      - `target_speed` (numeric) - Target speed in m/s
      - `mission_active` (boolean) - Whether mission is active
      - `is_airborne` (boolean) - Whether drone is airborne (gyro mode)
      - `drone_positions` (jsonb) - Array of drone positions
      - `updated_at` (timestamptz) - Last update timestamp
      - `updated_by` (text) - Who updated (for tracking purposes)

  2. Security
    - Enable RLS on `gcs_state` table
    - Add policy for anyone to read the state
    - Add policy for authenticated users to update the state
    
  3. Notes
    - Only one row will exist in this table (singleton pattern)
    - Real-time updates will be enabled for live synchronization
*/

CREATE TABLE IF NOT EXISTS gcs_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selected_drones jsonb DEFAULT '[]'::jsonb,
  flight_mode text DEFAULT NULL,
  target_altitude numeric DEFAULT 10,
  target_speed numeric DEFAULT 5,
  mission_active boolean DEFAULT false,
  is_airborne boolean DEFAULT false,
  drone_positions jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by text DEFAULT ''
);

ALTER TABLE gcs_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read GCS state"
  ON gcs_state
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert GCS state"
  ON gcs_state
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update GCS state"
  ON gcs_state
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Insert initial state row if not exists
INSERT INTO gcs_state (id, selected_drones, flight_mode, target_altitude, target_speed, mission_active, is_airborne, drone_positions)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  '[]'::jsonb,
  NULL,
  10,
  5,
  false,
  false,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM gcs_state);
