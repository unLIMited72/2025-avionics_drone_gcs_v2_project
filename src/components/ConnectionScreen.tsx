import { useState, useEffect } from 'react';
import { Radio, Wifi, WifiOff } from 'lucide-react';
import { rosConnection } from '../services/rosConnection';

interface ConnectionScreenProps {
  onConnect: (password: string, availableDrones: number) => void;
}

const ROS_BRIDGE_URL = 'wss://px4gcsserver.ngrok.app:9090';

export default function ConnectionScreen({ onConnect }: ConnectionScreenProps) {
  const [password, setPassword] = useState('');
  const [serverConnected, setServerConnected] = useState(false);
  const [availableDrones, setAvailableDrones] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    setIsConnecting(true);

    const unsubscribeConnection = rosConnection.onConnectionChange((connected) => {
      setServerConnected(connected);
      setIsConnecting(false);
      if (!connected) {
        setAvailableDrones(0);
      }
    });

    const unsubscribeStatus = rosConnection.onStatusUpdate((drones) => {
      setAvailableDrones(drones.length);
    });

    rosConnection.connect(ROS_BRIDGE_URL);

    return () => {
      unsubscribeConnection();
      unsubscribeStatus();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() && serverConnected) {
      onConnect(password, availableDrones);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-sky-500/20 rounded-full border-2 border-sky-500">
            <Radio className="w-10 h-10 text-sky-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Drone GCS</h1>
            <p className="text-slate-400">Ground Control Station</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3">
              {isConnecting ? (
                <div className="w-5 h-5 border-2 border-slate-400 border-t-sky-500 rounded-full animate-spin" />
              ) : serverConnected ? (
                <Wifi className="w-5 h-5 text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-400" />
              )}
              <span className="text-sm font-medium text-slate-300">Server Status</span>
            </div>
            <span className={`text-sm font-semibold ${
              isConnecting ? 'text-slate-400' : serverConnected ? 'text-green-400' : 'text-red-400'
            }`}>
              {isConnecting ? 'Connecting...' : serverConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-sky-400" />
              <span className="text-sm font-medium text-slate-300">Available Drones</span>
            </div>
            <span className="text-sm font-semibold text-sky-400">
              {isConnecting ? '-' : `${availableDrones} Units`}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              disabled={!serverConnected}
            />
          </div>

          <button
            type="submit"
            disabled={!password.trim() || !serverConnected}
            className="w-full px-6 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Connect
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          v1.0.0
        </div>
      </div>
    </div>
  );
}
