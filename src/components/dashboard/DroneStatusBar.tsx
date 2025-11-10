import { memo } from 'react';
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
  selectDisabled?: boolean;
}

const getBatteryColor = (level: number) => {
  if (level > 50) return 'text-emerald-500';
  if (level > 20) return 'text-yellow-500';
  return 'text-red-500';
};

function DroneStatusBar({
  droneId,
  isConnected,
  isFlightReady,
  isArmed,
  flightStatus,
  battery,
  isSelected,
  onSelect,
  selectDisabled = false,
}: DroneStatusBarProps) {

  return (
    <div className={`bg-slate-900 border rounded-lg p-2 transition-colors ${
      isSelected ? 'border-sky-500' : 'border-slate-800'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[10px] font-medium">Drone</span>
          <span className="text-white text-xs font-bold">{droneId}</span>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <Link className={`w-2.5 h-2.5 ${isConnected ? 'text-emerald-500' : 'text-red-500'}`} />
              <span className="text-[10px] text-slate-300">
                {isConnected ? 'Conn' : 'Disc'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Battery className={`w-2.5 h-2.5 ${getBatteryColor(battery)}`} />
              <span className="text-[10px] text-slate-300">
                <span className={getBatteryColor(battery)}>{battery.toFixed(1)}%</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              {isFlightReady ? (
                <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
              ) : (
                <XCircle className="w-2.5 h-2.5 text-slate-500" />
              )}
              <span className="text-[10px] text-slate-300">
                {isFlightReady ? 'Rdy' : 'NotRdy'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isArmed ? (
                <Shield className="w-2.5 h-2.5 text-amber-500" />
              ) : (
                <ShieldOff className="w-2.5 h-2.5 text-slate-500" />
              )}
              <span className="text-[10px] text-slate-300">
                {isArmed ? 'Arm' : 'Disarm'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {flightStatus === 'Normal' ? (
                <>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-[10px] text-emerald-500 font-medium">Normal</span>
                </>
              ) : flightStatus === 'Warning' ? (
                <>
                  <AlertTriangle className="w-2.5 h-2.5 text-yellow-500 animate-pulse" />
                  <span className="text-[10px] text-yellow-500 font-medium">Warning</span>
                </>
              ) : flightStatus === 'Danger' ? (
                <>
                  <AlertCircle className="w-2.5 h-2.5 text-red-500 animate-pulse" />
                  <span className="text-[10px] text-red-500 font-medium">Danger</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                  <span className="text-[10px] text-slate-500 font-medium">Unknown ({flightStatus})</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={selectDisabled ? undefined : onSelect}
          disabled={selectDisabled}
          className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
            selectDisabled
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : isSelected
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

export default memo(DroneStatusBar);
