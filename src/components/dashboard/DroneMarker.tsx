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
        width: 90px;
        height: 90px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg
          width="90"
          height="90"
          viewBox="0 0 90 90"
          style="
            position: absolute;
            top: 0;
            left: 0;
            transform: rotate(${headingDeg}deg);
            filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5));
            transition: transform 0.3s ease;
            z-index: 1;
          "
        >
          <path
            d="M45 8 L55 72 L45 66 L35 72 Z"
            fill="#ef4444"
            stroke="#7f1d1d"
            stroke-width="3"
          />
          <circle
            cx="45"
            cy="45"
            r="6"
            fill="#7f1d1d"
          />
        </svg>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-weight: 300;
          font-size: 15px;
          text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
          white-space: nowrap;
          pointer-events: none;
          z-index: 2;
        ">
          ${displayId}
        </div>
      </div>
    `,
    iconSize: [90, 90],
    iconAnchor: [45, 45],
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
