import { useState, useEffect, useCallback } from 'react';
import DroneStatusBar from './dashboard/DroneStatusBar';
import MissionMap from './dashboard/MissionMap';
import GyroControl from './dashboard/GyroControl';
import { rosConnection, DroneStatus, MissionStateEnum } from '../services/rosConnection';

export type MissionState = 'IDLE' | 'ACTIVE' | 'PAUSED' | 'EMERGENCY';

export default function DashboardScreen() {
  const [drones, setDrones] = useState<DroneStatus[]>([]);
  const [selectedDrones, setSelectedDrones] = useState<Set<string>>(new Set());
  const [flightMode, setFlightMode] = useState<'mission' | 'gyro' | null>(null);
  const [missionState, setMissionState] = useState<MissionState>('IDLE');
  const [currentMissionId, setCurrentMissionId] = useState<string>('');
  const [gyroActive, setGyroActive] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);

  useEffect(() => {
    const unsubscribeConnection = rosConnection.onConnectionChange((connected) => {
      setServerConnected(connected);
    });

    const unsubscribeStatus = rosConnection.onStatusUpdate((updatedDrones) => {
      setDrones(updatedDrones);

      setSelectedDrones(prev => {
        const currentIds = new Set(updatedDrones.map(d => d.id));
        const newSet = new Set<string>();

        prev.forEach(id => {
          if (currentIds.has(id)) {
            newSet.add(id);
          }
        });

        if (newSet.size === prev.size) {
          let same = true;
          prev.forEach(id => {
            if (!newSet.has(id)) same = false;
          });
          if (same) return prev;
        }

        return newSet;
      });
    });

    const unsubscribeMission = rosConnection.onMissionStatusUpdate((status) => {
      const stateMap: Record<number, MissionState> = {
        [MissionStateEnum.STATE_IDLE]: 'IDLE',
        [MissionStateEnum.STATE_ACTIVE]: 'ACTIVE',
        [MissionStateEnum.STATE_PAUSED]: 'PAUSED',
        [MissionStateEnum.STATE_EMERGENCY]: 'EMERGENCY',
        [MissionStateEnum.STATE_COMPLETED]: 'IDLE',
        [MissionStateEnum.STATE_ABORTED]: 'IDLE',
      };

      const newState = stateMap[status.state] || 'IDLE';
      setMissionState(newState);
      setCurrentMissionId(status.mission_id || '');

      if (newState !== 'IDLE' && gyroActive) {
        setGyroActive(false);
        if (flightMode === 'gyro') {
          setFlightMode(null);
        }
      }
    });

    return () => {
      unsubscribeConnection();
      unsubscribeStatus();
      unsubscribeMission();
    };
  }, [gyroActive, flightMode]);

  const handleSelectDrone = useCallback((droneId: string) => {
    if (gyroActive || missionState !== 'IDLE') {
      return;
    }

    setSelectedDrones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(droneId)) {
        newSet.delete(droneId);
      } else {
        newSet.add(droneId);
      }

      if (newSet.size !== 1 && flightMode === 'gyro') {
        setFlightMode(null);
        setGyroActive(false);
      }

      if (newSet.size === 0) {
        setFlightMode(null);
        setGyroActive(false);
      }

      return newSet;
    });
  }, [flightMode, gyroActive, missionState]);

  const handleDisconnectAll = useCallback(() => {
    rosConnection.disconnect();
  }, []);

  const selectionLocked = gyroActive || missionState !== 'IDLE';
  const canUseMission = selectedDrones.size >= 1 && !gyroActive;
  const canUseGyro = selectedDrones.size === 1 && missionState === 'IDLE';

  const selectedDroneId = selectedDrones.size === 1 ? Array.from(selectedDrones)[0] : '';

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="p-4 border-b border-slate-800">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">Drone GCS</h1>
            <p className="text-sm text-slate-400">
              Ground Control Station
              {gyroActive && selectedDroneId && (
                <span className="ml-2 text-xs text-sky-400">
                  (Gyro Control: {selectedDroneId})
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Server</span>
            <div className={`w-3 h-3 rounded-full ${
              serverConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
            }`}></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {drones.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Waiting for drone data...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {drones.map((drone) => (
              <DroneStatusBar
                key={drone.id}
                droneId={drone.id}
                isConnected={drone.connected}
                isFlightReady={drone.ready}
                isArmed={drone.armed}
                flightStatus={drone.status}
                battery={drone.battery}
                isSelected={selectedDrones.has(drone.id)}
                onSelect={() => handleSelectDrone(drone.id)}
                selectDisabled={selectionLocked}
              />
            ))}
          </div>
        )}

        <div className="mt-6 p-3 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-white font-semibold text-sm mb-3">Flight Control Mode</h3>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (canUseMission) {
                  setFlightMode(flightMode === 'mission' ? null : 'mission');
                }
              }}
              disabled={!canUseMission}
              className={`flex-1 px-4 py-2 text-sm rounded-lg font-semibold transition-all ${
                flightMode === 'mission'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/50'
                  : canUseMission
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title={
                gyroActive
                  ? 'Gyro control is active. Disable it first.'
                  : !canUseMission
                  ? 'Select at least 1 drone to use Mission Flight'
                  : ''
              }
            >
              Mission Flight
            </button>

            <button
              onClick={() => {
                if (canUseGyro) {
                  const next = flightMode === 'gyro' ? null : 'gyro';
                  setFlightMode(next);
                  if (next === null) {
                    setGyroActive(false);
                  }
                }
              }}
              disabled={!canUseGyro}
              className={`flex-1 px-4 py-2 text-sm rounded-lg font-semibold transition-all ${
                flightMode === 'gyro'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/50'
                  : canUseGyro
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title={
                missionState !== 'IDLE'
                  ? 'Gyro Flight is only available when mission is IDLE.'
                  : selectedDrones.size !== 1
                  ? 'Select exactly 1 drone to use Gyro Flight'
                  : ''
              }
            >
              Gyro Flight
            </button>
          </div>

          {flightMode === 'mission' && canUseMission && (
            <div className="mt-4">
              <MissionMap
                drones={drones}
                selectedIds={selectedDrones}
                missionState={missionState}
                currentMissionId={currentMissionId}
              />
            </div>
          )}

          {flightMode === 'gyro' && canUseGyro && selectedDroneId && (
            <div className="mt-4">
              <GyroControl
                droneId={selectedDroneId}
                missionState={missionState}
                onActiveChange={(active) => {
                  setGyroActive(active);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
