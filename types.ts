
export enum TransportMode {
  SNCB = 'SNCB',
  STIB = 'STIB',
  DeLijn = 'De Lijn'
}

export interface TripLeg {
  line: string;
  departureStation: string;
  departureTime: string;
  arrivalStation: string;
  arrivalTime: string;
  platform?: string;
  delay?: string | null;
}

export interface Departure {
  id: string;
  line: string;
  destination: string;
  time: string;
  delay: string | null;
  platform?: string;
  status: 'ontime' | 'delayed' | 'cancelled';
  arrivalTime?: string; // Pour les trajets complets
  legs?: TripLeg[];    // Pour les correspondances
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface SearchResult {
  departures: Departure[];
  sources: GroundingSource[];
}

export interface SearchOptions {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

export interface Favorite {
  id: string;
  mode: TransportMode;
  from: string;
  to?: string;
}
