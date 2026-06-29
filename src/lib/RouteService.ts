export interface RouteStop {
  id: string;
  latitude: number;
  longitude: number;
  status: string;
  [key: string]: any;
}

export interface RouteResult {
  orderedStops: RouteStop[];
  totalDistanceKm: number;
  estimatedTimeMinutes: number;
}

export interface IRouteEngine {
  calculateRoute(currentLocation: { lat: number; lng: number }, stops: RouteStop[]): Promise<RouteResult>;
}

// Simple geometric routing engine using Haversine distance and Nearest Neighbor algorithm
export class SimpleRouteEngine implements IRouteEngine {
  private getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async calculateRoute(currentLocation: { lat: number; lng: number }, stops: RouteStop[]): Promise<RouteResult> {
    if (stops.length === 0) {
      return { orderedStops: [], totalDistanceKm: 0, estimatedTimeMinutes: 0 };
    }

    const unvisited = [...stops];
    const orderedStops: RouteStop[] = [];
    let currentLat = currentLocation.lat;
    let currentLng = currentLocation.lng;
    let totalDistanceKm = 0;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = this.getDistance(currentLat, currentLng, unvisited[i].latitude, unvisited[i].longitude);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      const nearestStop = unvisited[nearestIndex];
      orderedStops.push(nearestStop);
      totalDistanceKm += minDistance;
      
      currentLat = nearestStop.latitude;
      currentLng = nearestStop.longitude;
      
      unvisited.splice(nearestIndex, 1);
    }

    // Assume average city driving speed of 30 km/h (0.5 km/min) + 5 mins per stop overhead
    const travelTimeMinutes = totalDistanceKm * 2;
    const stopTimeMinutes = stops.length * 5;

    return {
      orderedStops,
      totalDistanceKm,
      estimatedTimeMinutes: Math.round(travelTimeMinutes + stopTimeMinutes)
    };
  }
}

export class RouteService {
  private engine: IRouteEngine;

  constructor(engine: IRouteEngine = new SimpleRouteEngine()) {
    this.engine = engine;
  }

  public setEngine(engine: IRouteEngine) {
    this.engine = engine;
  }

  public async getOptimizedRoute(currentLocation: { lat: number; lng: number }, stops: RouteStop[]): Promise<RouteResult> {
    return this.engine.calculateRoute(currentLocation, stops);
  }
}

export const routeService = new RouteService();
