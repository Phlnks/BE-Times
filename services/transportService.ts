
import { TransportMode, SearchResult, Departure, SearchOptions, TripLeg } from "../types.ts";
import { SUGGESTIONS } from "../data/suggestions.ts";

const apiCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 30 * 1000;

const getCachedData = (key: string) => {
  const cached = apiCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;
  return null;
};

const setCachedData = (key: string, data: any) => {
  apiCache[key] = { data, timestamp: Date.now() };
};

/**
 * Autocomplete logic (SNCB Only)
 */
export const searchStops = async (query: string, mode: TransportMode): Promise<string[]> => {
  if (!query || query.length < 2) return [];

  try {
    const res = await fetch(`https://api.irail.be/v1/stations/?format=json&lang=fr`);
    const data = await res.json();
    return (data.station || [])
      .filter((s: any) => s.name.toLowerCase().includes(query.toLowerCase()))
      .map((s: any) => s.name)
      .slice(0, 8);
  } catch (e) {
    return (SUGGESTIONS[mode] || []).filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  }
};

/**
 * SNCB Data Fetcher (iRail)
 */
const fetchSNCBData = async (query: string, arrivalQuery?: string, options?: SearchOptions): Promise<SearchResult> => {
  const formatIRailDate = (d: string) => d.split('-').reverse().join('').slice(0, 4) + d.split('-')[0].slice(2);
  const formatIRailTime = (t: string) => t.replace(':', '');
  
  const date = options ? formatIRailDate(options.date) : '';
  const time = options ? formatIRailTime(options.time) : '';
  
  let url = arrivalQuery?.trim() 
    ? `https://api.irail.be/v1/connections/?from=${encodeURIComponent(query)}&to=${encodeURIComponent(arrivalQuery)}&date=${date}&time=${time}&format=json&lang=fr`
    : `https://api.irail.be/v1/liveboard/?station=${encodeURIComponent(query)}&date=${date}&time=${time}&format=json&lang=fr`;

  const response = await fetch(url);
  const data = await response.json();
  const departures: Departure[] = [];

  if (data.connection) {
    data.connection.forEach((c: any, i: number) => {
      const legs: TripLeg[] = [];
      const addLeg = (legData: any, target: string, arrTime: string) => {
        legs.push({
          line: legData.vehicle.split('.').pop(),
          departureStation: legData.station,
          departureTime: new Date(parseInt(legData.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          arrivalStation: target,
          arrivalTime: arrTime,
          platform: legData.platform,
          delay: parseInt(legData.delay) > 0 ? `+${Math.floor(legData.delay / 60)} min` : null
        });
      };

      const finalDestTime = new Date(parseInt(c.arrival.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      
      // Premier train
      addLeg(c.departure, c.vias?.via ? c.vias.via[0].station : c.arrival.station, c.vias?.via ? new Date(parseInt(c.vias.via[0].arrival.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : finalDestTime);

      // Trains suivants si correspondance
      if (c.vias?.via) {
        c.vias.via.forEach((v: any, idx: number) => {
          const nextTarget = c.vias.via[idx + 1] ? c.vias.via[idx + 1].station : c.arrival.station;
          const nextArrTime = c.vias.via[idx + 1] ? new Date(parseInt(c.vias.via[idx + 1].arrival.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : finalDestTime;
          addLeg(v, nextTarget, nextArrTime);
        });
      }

      departures.push({
        id: `sncb-conn-${i}`,
        line: legs.length > 1 ? `Correspondance` : legs[0].line,
        destination: c.arrival.station,
        time: legs[0].departureTime,
        arrivalTime: finalDestTime,
        delay: legs[0].delay,
        platform: legs[0].platform,
        status: c.departure.canceled === "1" ? 'cancelled' : parseInt(c.departure.delay) > 0 ? 'delayed' : 'ontime',
        legs
      });
    });
  } else if (data.departures) {
    data.departures.departure.forEach((d: any) => {
      departures.push({
        id: d.id,
        line: d.vehicle.split('.').pop(),
        destination: d.station,
        time: new Date(parseInt(d.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        delay: parseInt(d.delay) > 0 ? `+${Math.floor(d.delay / 60)} min` : null,
        platform: d.platform,
        status: d.canceled === "1" ? 'cancelled' : parseInt(d.delay) > 0 ? 'delayed' : 'ontime'
      });
    });
  }

  return { departures, sources: [{ title: 'iRail / SNCB Official', uri: 'https://irail.be' }] };
};

export const fetchTransportData = async (
  query: string,
  mode: TransportMode,
  arrivalQuery?: string,
  options?: SearchOptions
): Promise<SearchResult> => {
  const cacheKey = `sncb-${query}-${arrivalQuery || 'none'}-${options?.date}-${options?.time}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const result = await fetchSNCBData(query, arrivalQuery, options);
  setCachedData(cacheKey, result);
  return result;
};
