import { useState, useRef } from 'react';
import ConnectionScreen from './components/ConnectionScreen';
import DashboardScreen from './components/DashboardScreen';
import { GcsLockService } from './services/gcsLockService';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const lockServiceRef = useRef<GcsLockService | null>(null);

  const handleConnect = () => {
    setIsConnected(true);
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
  };

  return (
    <div className="h-screen bg-slate-900 overflow-hidden">
      {!isConnected ? (
        <ConnectionScreen
          onConnect={handleConnect}
          onLockServiceReady={handleLockServiceReady}
        />
      ) : (
        <DashboardScreen onDisconnect={handleDisconnect} />
      )}
    </div>
  );
}

export default App;
