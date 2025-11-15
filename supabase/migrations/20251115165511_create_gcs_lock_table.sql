/*
  # Create GCS Lock Table

  1. New Tables
    - `gcs_lock`
      - `id` (text, primary key) - Always 'gcs_main' for single lock instance
      - `owner_id` (text, nullable) - Client ID that currently holds the lock
      - `updated_at` (timestamptz) - Last heartbeat timestamp for timeout detection
      - `created_at` (timestamptz) - Record creation timestamp
  
  2. Security
    - Enable RLS on `gcs_lock` table
    - Add policy for public read/write access (since this is for lock management)
  
  3. Initial Data
    - Insert single lock record with id 'gcs_main'
  
  4. Notes
    - Lock timeout is 60 seconds (enforced in application logic)
    - Only one record should ever exist (id = 'gcs_main')
    - owner_id = null means lock is available
*/

CREATE TABLE IF NOT EXISTS gcs_lock (
  id text PRIMARY KEY,
  owner_id text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gcs_lock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to gcs_lock"
  ON gcs_lock
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to gcs_lock"
  ON gcs_lock
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to gcs_lock"
  ON gcs_lock
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from gcs_lock"
  ON gcs_lock
  FOR DELETE
  TO public
  USING (true);

INSERT INTO gcs_lock (id, owner_id, updated_at)
VALUES ('gcs_main', NULL, now())
ON CONFLICT (id) DO NOTHING;