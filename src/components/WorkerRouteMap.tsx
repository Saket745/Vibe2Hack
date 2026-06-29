import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { routeService, type RouteResult, type RouteStop } from '../lib/RouteService';
import { MapPin, Navigation, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom numbered icon generator
const createNumberedIcon = (number: number) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-md text-xs">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

interface WorkerRouteMapProps {
  stops: RouteStop[];
  onMarkerClick?: (stopId: string) => void;
}

export default function WorkerRouteMap({ stops, onMarkerClick }: WorkerRouteMapProps) {
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // If no stops, no route to calculate
    if (stops.length === 0) {
      setLoading(false);
      return;
    }

    const calculate = async (loc: { lat: number; lng: number }) => {
      setLoading(true);
      try {
        const result = await routeService.getOptimizedRoute(loc, stops);
        setRouteResult(result);
      } catch (err) {
        console.error('Routing error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLoc(loc);
          calculate(loc);
        },
        () => {
          // Fallback to the first stop if location denied
          const fallbackLoc = { lat: stops[0].latitude, lng: stops[0].longitude };
          setUserLoc(fallbackLoc);
          calculate(fallbackLoc);
        }
      );
    } else {
      const fallbackLoc = { lat: stops[0].latitude, lng: stops[0].longitude };
      setUserLoc(fallbackLoc);
      calculate(fallbackLoc);
    }
  }, [stops]);

  if (loading) {
    return (
      <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse flex items-center justify-center border border-slate-200 dark:border-slate-700">
        <Navigation className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (stops.length === 0 || !routeResult) {
    return (
      <div className="h-96 bg-slate-50 dark:bg-slate-850 rounded-3xl flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-700 text-center p-6">
        <MapPin className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
        <p className="text-sm font-bold text-slate-500">No active routes available</p>
        <p className="text-xs text-slate-400 mt-1">There are no open or in-progress reports to route.</p>
      </div>
    );
  }

  const mapCenter = userLoc || { lat: stops[0].latitude, lng: stops[0].longitude };
  
  // Create Polyline positions starting from user location through ordered stops
  const polylinePositions: [number, number][] = userLoc 
    ? [[userLoc.lat, userLoc.lng], ...routeResult.orderedStops.map(s => [s.latitude, s.longitude] as [number, number])]
    : routeResult.orderedStops.map(s => [s.latitude, s.longitude] as [number, number]);

  return (
    <div className="space-y-3">
      {/* Route Stats */}
      <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 p-3 rounded-2xl">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
          <Navigation className="w-4 h-4 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">Optimized Route</span>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <span className="block text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase">Distance</span>
            <span className="text-sm font-black text-indigo-800 dark:text-indigo-200">{routeResult.totalDistanceKm.toFixed(1)} km</span>
          </div>
          <div className="text-right">
            <span className="block text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase">Est. Time</span>
            <span className="text-sm font-black text-indigo-800 dark:text-indigo-200 flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" />
              {routeResult.estimatedTimeMinutes} min
            </span>
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="h-96 w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative z-0">
        <MapContainer 
          center={[mapCenter.lat, mapCenter.lng]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User Location Marker */}
          {userLoc && (
            <Marker position={[userLoc.lat, userLoc.lng]}>
              <Popup>
                <div className="text-center font-bold">Your Start Location</div>
              </Popup>
            </Marker>
          )}

          {/* Ordered Stops */}
          {routeResult.orderedStops.map((stop, index) => (
            <Marker 
              key={stop.id} 
              position={[stop.latitude, stop.longitude]}
              icon={createNumberedIcon(index + 1)}
              eventHandlers={{
                click: () => onMarkerClick && onMarkerClick(stop.id)
              }}
            >
              <Popup>
                <div className="text-center">
                  <div className="text-xs font-bold mb-1">Stop {index + 1}</div>
                  <div className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-slate-100 mb-1 inline-block">
                    {stop.category}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Polyline Path */}
          <Polyline 
            positions={polylinePositions} 
            color="#4f46e5" 
            weight={4} 
            opacity={0.7} 
            dashArray="10, 10" 
          />
        </MapContainer>
      </div>
    </div>
  );
}
