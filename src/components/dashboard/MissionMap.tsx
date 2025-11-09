import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import ROSLIB from 'roslib';
import DroneMarker from './DroneMarker';
import { DroneStatus, rosConnection } from '../../services/rosConnection';
import { MissionState } from '../DashboardScreen';

interface Waypoint {
  id: number;
  lat: number;
  lng: number;
}

interface MissionMapProps {
  drones?: DroneStatus[];
  selectedIds?: Set<string>;
  missionState: MissionState;
  onStartOrUpdate: () => void;
  onPauseOrResume: () => void;
  onEmergencyReturn: () => void;
}

type LandingMode = 'HOME' | 'LAST_WAYPOINT';

interface MissionPlanPayload {
  mission_id: string;
  drone_ids: string[];
  waypoints: {
    seq: number;
    lat: number;
    lon: number;
    alt: number;
    hold_time: number;
  }[];
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

export default function MissionMap({
  drones = [],
  selectedIds = new Set(),
  missionState,
  onStartOrUpdate,
  onPauseOrResume,
  onEmergencyReturn,
}: MissionMapProps) {
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

  const [isStartUpdatePressed, setIsStartUpdatePressed] = useState(false);
  const [isPauseResumePressed, setIsPauseResumePressed] = useState(false);
  const [isEmergencyPressed, setIsEmergencyPressed] = useState(false);

  const [ros, setRos] = useState<ROSLIB.Ros | null>(null);
  const missionPlanTopicRef = useRef<ROSLIB.Topic | null>(null);
  const missionCommandTopicRef = useRef<ROSLIB.Topic | null>(null);

  useEffect(() => {
    const updateRos = () => {
      const connected = rosConnection.isConnected();
      const rosInstance = connected ? rosConnection.getRos() : null;
      console.log('[MissionMap] updateRos - connected:', connected, 'rosInstance:', rosInstance);
      setRos(rosInstance);

      if (connected && rosInstance) {
        if (!missionPlanTopicRef.current) {
          missionPlanTopicRef.current = new ROSLIB.Topic({
            ros: rosInstance,
            name: '/gcs/mission_plan_raw',
            messageType: 'std_msgs/String',
          });
          missionPlanTopicRef.current.advertise();
          console.log('[MissionMap] Created and advertised mission_plan_raw topic');
        }

        if (!missionCommandTopicRef.current) {
          missionCommandTopicRef.current = new ROSLIB.Topic({
            ros: rosInstance,
            name: '/gcs/mission_command_raw',
            messageType: 'std_msgs/String',
          });
          missionCommandTopicRef.current.advertise();
          console.log('[MissionMap] Created and advertised mission_command_raw topic');
        }
      } else {
        missionPlanTopicRef.current = null;
        missionCommandTopicRef.current = null;
        console.log('[MissionMap] Cleared topic refs (not connected)');
      }
    };

    updateRos();

    const unsubscribe = rosConnection.onConnectionChange((connected) => {
      console.log('[MissionMap] Connection status changed:', connected);
      updateRos();
    });

    return () => {
      unsubscribe();
      missionPlanTopicRef.current = null;
      missionCommandTopicRef.current = null;
    };
  }, []);

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

  const handleMapClick = useCallback((lat: number, lng: number) => {
    const newWaypoint: Waypoint = {
      id: Date.now(),
      lat,
      lng,
    };

    setWaypoints(prev => [...prev, newWaypoint]);
  }, []);

  const handleRemoveWaypoint = useCallback((id: number) => {
    setWaypoints(prev => prev.filter(wp => wp.id !== id));
    setSelectedWaypoint(prev => prev === id ? null : prev);
  }, []);

  const handleClearAll = useCallback(() => {
    setWaypoints([]);
    setSelectedWaypoint(null);
  }, []);

  const buildMissionPlanPayload = useCallback((): MissionPlanPayload | null => {
    const drone_ids = Array.from(selectedIds || []).filter(Boolean);

    if (drone_ids.length === 0) {
      alert('Select at least one drone for the mission.');
      return null;
    }

    if (waypoints.length === 0) {
      alert('Add at least one waypoint.');
      return null;
    }

    if (spacingDistance <= 0) {
      alert('Spacing distance must be greater than 0.');
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
        alt: cruiseAltitude,
        hold_time: 0.0,
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
  }, [waypoints, selectedIds, missionId, cruiseAltitude, cruiseSpeed, landingMode, spacingDistance]);

  const sendMissionCommand = useCallback((command: MissionCommandPayload['command']) => {
    if (!ros || !missionCommandTopicRef.current) {
      alert('ROS not connected. Please check server connection.');
      return false;
    }

    if (!missionId) {
      alert('No mission_id. Please start a mission first.');
      return false;
    }

    const payload: MissionCommandPayload = { mission_id: missionId, command };

    try {
      const msg = new ROSLIB.Message({ data: JSON.stringify(payload) });
      missionCommandTopicRef.current.publish(msg);
      console.log(`Mission command sent: ${command}`);
      return true;
    } catch (err) {
      console.error('Failed to publish mission command:', err);
      alert('Failed to send mission command');
      return false;
    }
  }, [ros, missionCommandTopicRef, missionId]);

  const handleStartOrUpdateClick = useCallback(() => {
    console.log('[MissionMap] handleStartOrUpdateClick - ros:', ros, 'planTopic:', missionPlanTopicRef.current, 'cmdTopic:', missionCommandTopicRef.current);
    if (!ros || !missionPlanTopicRef.current || !missionCommandTopicRef.current) {
      console.error('[MissionMap] ROS not connected or topics not initialized');
      alert('ROS not connected. Please check server connection.');
      return;
    }

    const payload = buildMissionPlanPayload();
    if (!payload) return;

    setIsStartUpdatePressed(true);
    setTimeout(() => setIsStartUpdatePressed(false), 300);

    try {
      const payloadStr = JSON.stringify(payload);
      console.log('[MissionMap] Publishing mission plan, payload string:', payloadStr);

      const planMsg = new ROSLIB.Message({
        data: payloadStr,
      });

      console.log('[MissionMap] planMsg object:', planMsg);
      missionPlanTopicRef.current.publish(planMsg);
      console.log('[MissionMap] Mission plan published successfully');

      if (missionState === 'IDLE') {
        const commandPayload = {
          mission_id: payload.mission_id,
          command: 'START',
        };
        const commandStr = JSON.stringify(commandPayload);
        console.log('[MissionMap] Publishing START command, payload string:', commandStr);

        const cmdMsg = new ROSLIB.Message({
          data: commandStr,
        });

        console.log('[MissionMap] cmdMsg object:', cmdMsg);
        missionCommandTopicRef.current.publish(cmdMsg);
        console.log('[MissionMap] Mission START command sent successfully');
      } else {
        console.log('[MissionMap] Mission plan updated (no START command, state is not IDLE)');
      }

      onStartOrUpdate();
    } catch (err) {
      console.error('[MissionMap] Failed to send mission plan:', err);
      alert('Failed to send mission plan');
      setIsStartUpdatePressed(false);
    }
  }, [ros, missionPlanTopicRef, missionCommandTopicRef, buildMissionPlanPayload, missionState, onStartOrUpdate]);

  const handlePauseResumeClick = useCallback(() => {
    setIsPauseResumePressed(true);
    setTimeout(() => setIsPauseResumePressed(false), 300);

    if (missionState === 'ACTIVE') {
      if (sendMissionCommand('PAUSE')) {
        onPauseOrResume();
      }
    } else if (missionState === 'PAUSED') {
      if (sendMissionCommand('RESUME')) {
        onPauseOrResume();
      }
    }
  }, [missionState, sendMissionCommand, onPauseOrResume]);

  const handleEmergencyClick = useCallback(() => {
    setIsEmergencyPressed(true);
    setTimeout(() => setIsEmergencyPressed(false), 300);

    if (sendMissionCommand('EMERGENCY_RETURN')) {
      onEmergencyReturn();
    }
  }, [sendMissionCommand, onEmergencyReturn]);

  const pathCoordinates = useMemo(
    () => waypoints.map(wp => [wp.lat, wp.lng] as [number, number]),
    [waypoints]
  );

  const selectedWaypointData = useMemo(
    () => waypoints.find(wp => wp.id === selectedWaypoint),
    [waypoints, selectedWaypoint]
  );

  const getStartUpdateButtonConfig = () => {
    if (missionState === 'IDLE') {
      return {
        label: 'Start Mission',
        style: 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20',
        disabled: false,
      };
    } else if (missionState === 'ACTIVE' || missionState === 'PAUSED') {
      return {
        label: 'Update Mission',
        style: 'bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-500/20',
        disabled: false,
      };
    } else {
      return {
        label: 'Start Mission',
        style: 'bg-slate-700 text-slate-500 cursor-not-allowed',
        disabled: true,
      };
    }
  };

  const getPauseResumeButtonConfig = () => {
    if (missionState === 'ACTIVE') {
      return {
        label: 'Pause',
        style: 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20',
        visible: true,
      };
    } else if (missionState === 'PAUSED') {
      return {
        label: 'Resume',
        style: 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20',
        visible: true,
      };
    } else {
      return {
        label: 'Pause',
        style: '',
        visible: false,
      };
    }
  };

  const startUpdateBtn = getStartUpdateButtonConfig();
  const pauseResumeBtn = getPauseResumeButtonConfig();
  const emergencyEnabled = missionState === 'ACTIVE' || missionState === 'PAUSED';

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
            <span className="text-slate-500 mr-1">Mission State:</span>
            <span className={`font-semibold ${
              missionState === 'ACTIVE' ? 'text-emerald-400' :
              missionState === 'PAUSED' ? 'text-amber-400' :
              missionState === 'EMERGENCY' ? 'text-red-400' :
              'text-slate-400'
            }`}>
              {missionState}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <label className="block text-slate-400">Cruise Altitude (m)</label>
            <input
              type="number"
              min="1"
              step="1"
              value={cruiseAltitude}
              onChange={(e) => setCruiseAltitude(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-slate-400">Cruise Speed (m/s)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={cruiseSpeed}
              onChange={(e) => setCruiseSpeed(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-slate-400">Spacing Distance (m)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={spacingDistance}
              onChange={(e) => setSpacingDistance(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
        <h5 className="text-slate-300 text-sm font-medium mb-3">Mission Controls</h5>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleStartOrUpdateClick}
            disabled={startUpdateBtn.disabled}
            className={`w-full px-6 py-3 text-white font-semibold rounded-lg transition-all duration-150 ${startUpdateBtn.style} ${
              isStartUpdatePressed ? 'scale-95 brightness-90' : 'active:scale-95'
            }`}
          >
            {startUpdateBtn.label}
          </button>

          {pauseResumeBtn.visible && (
            <button
              onClick={handlePauseResumeClick}
              className={`w-full px-6 py-3 text-white font-semibold rounded-lg transition-all duration-150 ${pauseResumeBtn.style} ${
                isPauseResumePressed ? 'scale-95 brightness-90' : 'active:scale-95'
              }`}
            >
              {pauseResumeBtn.label}
            </button>
          )}

          <button
            onClick={handleEmergencyClick}
            disabled={!emergencyEnabled}
            className={`w-full px-6 py-3 text-white font-semibold rounded-lg transition-all duration-150 ${
              emergencyEnabled
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            } ${
              isEmergencyPressed ? 'scale-95 brightness-90' : 'active:scale-95'
            }`}
          >
            Emergency Return
          </button>
        </div>
      </div>
    </div>
  );
}
