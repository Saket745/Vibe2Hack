export interface City {
  id: number;
  name: string;
  state: string;
  country: string;
}

export interface Ward {
  id: number;
  city_id: number;
  name: string;
  boundary_coords?: {
    center: { lat: number; lng: number };
  };
}

class LocationServiceImpl {
  private readonly CITIES_STORAGE_KEY = 'mock_db_cities';
  private readonly WARDS_STORAGE_KEY = 'mock_db_wards';

  private defaultCities: City[] = [
    { id: 1, name: 'Bengaluru', state: 'Karnataka', country: 'India' },
    { id: 2, name: 'Mumbai', state: 'Maharashtra', country: 'India' }
  ];

  private defaultWards: Ward[] = [
    { id: 1, city_id: 1, name: 'Ward 1 - Downtown', boundary_coords: { center: { lat: 12.9716, lng: 77.5946 } } },
    { id: 2, city_id: 1, name: 'Ward 2 - Koramangala', boundary_coords: { center: { lat: 12.9352, lng: 77.6245 } } },
    { id: 3, city_id: 1, name: 'Ward 3 - Indiranagar', boundary_coords: { center: { lat: 12.9719, lng: 77.6412 } } },
    { id: 4, city_id: 1, name: 'Ward 4 - Jayanagar', boundary_coords: { center: { lat: 12.9308, lng: 77.5838 } } },
    { id: 5, city_id: 1, name: 'Ward 5 - Whitefield', boundary_coords: { center: { lat: 12.9698, lng: 77.7500 } } },
    { id: 6, city_id: 2, name: 'Ward 1 - Bandra', boundary_coords: { center: { lat: 19.0596, lng: 72.8295 } } },
    { id: 7, city_id: 2, name: 'Ward 2 - Andheri', boundary_coords: { center: { lat: 19.1136, lng: 72.8697 } } }
  ];

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem(this.CITIES_STORAGE_KEY)) {
        localStorage.setItem(this.CITIES_STORAGE_KEY, JSON.stringify(this.defaultCities));
      }
      if (!localStorage.getItem(this.WARDS_STORAGE_KEY)) {
        localStorage.setItem(this.WARDS_STORAGE_KEY, JSON.stringify(this.defaultWards));
      }
    }
  }

  public getCities(): City[] {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(this.CITIES_STORAGE_KEY);
      return data ? JSON.parse(data) : this.defaultCities;
    }
    return this.defaultCities;
  }

  public getWards(): Ward[] {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(this.WARDS_STORAGE_KEY);
      return data ? JSON.parse(data) : this.defaultWards;
    }
    return this.defaultWards;
  }

  public getWardsForCity(cityId: number): Ward[] {
    return this.getWards().filter(w => w.city_id === cityId);
  }

  public getCityById(cityId: number): City | undefined {
    return this.getCities().find(c => c.id === cityId);
  }

  public getWardById(wardId: number): Ward | undefined {
    return this.getWards().find(w => w.id === wardId);
  }

  // Admin Methods
  public addCity(city: Omit<City, 'id'>): City {
    const cities = this.getCities();
    const newId = cities.length > 0 ? Math.max(...cities.map(c => c.id)) + 1 : 1;
    const newCity = { ...city, id: newId };
    cities.push(newCity);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.CITIES_STORAGE_KEY, JSON.stringify(cities));
    }
    return newCity;
  }

  public addWard(ward: Omit<Ward, 'id'>): Ward {
    const wards = this.getWards();
    const newId = wards.length > 0 ? Math.max(...wards.map(w => w.id)) + 1 : 1;
    const newWard = { ...ward, id: newId };
    wards.push(newWard);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.WARDS_STORAGE_KEY, JSON.stringify(wards));
    }
    return newWard;
  }
}

export const LocationService = new LocationServiceImpl();
