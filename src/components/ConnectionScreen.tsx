import { useState, useEffect } from 'react';
import { Radio, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import wsManager from '../services/websocket';

interface ConnectionScreenProps {
  onConnect: (id: string, count: number) => void;
}

interface DroneStatus {
  droneNumber: number;
  status: 'active' | 'available' | 'unavailable';
  isConnected: boolean;
}

export default function ConnectionScreen({ onConnect }: ConnectionScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drones, setDrones] = useState<DroneStatus[]>([]);
  const [activeDroneCount, setActiveDroneCount] = useState(0);

  useEffect(() => {
    const initConnection = async () => {
      try {
        await wsManager.connect();
        setWsConnected(true);
        setError(null);

        await fetchDroneStatus();
      } catch (err) {
        console.error('[ConnectionScreen] WebSocket connection failed:', err);
        setError('Failed to connect to server');
        setWsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    initConnection();

    const unsubscribe = wsManager.onMessage((message) => {
      if (message.type === 'drone_status_response') {
        processDroneStatus(message.data);
      }
    });

    const intervalId = setInterval(() => {
      if (wsConnected) {
        fetchDroneStatus();
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [wsConnected]);

  const fetchDroneStatus = () => {
    const success = wsManager.send({
      type: 'get_drone_status',
      data: {},
    });

    if (!success) {
      console.error('[ConnectionScreen] Failed to fetch drone status');
    }
  };

  const processDroneStatus = (data: any) => {
    if (data.drones && Array.isArray(data.drones)) {
      const droneStatuses: DroneStatus[] = data.drones.map((drone: any, index: number) => ({
        droneNumber: index + 1,
        status: drone.active ? 'active' : 'available',
        isConnected: drone.connected || false,
      }));

      setDrones(droneStatuses);
      setActiveDroneCount(data.active_count || 0);
    } else if (data.count !== undefined) {
      const count = data.count || 0;
      const droneStatuses: DroneStatus[] = Array.from({ length: count }, (_, i) => ({
        droneNumber: i + 1,
        status: 'active',
        isConnected: true,
      }));

      setDrones(droneStatuses);
      setActiveDroneCount(count);
    }
  };

  const handleStart = () => {
    onConnect('gcs-1', activeDroneCount || 1);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-sky-500/20 rounded-full border-2 border-sky-500">
            <Radio className="w-10 h-10 text-sky-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Drone GCS</h1>
            <p className="text-slate-400">Ground Control Station</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 text-sky-400 animate-spin" />
            <p className="text-slate-400">Connecting to server...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800 border border-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Active Drones</h2>
                <div className="px-4 py-2 bg-sky-500/20 border border-sky-500 rounded-lg">
                  <span className="text-sky-400 font-bold text-lg">{activeDroneCount}</span>
                  <span className="text-slate-400 text-sm ml-2">active</span>
                </div>
              </div>

              {drones.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No drones detected</p>
                  <p className="text-slate-500 text-sm mt-1">Waiting for backend to spawn SITL drones...</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {drones.map((drone) => (
                    <div
                      key={drone.droneNumber}
                      className="flex items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          drone.status === 'active' ? 'bg-emerald-500' :
                          drone.status === 'available' ? 'bg-sky-500' :
                          'bg-slate-600'
                        }`}></div>
                        <span className="text-white font-medium">Drone {drone.droneNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {drone.status === 'active' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        <span className={`text-sm px-3 py-1 rounded-full ${
                          drone.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                          drone.status === 'available' ? 'bg-sky-500/20 text-sky-400' :
                          'bg-slate-700 text-slate-500'
                        }`}>
                          {drone.status.charAt(0).toUpperCase() + drone.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={!wsConnected || activeDroneCount === 0}
              className="w-full px-6 py-4 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold text-lg rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg shadow-sky-500/50 disabled:shadow-none"
            >
              Start Mission Control
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-slate-500">{wsConnected ? 'Server Connected' : 'Server Disconnected'}</span>
          </div>
          <span className="text-slate-500">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
