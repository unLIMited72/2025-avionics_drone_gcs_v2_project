import { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, PlaneTakeoff, PlaneLanding } from 'lucide-react';
import { rosConnection } from '../../services/rosConnection';
import type { MissionState } from '../DashboardScreen';

interface DroneControl {
  roll: number;
  pitch: number;
  yaw: number;
}

interface GyroControlProps {
  droneId: string;
  missionState: MissionState;
  onActiveChange?: (active: boolean) => void;
}

const mapTiltToLevel = (deg: number): number => {
  const a = Math.abs(deg);
  if (a < 5) return 0;
  if (a < 15) return deg > 0 ? 1 : -1;
  return deg > 0 ? 2 : -2;
};

const speedForLevel = (level: number): number => {
  switch (level) {
    case -2: return -2.0;
    case -1: return -1.0;
    case 1: return 1.0;
    case 2: return 2.0;
    default: return 0.0;
  }
};

export default function GyroControl({
  droneId,
  missionState,
  onActiveChange,
}: GyroControlProps) {
  const [droneControl, setDroneControl] = useState<DroneControl>({ roll: 0, pitch: 0, yaw: 0 });
  const [manualYaw, setManualYaw] = useState<number>(0);
  const [isSupported, setIsSupported] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [isHoldMode, setIsHoldMode] = useState(false);
  const [targetAlt, setTargetAlt] = useState<number>(10);
  const [isActive, setIsActive] = useState(false);
  const initialOrientation = useRef<{ alpha: number; beta: number; gamma: number } | null>(null);
  const lastSendRef = useRef<number>(0);

  useEffect(() => {
    if (missionState !== 'IDLE' && isActive) {
      setIsActive(false);
      onActiveChange?.(false);
      sendGyroDisable();
    }
  }, [missionState, isActive]);

  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setIsSupported(false);
      return;
    }

    if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
      setHasPermission(true);
    }
  }, []);

  useEffect(() => {
    if (!window.DeviceOrientationEvent || !hasPermission) {
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const alpha = event.alpha ?? 0;
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;

      if (!initialOrientation.current) {
        initialOrientation.current = { alpha, beta, gamma };
      }

      if (isHoldMode) {
        const state = { roll: 0, pitch: 0, yaw: manualYaw };
        setDroneControl(state);
        if (isActive) {
          throttledSendControl(state);
        }
      } else {
        const relRoll = gamma - initialOrientation.current.gamma;
        const relPitch = (beta - 90) - (initialOrientation.current.beta - 90);
        const state = { roll: relRoll, pitch: relPitch, yaw: manualYaw };
        setDroneControl(state);
        if (isActive) {
          throttledSendControl(state);
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [hasPermission, manualYaw, isHoldMode, isActive]);

  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setHasPermission(true);
        }
      } catch (error) {
        console.error('Permission request failed:', error);
        setIsSupported(false);
      }
    } else {
      setHasPermission(true);
    }
  };

  const throttledSendControl = (state: DroneControl) => {
    const now = Date.now();
    if (now - lastSendRef.current < 80) return;
    lastSendRef.current = now;

    const rollLevel = mapTiltToLevel(state.roll);
    const pitchLevel = mapTiltToLevel(state.pitch);

    const vx = speedForLevel(-pitchLevel);
    const vy = speedForLevel(rollLevel);

    rosConnection.sendGyroCommand({
      drone_id: droneId,
      command: 'CONTROL',
      yaw_deg: state.yaw,
      vx_mps: vx,
      vy_mps: vy,
    });
  };

  const handleYawChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newYaw = parseFloat(e.target.value);
    setManualYaw(newYaw);
    setDroneControl(prev => {
      const next = { ...prev, yaw: newYaw };
      if (isActive) {
        throttledSendControl(next);
      }
      return next;
    });
  }, [isActive, droneId]);

  const handleTakeoff = () => {
    if (missionState !== 'IDLE') {
      alert('Mission is not IDLE. Gyro takeoff is blocked.');
      return;
    }
    if (!droneId) {
      alert('No drone selected.');
      return;
    }
    if (targetAlt <= 0) {
      alert('Target altitude must be > 0.');
      return;
    }

    rosConnection.sendGyroCommand({
      drone_id: droneId,
      command: 'TAKEOFF',
      target_altitude_m: targetAlt,
    });

    setIsActive(true);
    onActiveChange?.(true);
  };

  const handleLand = () => {
    if (!droneId) return;

    rosConnection.sendGyroCommand({
      drone_id: droneId,
      command: 'LAND',
    });

    setIsActive(false);
    onActiveChange?.(false);
  };

  const sendGyroDisable = () => {
    if (!droneId) return;
    rosConnection.sendGyroCommand({
      drone_id: droneId,
      command: 'CONTROL',
      vx_mps: 0,
      vy_mps: 0,
      yaw_deg: manualYaw,
    });
  };

  const toggleHold = () => {
    const next = !isHoldMode;
    setIsHoldMode(next);
    if (next && isActive) {
      rosConnection.sendGyroCommand({
        drone_id: droneId,
        command: 'CONTROL',
        vx_mps: 0,
        vy_mps: 0,
        yaw_deg: manualYaw,
      });
    }
  };

  if (!isSupported) {
    return (
      <div className="p-6 bg-slate-900 rounded-lg border border-slate-700 text-center">
        <Smartphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">
          Device orientation is not supported on this device
        </p>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="p-6 bg-slate-900 rounded-lg border border-slate-700 text-center">
        <Smartphone className="w-12 h-12 text-sky-500 mx-auto mb-3" />
        <p className="text-slate-300 text-sm mb-4">
          Enable device orientation to control the drone using gyro
        </p>
        <button
          onClick={requestPermission}
          className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Enable Gyro
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-slate-300 font-medium">
          Gyro Control &nbsp;
          <span className="text-xs text-slate-500">(Drone: {droneId})</span>
        </h4>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleHold}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
              isHoldMode
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {isHoldMode ? 'Hold Active' : 'Hold'}
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
            }`}></div>
            <span className="text-xs text-slate-400">
              {isActive ? 'Gyro Linked' : 'Standby'}
            </span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-72 bg-slate-900 rounded-lg border-2 border-slate-700 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative flex items-center justify-center"
            style={{
              transform: `perspective(600px) rotateZ(${droneControl.yaw}deg) rotateX(${-droneControl.pitch}deg) rotateY(${droneControl.roll}deg)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <svg
              width="192"
              height="192"
              viewBox="0 0 128 128"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#0ea5e9', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#0284c7', stopOpacity: 1 }} />
                </linearGradient>
                <filter id="shadow">
                  <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.5" />
                </filter>
              </defs>
              <path
                d="M64 10 L90 100 L64 85 L38 100 Z"
                fill="url(#arrowGradient)"
                stroke="#0c4a6e"
                strokeWidth="3"
                strokeLinejoin="round"
                filter="url(#shadow)"
              />
              <path
                d="M64 10 L76 50 L64 60 L52 50 Z"
                fill="#38bdf8"
                opacity="0.6"
              />
            </svg>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 p-3 bg-slate-800/80 rounded backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-sky-400">{manualYaw.toFixed(1)}°</span>
            <span className="text-xs text-slate-500">
              Tilt → XY movement, Slider → Yaw
            </span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={manualYaw}
            onChange={handleYawChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((manualYaw + 180) / 360) * 100}%, #334155 ${((manualYaw + 180) / 360) * 100}%, #334155 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>-180°</span>
            <span>0°</span>
            <span>180°</span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-900 rounded-lg border border-slate-700 flex flex-col gap-3">
        {!isActive && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex-1">
              <label className="block text-slate-400 mb-1">
                Target Altitude (m)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={targetAlt}
                onChange={(e) => setTargetAlt(Number(e.target.value))}
                disabled={missionState !== 'IDLE'}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )}

        {!isActive ? (
          <button
            onClick={handleTakeoff}
            disabled={missionState !== 'IDLE'}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-150 ${
              missionState === 'IDLE'
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <PlaneTakeoff className="w-5 h-5" />
            Takeoff
          </button>
        ) : (
          <button
            onClick={handleLand}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-150 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40 active:scale-95"
          >
            <PlaneLanding className="w-5 h-5" />
            Land
          </button>
        )}

        <p className="text-[10px] text-slate-500">
          Gyro Flight is available only for single drone when mission is IDLE.
          Tilt is quantized and converted to velocity commands.
        </p>
      </div>
    </div>
  );
}
