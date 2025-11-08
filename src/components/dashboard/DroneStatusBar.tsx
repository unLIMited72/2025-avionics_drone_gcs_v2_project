import { Battery, Link, CheckCircle, XCircle, Shield, ShieldOff, AlertTriangle, AlertCircle } from 'lucide-react';

type FlightStatus = 'Normal' | 'Warning' | 'Danger';

interface DroneStatusBarProps {
  droneId: string;
  isConnected: boolean;
  isFlightReady: boolean;
  isArmed: boolean;
  flightStatus: FlightStatus;
  battery: number;
  isSelected: boolean;
  onSelect: () => void;
}

export default function DroneStatusBar({
  droneId,
  isConnected,
  isFlightReady,
  isArmed,
  flightStatus,
  battery,
  isSelected,
  onSelect,
}: DroneStatusBarProps) {
  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-emerald-500';
    if (level > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={`bg-slate-900 border rounded-lg p-3 transition-colors ${
      isSelected ? 'border-sky-500' : 'border-slate-800'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs font-medium">Drone</span>
          <span className="text-white text-sm font-bold">{droneId}</span>
        </div>

        <div className="flex items-center gap-3 flex-1">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Link className={`w-3 h-3 ${isConnected ? 'text-emerald-500' : 'text-red-500'}`} />
              <span className="text-xs text-slate-300">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Battery className={`w-3 h-3 ${getBatteryColor(battery)}`} />
              <span className="text-xs text-slate-300">
                <span className={getBatteryColor(battery)}>{battery}%</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              {isFlightReady ? (
                <CheckCircle className="w-3 h-3 text-emerald-500" />
              ) : (
                <XCircle className="w-3 h-3 text-slate-500" />
              )}
              <span className="text-xs text-slate-300">
                {isFlightReady ? 'Ready' : 'Not Ready'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isArmed ? (
                <Shield className="w-3 h-3 text-amber-500" />
              ) : (
                <ShieldOff className="w-3 h-3 text-slate-500" />
              )}
              <span className="text-xs text-slate-300">
                {isArmed ? 'Armed' : 'Disarmed'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {flightStatus === 'Normal' && (
                <>
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                  <span className="text-xs text-emerald-500 font-medium">Normal</span>
                </>
              )}
              {flightStatus === 'Warning' && (
                <>
                  <AlertTriangle className="w-3 h-3 text-yellow-500 animate-pulse" />
                  <span className="text-xs text-yellow-500 font-medium">Warning</span>
                </>
              )}
              {flightStatus === 'Danger' && (
                <>
                  <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />
                  <span className="text-xs text-red-500 font-medium">Danger</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onSelect}
          className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
            isSelected
              ? 'bg-sky-600 hover:bg-sky-700 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
        >
          {isSelected ? 'Selected' : 'Select'}
        </button>
      </div>
    </div>
  );
}
