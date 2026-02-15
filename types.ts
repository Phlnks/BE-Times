
export enum TransportMode {
  SNCB = 'SNCB',
  STIB = 'STIB',
  DeLijn = 'De Lijn'
}

export interface Departure {
  id: string;
  line: string;
  destination: string;
  time: string;
  delay: string | null;
  platform?: string;
  status: 'ontime' | 'delayed' | 'cancelled';
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
