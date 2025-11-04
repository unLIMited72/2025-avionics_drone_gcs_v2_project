import { useState } from 'react';
import ConnectionScreen from './components/ConnectionScreen';
import DashboardScreen from './components/DashboardScreen';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [droneId, setDroneId] = useState('');
  const [droneCount, setDroneCount] = useState(1);

  const handleConnect = (id: string, count: number) => {
    setDroneId(id);
    setDroneCount(count);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setDroneId('');
    setDroneCount(1);
  };

  return (
    <div className="h-screen bg-slate-900 overflow-hidden">
      {!isConnected ? (
        <ConnectionScreen onConnect={handleConnect} />
      ) : (
        <DashboardScreen
          droneId={droneId}
          droneCount={droneCount}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}

export default App;
