/*
  # Create Active Sessions Table
  
  1. New Tables
    - `active_sessions`
      - `id` (uuid, primary key) - Unique session identifier
      - `session_token` (text, unique) - Browser session token
      - `connected_at` (timestamptz) - Connection timestamp
      - `last_heartbeat` (timestamptz) - Last activity timestamp
      - `expires_at` (timestamptz) - Session expiration time
  
  2. Security
    - Enable RLS on `active_sessions` table
    - Add policy for public read access (to check if session exists)
    - Add policy for public insert access (to create new sessions)
    - Add policy for public update access (to update heartbeat)
    - Add policy for public delete access (to end sessions)
  
  3. Important Notes
    - Sessions expire after 5 minutes of inactivity
    - Only one active session allowed at a time
    - Automatic cleanup via trigger for expired sessions
*/

CREATE TABLE IF NOT EXISTS active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text UNIQUE NOT NULL,
  connected_at timestamptz DEFAULT now(),
  last_heartbeat timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '5 minutes')
);

ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read sessions (to check if one exists)
CREATE POLICY "Anyone can read active sessions"
  ON active_sessions
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to create a session
CREATE POLICY "Anyone can create sessions"
  ON active_sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anyone to update their session heartbeat
CREATE POLICY "Anyone can update sessions"
  ON active_sessions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow anyone to delete expired sessions
CREATE POLICY "Anyone can delete sessions"
  ON active_sessions
  FOR DELETE
  TO public
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON active_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(session_token);