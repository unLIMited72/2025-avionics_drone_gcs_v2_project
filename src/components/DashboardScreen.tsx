import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import DroneStatusBar from './dashboard/DroneStatusBar';
import MissionMap from './dashboard/MissionMap';
import GyroControl from './dashboard/GyroControl';
import { rosConnection, DroneStatus, MissionStateEnum } from '../services/rosConnection';

export type MissionState = 'IDLE' | 'ACTIVE' | 'PAUSED' | 'EMERGENCY';

interface DashboardScreenProps {
  onDisconnect: () => void;
}

export default function DashboardScreen({ onDisconnect }: DashboardScreenProps) {
  const [drones, setDrones] = useState<DroneStatus[]>([]);
  const [selectedDrones, setSelectedDrones] = useState<Set<string>>(new Set());
  const [flightMode, setFlightMode] = useState<'mission' | 'gyro' | null>(null);
  const [missionState, setMissionState] = useState<MissionState>('IDLE');
  const [currentMissionId, setCurrentMissionId] = useState<string>('');

  useEffect(() => {
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
      setCurrentMissionId(status.mission_id);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeMission();
    };
  }, []);


  const handleSelectDrone = useCallback((droneId: string) => {
    setSelectedDrones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(droneId)) {
        newSet.delete(droneId);
      } else {
        newSet.add(droneId);
      }

      if (newSet.size === 0) {
        setFlightMode(null);
      } else if (newSet.size > 1 && flightMode === 'gyro') {
        setFlightMode(null);
      }

      return newSet;
    });
  }, [flightMode]);

  const handleDisconnectAll = useCallback(() => {
    rosConnection.disconnect();
    onDisconnect();
  }, [onDisconnect]);

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
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Server</span>
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>

            <button
              onClick={handleDisconnectAll}
              className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              title="Disconnect"
            >
              <X className="w-5 h-5 text-white" />
            </button>
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
              />
            ))}
          </div>
        )}


        <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-white font-semibold mb-3">Flight Control Mode</h3>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (canUseMission) {
                  setFlightMode(flightMode === 'mission' ? null : 'mission');
                }
              }}
              disabled={!canUseMission}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                flightMode === 'mission'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/50'
                  : canUseMission
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title={!canUseMission ? 'Select at least 1 drone to use Mission Flight' : ''}
            >
              Mission Flight
            </button>
            <button
              onClick={() => {
                if (canUseGyro) {
                  setFlightMode(flightMode === 'gyro' ? null : 'gyro');
                }
              }}
              disabled={!canUseGyro}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                flightMode === 'gyro'
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/50'
                  : canUseGyro
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title={!canUseGyro ? 'Select exactly 1 drone to use Gyro Flight' : ''}
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

          {flightMode === 'gyro' && canUseGyro && (
            <div className="mt-4">
              <GyroControl key={Array.from(selectedDrones)[0]} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
