import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { DroneStatus } from '../../services/rosConnection';

interface DroneMarkerProps {
  drone: DroneStatus;
}

const createDroneIcon = (id: string, headingDeg: number, status: 'Normal' | 'Warning' | 'Danger') => {
  const statusColors = {
    Normal: '#10b981',
    Warning: '#f59e0b',
    Danger: '#ef4444'
  };

  const color = statusColors[status];

  return L.divIcon({
    className: 'custom-drone-icon',
    html: `
      <div style="
        position: relative;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          style="
            transform: rotate(${headingDeg}deg);
            filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4));
            transition: transform 0.3s ease;
          "
        >
          <path
            d="M24 4 L32 36 L24 32 L16 36 Z"
            fill="${color}"
            stroke="#1e293b"
            stroke-width="2"
          />
          <circle
            cx="24"
            cy="24"
            r="4"
            fill="#1e293b"
          />
        </svg>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(30, 41, 59, 0.9);
          color: white;
          font-weight: bold;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid ${color};
          white-space: nowrap;
          pointer-events: none;
        ">
          ${id}
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

export default function DroneMarker({ drone }: DroneMarkerProps) {
  if (
    drone.latitude === undefined ||
    drone.longitude === undefined ||
    !isFinite(drone.latitude) ||
    !isFinite(drone.longitude)
  ) {
    console.log(`Drone ${drone.id}: Invalid position - lat: ${drone.latitude}, lon: ${drone.longitude}`);
    return null;
  }

  console.log(`Rendering Drone ${drone.id} at [${drone.latitude}, ${drone.longitude}] heading: ${drone.headingDeg}`);
  const heading = drone.headingDeg !== undefined ? drone.headingDeg : 0;

  return (
    <Marker
      position={[drone.latitude, drone.longitude]}
      icon={createDroneIcon(drone.id, heading, drone.status)}
    >
      <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
        <div style={{ fontSize: '12px' }}>
          <div><strong>Drone {drone.id}</strong></div>
          <div>Battery: {drone.battery}%</div>
          <div>Heading: {heading.toFixed(1)}°</div>
          <div>Status: {drone.status}</div>
        </div>
      </Tooltip>
    </Marker>
  );
}
