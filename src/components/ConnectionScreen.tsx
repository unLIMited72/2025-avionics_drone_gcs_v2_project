import { useState } from 'react';
import { Radio } from 'lucide-react';

interface ConnectionScreenProps {
  onConnect: (id: string, count: number) => void;
}

export default function ConnectionScreen({ onConnect }: ConnectionScreenProps) {
  const [droneId, setDroneId] = useState('');
  const [droneCount, setDroneCount] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (droneId.trim() && droneCount >= 1 && droneCount <= 4) {
      onConnect(droneId.trim(), droneCount);
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="droneId" className="block text-sm font-medium text-slate-300">
              Drone ID
            </label>
            <input
              id="droneId"
              type="text"
              value={droneId}
              onChange={(e) => setDroneId(e.target.value)}
              placeholder="Enter drone identifier"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="droneCount" className="block text-sm font-medium text-slate-300">
              Number of Drones
            </label>
            <select
              id="droneCount"
              value={droneCount}
              onChange={(e) => setDroneCount(parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="1">1 Drone</option>
              <option value="2">2 Drones</option>
              <option value="3">3 Drones</option>
              <option value="4">4 Drones</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!droneId.trim()}
            className="w-full px-6 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Connect & Spawn
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          v1.0.0
        </div>
      </div>
    </div>
  );
}
