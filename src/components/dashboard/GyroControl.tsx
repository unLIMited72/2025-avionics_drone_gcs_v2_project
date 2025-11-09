import { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone } from 'lucide-react';

interface DroneControl {
  roll: number;
  pitch: number;
  yaw: number;
}

export default function GyroControl() {
  const [droneControl, setDroneControl] = useState<DroneControl>({ roll: 0, pitch: 0, yaw: 0 });
  const [manualYaw, setManualYaw] = useState<number>(0);
  const [isSupported, setIsSupported] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [isHoldMode, setIsHoldMode] = useState(false);
  const initialOrientation = useRef<{ alpha: number; beta: number; gamma: number } | null>(null);

  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setIsSupported(false);
      return;
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const alpha = event.alpha || 0;
      const beta = event.beta || 0;
      const gamma = event.gamma || 0;

      if (!initialOrientation.current) {
        initialOrientation.current = { alpha, beta, gamma };
      }

      if (isHoldMode) {
        setDroneControl({ roll: 0, pitch: 0, yaw: manualYaw });
      } else {
        const roll = gamma - initialOrientation.current.gamma;
        const pitch = (beta - 90) - (initialOrientation.current.beta - 90);
        setDroneControl({ roll, pitch, yaw: manualYaw });
      }
    };

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            setHasPermission(true);
            window.addEventListener('deviceorientation', handleOrientation);
          }
        })
        .catch(() => {
          setIsSupported(false);
        });
    } else {
      setHasPermission(true);
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [manualYaw, isHoldMode]);

  const handleYawChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newYaw = parseFloat(e.target.value);
    setManualYaw(newYaw);
    setDroneControl(prev => ({ ...prev, yaw: newYaw }));
  }, []);

  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setHasPermission(true);
        }
      } catch (error) {
        console.error('Permission request failed:', error);
      }
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
        <h4 className="text-slate-300 font-medium">Gyro Control</h4>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsHoldMode(!isHoldMode)}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
              isHoldMode
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {isHoldMode ? 'Hold Active' : 'Hold'}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-400">Active</span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-96 bg-slate-900 rounded-lg border-2 border-slate-700 overflow-hidden">
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
    </div>
  );
}
