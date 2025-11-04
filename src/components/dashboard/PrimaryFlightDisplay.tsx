import './PrimaryFlightDisplay.css';

interface TelemetryData {
  altitude: number;
  speed: number;
  heading: number;
  velocity: number;
  acceleration: number;
  pitch: number;
  roll: number;
  latitude?: number;
  longitude?: number;
}

interface PrimaryFlightDisplayProps {
  data: TelemetryData;
}

export default function PrimaryFlightDisplay({ data }: PrimaryFlightDisplayProps) {
  return (
    <div className="pfd-panel">
      <div className="pfd-header">
        <h3>Primary Flight Display</h3>
        <div className="pfd-controls">
          <button className="pfd-control-btn">−</button>
          <button className="pfd-control-btn">×</button>
        </div>
      </div>

      <div className="pfd-content-grid">
        <div className="pfd-attitude-section">
          <div className="pfd-attitude-indicator">
            <svg viewBox="0 0 200 200" className="attitude-svg">
              <defs>
                <clipPath id="circle-clip">
                  <circle cx="100" cy="100" r="85" />
                </clipPath>
              </defs>

              <g clipPath="url(#circle-clip)">
                <g transform={`rotate(${-data.roll} 100 100)`}>
                  <g transform={`translate(0 ${data.pitch * 2})`}>
                    <rect x="0" y="0" width="200" height="100" fill="#87CEEB" />
                    <rect x="0" y="100" width="200" height="100" fill="#8B7355" />

                    <line x1="0" y1="100" x2="200" y2="100" stroke="white" strokeWidth="2" />

                    {[-30, -20, -10, 10, 20, 30].map((angle) => (
                      <g key={angle}>
                        <line
                          x1="80"
                          y1={100 - angle * 2}
                          x2="120"
                          y2={100 - angle * 2}
                          stroke="white"
                          strokeWidth="1.5"
                          opacity="0.8"
                        />
                        <text
                          x="65"
                          y={100 - angle * 2 + 4}
                          fill="white"
                          fontSize="10"
                          textAnchor="end"
                        >
                          {angle > 0 ? angle : Math.abs(angle)}
                        </text>
                        <text
                          x="135"
                          y={100 - angle * 2 + 4}
                          fill="white"
                          fontSize="10"
                          textAnchor="start"
                        >
                          {angle > 0 ? angle : Math.abs(angle)}
                        </text>
                      </g>
                    ))}
                  </g>
                </g>
              </g>

              <circle cx="100" cy="100" r="85" fill="none" stroke="#00d4ff" strokeWidth="2" />

              <g>
                <line x1="50" y1="100" x2="80" y2="100" stroke="#ffaa00" strokeWidth="3" />
                <line x1="120" y1="100" x2="150" y2="100" stroke="#ffaa00" strokeWidth="3" />
                <circle cx="100" cy="100" r="3" fill="#ffaa00" />
              </g>

              {[-60, -45, -30, -15, 15, 30, 45, 60].map((angle) => {
                const isLarge = angle % 30 === 0;
                return (
                  <g key={angle} transform={`rotate(${angle} 100 100)`}>
                    <line
                      x1="100"
                      y1="15"
                      x2="100"
                      y2={isLarge ? 25 : 20}
                      stroke="white"
                      strokeWidth={isLarge ? 2 : 1}
                    />
                  </g>
                );
              })}

              <g transform={`rotate(${data.roll} 100 100)`}>
                <polygon points="100,12 95,20 105,20" fill="#ffaa00" />
              </g>
            </svg>
          </div>

          <div className="pfd-compass-indicator">
            <svg viewBox="0 0 200 200" className="compass-svg">
              <circle cx="100" cy="100" r="85" fill="none" stroke="#00d4ff" strokeWidth="2" />
              <circle cx="100" cy="100" r="75" fill="none" stroke="#00d4ff" strokeWidth="1" opacity="0.3" />

              <g transform={`rotate(${-data.heading} 100 100)`}>
                {[
                  { angle: 0, label: 'N', color: '#ff4444' },
                  { angle: 90, label: 'E', color: '#ffffff' },
                  { angle: 180, label: 'S', color: '#ffffff' },
                  { angle: 270, label: 'W', color: '#ffffff' },
                ].map(({ angle, label, color }) => (
                  <g key={angle} transform={`rotate(${angle} 100 100)`}>
                    <text
                      x="100"
                      y="30"
                      fill={color}
                      fontSize="16"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {label}
                    </text>
                  </g>
                ))}

                {Array.from({ length: 36 }).map((_, i) => {
                  const angle = i * 10;
                  if (angle % 90 === 0) return null;
                  return (
                    <g key={angle} transform={`rotate(${angle} 100 100)`}>
                      <line
                        x1="100"
                        y1="15"
                        x2="100"
                        y2={angle % 30 === 0 ? 25 : 20}
                        stroke="white"
                        strokeWidth={angle % 30 === 0 ? 2 : 1}
                        opacity="0.6"
                      />
                    </g>
                  );
                })}
              </g>

              <text
                x="100"
                y="110"
                fill="#ff4444"
                fontSize="32"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {data.heading.toFixed(0)}°
              </text>

              <polygon points="100,15 95,25 105,25" fill="#ffaa00" />
            </svg>
          </div>
        </div>

        <div className="pfd-data-section">
          <div className="pfd-data-box altitude-box">
            <div className="data-label">Altitude</div>
            <div className="data-value">{data.altitude.toFixed(0)} m</div>
          </div>

          <div className="pfd-data-box velocity-box">
            <div className="data-label">Velocity</div>
            <div className="data-value">{data.velocity.toFixed(1)} m/s</div>
          </div>

          <div className="pfd-data-box acceleration-box">
            <div className="data-label">Acceleration</div>
            <div className="data-value">{data.acceleration.toFixed(1)} m/s²</div>
          </div>

          <div className="pfd-data-box position-box">
            <div className="data-label">Position</div>
            <div className="position-coords">
              <div className="coord-line">
                <span className="coord-label">Lat:</span>
                <span className="coord-value">{data.latitude?.toFixed(4) || '-37.7713°'}</span>
              </div>
              <div className="coord-line">
                <span className="coord-label">Lon:</span>
                <span className="coord-value">{data.longitude?.toFixed(4) || '-122.4194°'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
