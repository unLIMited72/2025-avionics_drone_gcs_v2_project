import { useMemo, memo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { DroneStatus } from '../../services/rosConnection';

interface DroneMarkerProps {
  drone: DroneStatus;
  isSelected: boolean;
}

const extractDroneNumber = (id: string): string => {
  const match = id.match(/\d+$/);
  return match ? match[0] : id;
};

const normHeading = (deg?: number): number => {
  if (!isFinite(deg as number)) return 0;
  let d = (deg as number) % 360;
  if (d < 0) d += 360;
  return d;
};

const iconCache = new Map<string, L.DivIcon>();

const createDroneIcon = (id: string, headingDeg: number, isSelected: boolean) => {
  const roundedHeading = Math.round(headingDeg / 5) * 5;
  const cacheKey = `${id}-${roundedHeading}-${isSelected}`;
  const cached = iconCache.get(cacheKey);
  if (cached && iconCache.size < 200) return cached;

  const displayId = extractDroneNumber(id);
  const arrowFill = isSelected ? '#0ea5e9' : '#ef4444';
  const arrowStroke = isSelected ? '#0284c7' : '#7f1d1d';
  const scale = isSelected ? 1.15 : 1;
  const shadowIntensity = isSelected ? 0.7 : 0.5;

  const icon = L.divIcon({
    className: 'custom-drone-icon',
    html: `
      <div style="
        position: relative;
        width: 90px;
        height: 90px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: scale(${scale});
        transition: transform 0.3s ease;
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
            filter: drop-shadow(0 6px 12px rgba(0, 0, 0, ${shadowIntensity}));
            transition: transform 0.3s ease;
            z-index: 1;
          "
        >
          <path
            d="M45 13 L60 67 L45 61 L30 67 Z"
            fill="${arrowFill}"
            stroke="${arrowStroke}"
            stroke-width="${isSelected ? 4 : 3}"
          />
          <circle
            cx="45"
            cy="45"
            r="6"
            fill="${arrowStroke}"
          />
        </svg>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-weight: ${isSelected ? 'bold' : '300'};
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

  if (iconCache.size < 200) {
    iconCache.set(cacheKey, icon);
  }
  return icon;
};

function DroneMarker({ drone, isSelected }: DroneMarkerProps) {
  if (
    !isFinite(drone.latitude as number) ||
    !isFinite(drone.longitude as number)
  ) {
    return null;
  }

  const heading = normHeading(drone.headingDeg);
  const roundedHeading = Math.round(heading / 5) * 5;

  const icon = useMemo(
    () => createDroneIcon(drone.id, roundedHeading, isSelected),
    [drone.id, roundedHeading, isSelected]
  );

  return (
    <Marker
      position={[drone.latitude!, drone.longitude!]}
      icon={icon}
    >
      <Tooltip direction="top" offset={[0, -20]} opacity={0.9}>
        <div style={{ fontSize: '12px' }}>
          <div><strong>Drone {drone.id}</strong></div>
          <div>Battery: {drone.battery.toFixed(1)}%</div>
          <div>Heading: {heading.toFixed(1)}°</div>
          <div>Status: {drone.status}</div>
        </div>
      </Tooltip>
    </Marker>
  );
}

export default memo(DroneMarker, (prev, next) => {
  return (
    prev.drone.id === next.drone.id &&
    prev.drone.latitude === next.drone.latitude &&
    prev.drone.longitude === next.drone.longitude &&
    prev.drone.headingDeg === next.drone.headingDeg &&
    prev.drone.battery === next.drone.battery &&
    prev.drone.status === next.drone.status &&
    prev.isSelected === next.isSelected
  );
});
