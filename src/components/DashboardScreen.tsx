import { useState, useEffect, useMemo } from 'react';
import { X, Eye, Shield } from 'lucide-react';
import DroneStatusBar from './dashboard/DroneStatusBar';
import MissionMap from './dashboard/MissionMap';
import GyroControl from './dashboard/GyroControl';
import { getGCSState, updateGCSState, subscribeToGCSState, type GCSState } from '../lib/supabase';

interface DashboardScreenProps {
  droneCount: number;
  isAdmin: boolean;
  onDisconnect: () => void;
}

interface DronePosition {
  droneNumber: number;
  lat: number;
  lng: number;
  heading: number;
}

export default function DashboardScreen({ droneCount, isAdmin, onDisconnect }: DashboardScreenProps) {
  const [selectedDrones, setSelectedDrones] = useState<Set<number>>(new Set());
  const [flightMode, setFlightMode] = useState<'mission' | 'gyro' | null>(null);
  const [targetAltitude, setTargetAltitude] = useState<number>(10);
  const [targetSpeed, setTargetSpeed] = useState<number>(5);
  const [missionActive, setMissionActive] = useState(false);
  const [isAirborne, setIsAirborne] = useState(false);
  const [dronePositions, setDronePositions] = useState<DronePosition[]>([]);

  const drones = useMemo(() =>
    Array.from({ length: droneCount }, (_, index) => {
      const statuses: Array<'normal' | 'warning' | 'danger'> = ['normal', 'warning', 'danger'];
      return {
        droneNumber: index + 1,
        isConnected: true,
        isFlightReady: index % 2 === 0,
        isArmed: false,
        flightStatus: statuses[index % 3] as 'normal' | 'warning' | 'danger',
        battery: 85 - index * 10,
        altitude: 0,
        speed: 0,
      };
    }),
    [droneCount]
  );

  useEffect(() => {
    const loadInitialState = async () => {
      const state = await getGCSState();
      if (state) {
        setSelectedDrones(new Set(state.selected_drones));
        setFlightMode(state.flight_mode);
        setTargetAltitude(state.target_altitude);
        setTargetSpeed(state.target_speed);
        setMissionActive(state.mission_active);
        setIsAirborne(state.is_airborne);
        if (state.drone_positions.length > 0) {
          setDronePositions(state.drone_positions);
        }
      }
    };

    loadInitialState();

    if (!isAdmin) {
      const unsubscribe = subscribeToGCSState((state) => {
        setSelectedDrones(new Set(state.selected_drones));
        setFlightMode(state.flight_mode);
        setTargetAltitude(state.target_altitude);
        setTargetSpeed(state.target_speed);
        setMissionActive(state.mission_active);
        setIsAirborne(state.is_airborne);
        if (state.drone_positions.length > 0) {
          setDronePositions(state.drone_positions);
        }
      });

      return unsubscribe;
    }
  }, [isAdmin]);

  useEffect(() => {
    const initialPositions: DronePosition[] = Array.from({ length: droneCount }, (_, index) => ({
      droneNumber: index + 1,
      lat: 37.5665 + (Math.random() - 0.5) * 0.01,
      lng: 126.9780 + (Math.random() - 0.5) * 0.01,
      heading: Math.random() * 360,
    }));

    if (dronePositions.length === 0) {
      setDronePositions(initialPositions);
    }

    if (!isAdmin) return;

    const interval = setInterval(() => {
      setDronePositions(prev =>
        prev.map(pos => ({
          ...pos,
          lat: pos.lat + (Math.random() - 0.5) * 0.0001,
          lng: pos.lng + (Math.random() - 0.5) * 0.0001,
          heading: (pos.heading + (Math.random() - 0.5) * 10) % 360,
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [droneCount, isAdmin, dronePositions.length]);

  useEffect(() => {
    if (isAdmin) {
      updateGCSState({
        selected_drones: Array.from(selectedDrones),
        flight_mode: flightMode,
        target_altitude: targetAltitude,
        target_speed: targetSpeed,
        mission_active: missionActive,
        is_airborne: isAirborne,
        drone_positions: dronePositions
      }, 'admin');
    }
  }, [isAdmin, selectedDrones, flightMode, targetAltitude, targetSpeed, missionActive, isAirborne, dronePositions]);

  const handleSelectDrone = (droneNumber: number) => {
    if (!isAdmin) return;
    setSelectedDrones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(droneNumber)) {
        newSet.delete(droneNumber);
      } else {
        newSet.add(droneNumber);
      }

      if (newSet.size === 0) {
        setFlightMode(null);
      } else if (newSet.size > 1 && flightMode === 'gyro') {
        setFlightMode(null);
      }

      return newSet;
    });
  };

  const canUseMission = selectedDrones.size >= 1;
  const canUseGyro = selectedDrones.size === 1;

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="p-4 border-b border-slate-800">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">Drone GCS</h1>
            <p className="text-sm text-slate-400">Ground Control Station</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg">
              {isAdmin ? (
                <>
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">ADMIN</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold text-sky-400">OBSERVER</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Server</span>
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>

            <button
              onClick={onDisconnect}
              className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              title="Disconnect"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-sky-500/10 border-b border-sky-500/30 px-4 py-2">
          <p className="text-sky-400 text-sm text-center">
            You are in observer mode. All controls are disabled. You can view the admin's actions in real-time.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {drones.map((drone) => (
            <DroneStatusBar
              key={drone.droneNumber}
              droneNumber={drone.droneNumber}
              isConnected={drone.isConnected}
              isFlightReady={drone.isFlightReady}
              isArmed={drone.isArmed}
              flightStatus={drone.flightStatus}
              battery={drone.battery}
              altitude={drone.altitude}
              speed={drone.speed}
              isSelected={selectedDrones.has(drone.droneNumber)}
              onSelect={() => handleSelectDrone(drone.droneNumber)}
            />
          ))}
        </div>


        <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-white font-semibold mb-3">Flight Control Mode</h3>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (canUseMission && isAdmin) {
                  setFlightMode(flightMode === 'mission' ? null : 'mission');
                }
              }}
              disabled={!canUseMission || !isAdmin}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                flightMode === 'mission'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/50'
                  : canUseMission && isAdmin
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title={!isAdmin ? 'Admin only' : !canUseMission ? 'Select at least 1 drone to use Mission Flight' : ''}
            >
              Mission Flight
            </button>
            <button
              onClick={() => {
                if (canUseGyro && isAdmin) {
                  setFlightMode(flightMode === 'gyro' ? null : 'gyro');
                }
              }}
              disabled={!canUseGyro || !isAdmin}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                flightMode === 'gyro'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/50'
                  : canUseGyro && isAdmin
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title={!isAdmin ? 'Admin only' : !canUseGyro ? 'Select exactly 1 drone to use Gyro Flight' : ''}
            >
              Gyro Flight
            </button>
          </div>

          {flightMode === 'mission' && canUseMission && (
            <div className="mt-4">
              <MissionMap dronePositions={dronePositions} />
            </div>
          )}

          {flightMode === 'gyro' && canUseGyro && (
            <div className="mt-4">
              <GyroControl key={Array.from(selectedDrones)[0]} />
            </div>
          )}
        </div>

        {flightMode === 'mission' && canUseMission && (
          <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <h3 className="text-white font-semibold mb-3">Flight Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Target Altitude (m)</label>
                <input
                  type="text"
                  value={targetAltitude}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || !isNaN(Number(val))) {
                      setTargetAltitude(val === '' ? 0 : Number(val));
                    }
                  }}
                  disabled={!isAdmin}
                  placeholder="0"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Target Speed (m/s)</label>
                <input
                  type="text"
                  value={targetSpeed}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || !isNaN(Number(val))) {
                      setTargetSpeed(val === '' ? 0 : Number(val));
                    }
                  }}
                  disabled={!isAdmin}
                  placeholder="0"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {flightMode === 'gyro' && canUseGyro && (
          <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <h3 className="text-white font-semibold mb-3">Flight Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Target Altitude (m)</label>
                <input
                  type="text"
                  value={targetAltitude}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || !isNaN(Number(val))) {
                      setTargetAltitude(val === '' ? 0 : Number(val));
                    }
                  }}
                  disabled={!isAdmin}
                  placeholder="0"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Max Speed (m/s)</label>
                <input
                  type="text"
                  value={targetSpeed}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || !isNaN(Number(val))) {
                      setTargetSpeed(val === '' ? 0 : Number(val));
                    }
                  }}
                  disabled={!isAdmin}
                  placeholder="0"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-white font-semibold mb-3">Flight Commands</h3>

          {flightMode === 'mission' && canUseMission && (
            <div className="flex gap-3">
              <button
                disabled={selectedDrones.size === 0 || !isAdmin}
                onClick={() => setMissionActive(!missionActive)}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all transform active:scale-95 ${
                  selectedDrones.size > 0 && isAdmin
                    ? missionActive
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/50 hover:scale-105'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/50 hover:scale-105'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {missionActive ? 'Stop Mission' : 'Start Mission'}
              </button>
              <button
                disabled={selectedDrones.size === 0 || !isAdmin}
                onClick={() => {
                  setMissionActive(false);
                }}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all transform active:scale-95 ${
                  selectedDrones.size > 0 && isAdmin
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/50 hover:scale-105'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                Emergency Return
              </button>
            </div>
          )}

          {flightMode === 'gyro' && canUseGyro && (
            <button
              disabled={selectedDrones.size === 0 || !isAdmin}
              onClick={() => setIsAirborne(!isAirborne)}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-all transform active:scale-95 ${
                selectedDrones.size > 0 && isAdmin
                  ? isAirborne
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/50 hover:scale-105'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/50 hover:scale-105'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isAirborne ? 'Land' : 'Takeoff'}
            </button>
          )}

          {!flightMode && selectedDrones.size > 0 && (
            <div className="text-center text-slate-400 py-3">
              Select a flight mode to see available commands
            </div>
          )}

          {selectedDrones.size === 0 && (
            <div className="text-center text-slate-400 py-3">
              Select at least one drone to enable commands
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
