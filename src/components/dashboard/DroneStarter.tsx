import './DroneStarter.css';

interface DroneStarterProps {
  droneId: string;
  isArmed: boolean;
  onArmToggle: () => void;
  flightMode: string;
}

export default function DroneStarter({ droneId, isArmed, onArmToggle, flightMode }: DroneStarterProps) {
  return (
    <div className="drone-starter-panel">
      <div className="panel-header">
        <h2>Drone Starter</h2>
      </div>
      <div className="drone-starter-content">
        <div className="drone-info-section">
          <div className="drone-info-item">
            <span className="drone-info-label">Serial Number</span>
            <span className="drone-info-value">{droneId}</span>
          </div>
          <div className="drone-info-item">
            <span className="drone-info-label">Flight Mode</span>
            <span className="drone-mode-badge">{flightMode}</span>
          </div>
        </div>

        <div className="drone-arm-section">
          <button
            onClick={onArmToggle}
            className={`drone-arm-button ${isArmed ? 'armed' : 'disarmed'}`}
          >
            <div className="arm-button-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isArmed ? (
                  <path d="M12 2L8 6H4v4l4 4-4 4v4h4l4 4 4-4h4v-4l-4-4 4-4V6h-4l-4-4z" />
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </>
                )}
              </svg>
            </div>
            <div className="arm-button-text">
              {isArmed ? 'DISARM' : 'ARM'}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
