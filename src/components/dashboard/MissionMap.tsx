import { useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

interface Waypoint {
  id: number;
  lat: number;
  lng: number;
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

export default function MissionMap() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypoint, setSelectedWaypoint] = useState<number | null>(null);
  const mapRef = useRef<L.Map>(null);

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
        <h4 className="text-slate-300 font-medium">Mission Waypoints</h4>
        <div className="flex gap-2">
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
        </div>
      </div>

      <div className="relative w-full h-96 rounded-lg border-2 border-slate-700 overflow-hidden">
        <MapContainer
          center={[37.5665, 126.9780]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          />

          <MapClickHandler onMapClick={handleMapClick} />

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
    </div>
  );
}
