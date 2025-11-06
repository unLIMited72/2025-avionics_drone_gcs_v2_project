import { useState } from 'react';
import ConnectionScreen from './components/ConnectionScreen';
import DashboardScreen from './components/DashboardScreen';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [userPassword, setUserPassword] = useState('');
  const [droneCount, setDroneCount] = useState(4);

  const handleConnect = (password: string, availableDrones: number) => {
    setUserPassword(password);
    setDroneCount(availableDrones);
    setIsConnected(true);
  };

  const isAdmin = userPassword === 'admin';

  const handleDisconnect = () => {
    setIsConnected(false);
    setUserPassword('');
    setDroneCount(4);
  };

  return (
    <div className="h-screen bg-slate-900 overflow-hidden">
      {!isConnected ? (
        <ConnectionScreen onConnect={handleConnect} />
      ) : (
        <DashboardScreen
          droneCount={droneCount}
          isAdmin={isAdmin}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}

export default App;
