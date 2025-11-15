import { useState, useRef } from 'react';
import ConnectionScreen from './components/ConnectionScreen';
import DashboardScreen from './components/DashboardScreen';
import { GcsLockService } from './services/gcsLockService';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const lockServiceRef = useRef<GcsLockService | null>(null);

  const handleConnect = () => {
    setIsConnected(true);
    setSessionExpired(false);
  };

  const handleDisconnect = async () => {
    if (lockServiceRef.current) {
      await lockServiceRef.current.releaseLock();
      lockServiceRef.current.cleanup();
    }
    setIsConnected(false);
  };

  const handleLockServiceReady = (service: GcsLockService) => {
    lockServiceRef.current = service;

    service.setOnLockLost(() => {
      console.warn('[App] GCS lock lost, disconnecting...');
      service.stopHeartbeat();
      setIsConnected(false);
      setSessionExpired(true);
    });
  };

  const handleClearSessionExpired = () => {
    setSessionExpired(false);
  };

  return (
    <div className="h-screen bg-slate-900 overflow-hidden">
      {!isConnected ? (
        <ConnectionScreen
          onConnect={handleConnect}
          onLockServiceReady={handleLockServiceReady}
          sessionExpired={sessionExpired}
          onClearSessionExpired={handleClearSessionExpired}
        />
      ) : (
        <DashboardScreen onDisconnect={handleDisconnect} />
      )}
    </div>
  );
}

export default App;
