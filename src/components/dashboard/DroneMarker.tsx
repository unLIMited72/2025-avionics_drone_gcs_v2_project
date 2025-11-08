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
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          style="
            transform: rotate(${headingDeg}deg);
            filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5));
            transition: transform 0.3s ease;
          "
        >
          <path
            d="M40 8 L52 60 L40 54 L28 60 Z"
            fill="#ef4444"
            stroke="#7f1d1d"
            stroke-width="3"
          />
          <circle
            cx="40"
            cy="40"
            r="6"
            fill="#7f1d1d"
          />
        </svg>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(127, 29, 29, 0.95);
          color: white;
          font-weight: bold;
          font-size: 16px;
          padding: 4px 10px;
          border-radius: 6px;
          border: 2px solid #ef4444;
          white-space: nowrap;
          pointer-events: none;
          min-width: 30px;
          text-align: center;
        ">
          ${displayId}
        </div>
      </div>
    `,
    iconSize: [80, 80],
    iconAnchor: [40, 40],
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
