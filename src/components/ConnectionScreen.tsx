import { useState, useEffect, useRef } from 'react';
import { Radio, Wifi, WifiOff, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { rosConnection } from '../services/rosConnection';
import { GcsLockService, LockState } from '../services/gcsLockService';

interface ConnectionScreenProps {
  onConnect: () => void;
  onLockServiceReady: (service: GcsLockService) => void;
}

const ROS_BRIDGE_URL = 'wss://px4gcsserver.ngrok.app';

function generateClientId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export default function ConnectionScreen({ onConnect, onLockServiceReady }: ConnectionScreenProps) {
  const [serverConnected, setServerConnected] = useState(false);
  const [availableDrones, setAvailableDrones] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const [lockState, setLockState] = useState<LockState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const clientIdRef = useRef<string>(generateClientId());
  const lockServiceRef = useRef<GcsLockService | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    lockServiceRef.current = new GcsLockService(clientIdRef.current);
    onLockServiceReady(lockServiceRef.current);

    lockServiceRef.current.setOnLockLost(() => {
      setLockState('lost');
      rosConnection.disconnect();
    });

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

    const handleBeforeUnload = () => {
      if (lockServiceRef.current && lockState === 'acquired') {
        lockServiceRef.current.releaseLock();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribeConnection();
      unsubscribeStatus();
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (lockServiceRef.current) {
        lockServiceRef.current.cleanup();
        if (lockState === 'acquired') {
          lockServiceRef.current.releaseLock();
        }
      }
    };
  }, []);

  const handleAcquireLock = async () => {
    if (!lockServiceRef.current) return;

    setLockState('requesting');
    setErrorMessage('');

    const result = await lockServiceRef.current.acquireLock();

    if (result.ok) {
      setLockState('acquired');
      lockServiceRef.current.startHeartbeat();
      onConnect();
    } else {
      setLockState('denied');
      setErrorMessage(result.message || '락 획득에 실패했습니다.');
    }
  };

  const handleRetry = () => {
    setLockState('idle');
    setErrorMessage('');
  };

  const handleReconnect = () => {
    setLockState('idle');
    setErrorMessage('');
  };

  if (lockState === 'requesting') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-950">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-sky-500/20 rounded-full border-2 border-sky-500">
            <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">접속 중입니다...</h2>
            <p className="text-slate-400">GCS 락을 확인하는 중입니다.</p>
          </div>
        </div>
      </div>
    );
  }

  if (lockState === 'denied') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500/20 rounded-full border-2 border-orange-500">
              <Lock className="w-10 h-10 text-orange-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">접속이 제한되었습니다</h2>
              <p className="text-slate-400">{errorMessage}</p>
              <p className="text-sm text-slate-500 mt-2">
                현재 다른 사용자가 시스템을 사용 중입니다.
              </p>
            </div>
          </div>

          <button
            onClick={handleRetry}
            className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  if (lockState === 'lost') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 rounded-full border-2 border-red-500">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">세션이 만료되었습니다</h2>
              <p className="text-slate-400">
                세션이 만료되었거나 다른 사용자가 접속을 시작했습니다.
              </p>
              <p className="text-sm text-slate-500 mt-2">
                다시 접속을 시도하려면 아래 버튼을 눌러주세요.
              </p>
            </div>
          </div>

          <button
            onClick={handleReconnect}
            className="w-full px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            다시 접속하기
          </button>
        </div>
      </div>
    );
  }

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

        <button
          onClick={handleAcquireLock}
          disabled={!serverConnected}
          className="w-full px-6 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Connect
        </button>

        <div className="text-center text-xs text-slate-500">
          v1.0.0
        </div>
      </div>
    </div>
  );
}
