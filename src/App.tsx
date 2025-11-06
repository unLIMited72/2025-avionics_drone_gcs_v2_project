import { useState } from 'react';
import ConnectionScreen from './components/ConnectionScreen';
import DashboardScreen from './components/DashboardScreen';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
  const [droneCount, setDroneCount] = useState(4);

  const handleConnect = (role: 'user' | 'admin', availableDrones: number) => {
    setUserRole(role);
    setDroneCount(availableDrones);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setUserRole('user');
    setDroneCount(4);
  };

  return (
    <div className="h-screen bg-slate-900 overflow-hidden">
      {!isConnected ? (
        <ConnectionScreen onConnect={handleConnect} />
      ) : (
        <DashboardScreen
          droneId={userRole === 'admin' ? 'ADMIN' : 'USER'}
          droneCount={droneCount}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}

export default App;
