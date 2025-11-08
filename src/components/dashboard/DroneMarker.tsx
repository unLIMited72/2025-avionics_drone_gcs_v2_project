import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { DroneStatus } from '../../services/rosConnection';

interface DroneMarkerProps {
  drone: DroneStatus;
}

const extractDroneNumber = (id: string): string => {
  const match = id.match(/\d+$/);
  return match ? match[0] : id;
};

const createDroneIcon = (id: string, headingDeg: number) => {
  const displayId = extractDroneNumber(id);

  return L.divIcon({
    className: 'custom-drone-icon',
    html: `
      <div style="
        position: relative;
        width: 120px;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          style="
            transform: rotate(${headingDeg}deg);
            filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6));
            transition: transform 0.3s ease;
          "
        >
          <path
            d="M60 10 L85 95 L60 85 L35 95 Z"
            fill="#ef4444"
            stroke="#7f1d1d"
            stroke-width="4"
          />
          <circle
            cx="60"
            cy="60"
            r="8"
            fill="#7f1d1d"
          />
        </svg>
        <div style="
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          font-weight: 900;
          font-size: 24px;
          text-shadow:
            -2px -2px 0 #000,
            2px -2px 0 #000,
            -2px 2px 0 #000,
            2px 2px 0 #000,
            0 0 8px rgba(0, 0, 0, 0.8);
          white-space: nowrap;
          pointer-events: none;
        ">
          ${displayId}
        </div>
      </div>
    `,
    iconSize: [120, 120],
    iconAnchor: [60, 60],
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
      icon={createDroneIcon(drone.id, heading)}
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
