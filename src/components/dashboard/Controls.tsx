import { Shield, ShieldOff } from 'lucide-react';

interface ControlsProps {
  isArmed: boolean;
  onArmToggle: () => void;
  altitude: number;
  speed: number;
  onAltitudeChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
}

export default function Controls({
  isArmed,
  onArmToggle,
  altitude,
  speed,
  onAltitudeChange,
  onSpeedChange,
}: ControlsProps) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <h3 className="text-slate-300 text-sm font-semibold mb-3">Controls</h3>

      <div className="space-y-4">
        <button
          onClick={onArmToggle}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
            isArmed
              ? 'bg-red-600 hover:bg-red-700 border-2 border-red-500'
              : 'bg-emerald-600 hover:bg-emerald-700 border-2 border-emerald-500'
          }`}
        >
          {isArmed ? (
            <>
              <ShieldOff className="w-5 h-5" />
              <span>DISARM</span>
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              <span>ARM</span>
            </>
          )}
        </button>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300 text-sm">Altitude Limit</label>
              <span className="text-sky-400 font-mono text-sm font-semibold">{altitude.toFixed(0)}m</span>
            </div>
            <input
              type="range"
              min="0"
              max="120"
              step="5"
              value={altitude}
              onChange={(e) => onAltitudeChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0m</span>
              <span>120m</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-300 text-sm">Speed Limit</label>
              <span className="text-sky-400 font-mono text-sm font-semibold">{speed.toFixed(0)}m/s</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0m/s</span>
              <span>20m/s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
