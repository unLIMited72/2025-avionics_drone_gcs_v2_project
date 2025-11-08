import { useState, useRef, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import ROSLIB from 'roslib';
import DroneMarker from './DroneMarker';
import { DroneStatus, rosConnection } from '../../services/rosConnection';

interface Waypoint {
  id: number;
  lat: number;
  lng: number;
}

interface MissionMapProps {
  drones?: DroneStatus[];
  selectedIds?: Set<string>;
}

type LandingMode = 'HOME' | 'LAST_WAYPOINT';

interface MissionPlanPayload {
  mission_id: string;
  drone_ids: string[];
  waypoints: { seq: number; lat: number; lon: number }[];
  cruise_altitude_m: number;
  cruise_speed_mps: number;
  landing_mode: LandingMode;
  spacing_type: 'DISTANCE';
  spacing_value: number;
  options: {
    sequential_launch: boolean;
    order_by_id: boolean;
    heading_to_next_wp: boolean;
  };
}

interface MissionCommandPayload {
  mission_id: string;
  command: 'START' | 'PAUSE' | 'RESUME' | 'EMERGENCY_RETURN';
}

const createNumberedIcon = (number: number, isSelected: boolean) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: ${isSelected ? '#0ea5e9' : '#0284c7'};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        border: 3px solid ${isSelected ? '#38bdf8' : '#0369a1'};
        box-shadow: ${isSelected ? '0 10px 25px -5px rgba(14, 165, 233, 0.5)' : '0 4px 6px -1px rgba(0, 0, 0, 0.3)'};
        transition: all 0.3s;
        transform: ${isSelected ? 'scale(1.25)' : 'scale(1)'};
      ">
        ${number}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};


function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MissionMap({ drones = [], selectedIds = new Set() }: MissionMapProps) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypoint, setSelectedWaypoint] = useState<number | null>(null);
  const mapRef = useRef<L.Map>(null);
  const [initialCenter] = useState<[number, number]>([37.5665, 126.9780]);
  const hasSetCenter = useRef(false);

  const [landingMode, setLandingMode] = useState<LandingMode>('HOME');
  const [cruiseAltitude, setCruiseAltitude] = useState<number>(40);
  const [cruiseSpeed, setCruiseSpeed] = useState<number>(5);
  const [spacingDistance, setSpacingDistance] = useState<number>(10);
  const [missionId, setMissionId] = useState<string>('');
  const [missionStatus, setMissionStatus] = useState<string>('IDLE');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const missionPlanTopic = useMemo(
    () =>
      new ROSLIB.Topic({
        ros: rosConnection,
        name: '/gcs/mission_plan_raw',
        messageType: 'std_msgs/String',
      }),
    []
  );

  const missionCommandTopic = useMemo(
    () =>
      new ROSLIB.Topic({
        ros: rosConnection,
        name: '/gcs/mission_command_raw',
        messageType: 'std_msgs/String',
      }),
    []
  );

  const dronesWithPosition = useMemo(
    () => drones.filter(d => d.latitude !== undefined && d.longitude !== undefined),
    [drones]
  );

  useEffect(() => {
    if (!hasSetCenter.current && dronesWithPosition.length > 0 && mapRef.current) {
      const firstDrone = dronesWithPosition[0];
      if (firstDrone.latitude && firstDrone.longitude) {
        mapRef.current.setView([firstDrone.latitude, firstDrone.longitude], 17);
        hasSetCenter.current = true;
      }
    }
  }, [dronesWithPosition]);

  const handleMapClick = (lat: number, lng: number) => {
    const newWaypoint: Waypoint = {
      id: Date.now(),
      lat,
      lng,
    };

    setWaypoints([...waypoints, newWaypoint]);
  };

  const handleRemoveWaypoint = (id: number) => {
    setWaypoints(waypoints.filter(wp => wp.id !== id));
    if (selectedWaypoint === id) {
      setSelectedWaypoint(null);
    }
  };

  const handleClearAll = () => {
    setWaypoints([]);
    setSelectedWaypoint(null);
  };

  const buildMissionPlanPayload = (): MissionPlanPayload | null => {
    const drone_ids = Array.from(selectedIds || []).filter(Boolean);

    if (drone_ids.length === 0) {
      alert('Select at least one drone for the mission.');
      return null;
    }

    if (waypoints.length === 0) {
      alert('Add at least one waypoint.');
      return null;
    }

    const id = missionId || `mission_${Date.now()}`;
    if (!missionId) setMissionId(id);

    return {
      mission_id: id,
      drone_ids,
      waypoints: waypoints.map((wp, idx) => ({
        seq: idx,
        lat: wp.lat,
        lon: wp.lng,
      })),
      cruise_altitude_m: cruiseAltitude,
      cruise_speed_mps: cruiseSpeed,
      landing_mode: landingMode,
      spacing_type: 'DISTANCE',
      spacing_value: spacingDistance,
      options: {
        sequential_launch: true,
        order_by_id: true,
        heading_to_next_wp: true,
      },
    };
  };

  const sendMissionCommand = (command: MissionCommandPayload['command']) => {
    if (!missionId) {
      alert('No mission_id. Please press Start first.');
      return;
    }

    const payload: MissionCommandPayload = { mission_id: missionId, command };

    try {
      const msg = new ROSLIB.Message({ data: JSON.stringify(payload) });
      missionCommandTopic.publish(msg);

      if (command === 'START') {
        setMissionStatus('STARTED');
        setIsPaused(false);
      } else if (command === 'PAUSE') {
        setMissionStatus('PAUSED');
        setIsPaused(true);
      } else if (command === 'RESUME') {
        setMissionStatus('RESUMED');
        setIsPaused(false);
      } else if (command === 'EMERGENCY_RETURN') {
        setMissionStatus('EMERGENCY_RETURN_SENT');
      }
    } catch (err) {
      console.error('Failed to publish mission command:', err);
      alert('Failed to send mission command');
    }
  };

  const handleStart = () => {
    const payload = buildMissionPlanPayload();
    if (!payload) return;

    try {
      const planMsg = new ROSLIB.Message({
        data: JSON.stringify(payload),
      });
      missionPlanTopic.publish(planMsg);
      setMissionStatus('PLAN_SENT');

      const cmdMsg = new ROSLIB.Message({
        data: JSON.stringify({
          mission_id: payload.mission_id,
          command: 'START',
        }),
      });
      missionCommandTopic.publish(cmdMsg);

      setMissionStatus('STARTED');
      setIsPaused(false);
    } catch (err) {
      console.error('Failed to start mission:', err);
      alert('Failed to start mission');
    }
  };

  const handlePauseResume = () => {
    if (!missionId) {
      alert('No mission to control.');
      return;
    }
    if (isPaused) {
      sendMissionCommand('RESUME');
    } else {
      sendMissionCommand('PAUSE');
    }
  };

  const handleEmergencyReturn = () => {
    if (!missionId) {
      alert('No mission to control.');
      return;
    }
    sendMissionCommand('EMERGENCY_RETURN');
  };

  const pathCoordinates = useMemo(
    () => waypoints.map(wp => [wp.lat, wp.lng] as [number, number]),
    [waypoints]
  );

  const selectedWaypointData = useMemo(
    () => waypoints.find(wp => wp.id === selectedWaypoint),
    [waypoints, selectedWaypoint]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-slate-300 font-medium">Mission Map</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {dronesWithPosition.length} drone{dronesWithPosition.length !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-600">|</span>
          <button
            onClick={handleClearAll}
            disabled={waypoints.length === 0}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 text-xs rounded transition-colors"
          >
            Clear All
          </button>
          <span className="text-xs text-slate-400">
            {waypoints.length} waypoint{waypoints.length !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-600">|</span>
          <div className="inline-flex bg-slate-800 rounded-lg p-1 text-[10px]">
            <button
              type="button"
              onClick={() => setLandingMode('HOME')}
              className={`px-2 py-1 rounded-md transition-colors ${
                landingMode === 'HOME'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-400 hover:text-sky-400'
              }`}
            >
              Landing: HOME
            </button>
            <button
              type="button"
              onClick={() => setLandingMode('LAST_WAYPOINT')}
              className={`px-2 py-1 rounded-md transition-colors ${
                landingMode === 'LAST_WAYPOINT'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-400 hover:text-sky-400'
              }`}
            >
              Landing: LAST-POINT
            </button>
          </div>
        </div>
      </div>

      <div className="relative w-full h-96 rounded-lg border-2 border-slate-700 overflow-hidden">
        <MapContainer
          center={initialCenter}
          zoom={17}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          />

          <MapClickHandler onMapClick={handleMapClick} />

          {drones.map((drone) => (
            <DroneMarker
              key={drone.id}
              drone={drone}
              isSelected={selectedIds.has(drone.id)}
            />
          ))}

          {waypoints.map((wp, index) => (
            <Marker
              key={wp.id}
              position={[wp.lat, wp.lng]}
              icon={createNumberedIcon(index + 1, selectedWaypoint === wp.id)}
              eventHandlers={{
                click: () => setSelectedWaypoint(wp.id),
                dblclick: () => handleRemoveWaypoint(wp.id),
              }}
            />
          ))}

          {pathCoordinates.length > 1 && (
            <Polyline
              positions={pathCoordinates}
              color="#0ea5e9"
              weight={2}
              opacity={0.8}
              dashArray="8, 8"
            />
          )}
        </MapContainer>

        {waypoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm pointer-events-none bg-slate-900/20 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Click to add waypoints</span>
            </div>
          </div>
        )}
      </div>

      {selectedWaypoint !== null && selectedWaypointData && (
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-slate-300 text-sm font-medium">
              Waypoint {waypoints.findIndex(wp => wp.id === selectedWaypoint) + 1}
            </h5>
            <button
              onClick={() => handleRemoveWaypoint(selectedWaypoint)}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500">Lat:</span>
              <span className="text-slate-300 ml-1">
                {selectedWaypointData.lat.toFixed(6)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Lng:</span>
              <span className="text-slate-300 ml-1">
                {selectedWaypointData.lng.toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 p-3 bg-slate-900 rounded-lg border border-slate-700 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div>
            <span className="mr-3">
              Selected Drones:{' '}
              <span className="text-sky-400 font-semibold">
                {selectedIds.size}
              </span>
            </span>
            <span>
              Waypoints:{' '}
              <span className="text-emerald-400 font-semibold">
                {waypoints.length}
              </span>
            </span>
          </div>
          <div>
            <span className="text-slate-500 mr-1">Mission Status:</span>
            <span className="text-sky-400 font-semibold">
              {missionStatus}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <label className="block text-slate-400">Cruise Altitude (m)</label>
            <input
              type="number"
              value={cruiseAltitude}
              onChange={(e) => setCruiseAltitude(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-slate-400">Cruise Speed (m/s)</label>
            <input
              type="number"
              value={cruiseSpeed}
              onChange={(e) => setCruiseSpeed(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-slate-400">Spacing Distance (m)</label>
            <input
              type="number"
              value={spacingDistance}
              onChange={(e) => setSpacingDistance(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={handleStart}
            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors"
          >
            Start
          </button>
          <button
            type="button"
            onClick={handlePauseResume}
            disabled={!missionId || missionStatus === 'IDLE'}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded transition-colors"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={handleEmergencyReturn}
            disabled={!missionId}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded transition-colors"
          >
            Emergency Return
          </button>
        </div>
      </div>
    </div>
  );
}
