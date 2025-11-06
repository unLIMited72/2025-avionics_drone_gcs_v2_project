import { useState } from 'react';
import ConnectionScreen from './components/ConnectionScreen';
import DashboardScreen from './components/DashboardScreen';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
  const [droneCount, setDroneCount] = useState(4);

  const handleConnect = (id: string, role: 'user' | 'admin', availableDrones: number) => {
    setUserId(id);
    setUserRole(role);
    setDroneCount(availableDrones);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setUserId('');
    setUserRole('user');
    setDroneCount(4);
  };

  return (
    <div className="h-screen bg-slate-900 overflow-hidden">
      {!isConnected ? (
        <ConnectionScreen onConnect={handleConnect} />
      ) : (
        <DashboardScreen
          droneId={userId}
          droneCount={droneCount}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}

export default App;
