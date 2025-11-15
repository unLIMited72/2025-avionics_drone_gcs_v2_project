import { useState, useEffect, useRef } from 'react';
import ConnectionScreen from './components/ConnectionScreen';
import DashboardScreen from './components/DashboardScreen';
import SessionBlocker from './components/SessionBlocker';
import { SessionManager } from './services/sessionManager';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionAllowed, setSessionAllowed] = useState<boolean | null>(null);
  const sessionManagerRef = useRef<SessionManager | null>(null);

  useEffect(() => {
    sessionManagerRef.current = new SessionManager();
    checkSession();

    return () => {
      if (sessionManagerRef.current) {
        sessionManagerRef.current.releaseSession();
      }
    };
  }, []);

  const checkSession = async () => {
    if (!sessionManagerRef.current) return;

    const result = await sessionManagerRef.current.checkAndAcquireSession();
    setSessionAllowed(result.success);
  };

  const handleConnect = () => {
    setIsConnected(true);
  };

  const handleDisconnect = async () => {
    setIsConnected(false);
    if (sessionManagerRef.current) {
      await sessionManagerRef.current.releaseSession();
    }
  };

  const handleRetry = () => {
    setSessionAllowed(null);
    checkSession();
  };

  if (sessionAllowed === null) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">세션 확인 중...</div>
      </div>
    );
  }

  if (!sessionAllowed) {
    return <SessionBlocker onRetry={handleRetry} />;
  }

  return (
    <div className="h-screen bg-slate-900 overflow-hidden">
      {!isConnected ? (
        <ConnectionScreen onConnect={handleConnect} />
      ) : (
        <DashboardScreen onDisconnect={handleDisconnect} />
      )}
    </div>
  );
}

export default App;
