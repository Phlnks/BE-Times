
import { GoogleGenAI, Type } from "@google/genai";
import { TransportMode, SearchResult, Departure, SearchOptions, TripLeg } from "../types.ts";
import { SUGGESTIONS } from "../data/suggestions.ts";

let sncbStationsCache: any[] = [];
const apiCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 60 * 1000;

const getCachedData = (key: string) => {
  const cached = apiCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  apiCache[key] = { data, timestamp: Date.now() };
};

const formatIRailDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-');
  return `${d}${m}${y.slice(2)}`;
};

const formatIRailTime = (timeStr: string) => {
  return timeStr.replace(':', '');
};

const callWithRetry = async (fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 429;
    if (retries > 0 && isRateLimit) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const searchStops = async (query: string, mode: TransportMode): Promise<string[]> => {
  if (!query || query.length < 2) return [];

  const localMatches = (SUGGESTIONS[mode] || [])
    .filter(s => s.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  if (localMatches.length >= 5) return localMatches;

  if (mode === TransportMode.SNCB) {
    try {
      if (sncbStationsCache.length === 0) {
        const res = await fetch('https://api.irail.be/v1/stations/?format=json&lang=fr');
        const data = await res.json();
        sncbStationsCache = data.station || [];
      }
      return sncbStationsCache
        .filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
        .map(s => s.name)
        .slice(0, 8);
    } catch (e) {
      return localMatches;
    }
  } 
  
  const cacheKey = `search-${mode}-${query.toLowerCase()}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const results = await callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Trouve les noms officiels des arrêts du réseau ${mode} en Belgique correspondant à "${query}". Retourne uniquement un tableau JSON de chaînes de caractères.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
      });
      return JSON.parse(response.text || "[]");
    });
    setCachedData(cacheKey, results);
    return results;
  } catch (e) {
    return localMatches;
  }
};

const fetchSNCBData = async (query: string, arrivalQuery?: string, options?: SearchOptions): Promise<SearchResult> => {
  const cacheKey = `sncb-${query}-${arrivalQuery || 'none'}-${options?.date || 'today'}-${options?.time || 'now'}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const date = options ? formatIRailDate(options.date) : '';
  const time = options ? formatIRailTime(options.time) : '';
  
  let url = '';
  if (arrivalQuery && arrivalQuery.trim() !== '') {
    url = `https://api.irail.be/v1/connections/?from=${encodeURIComponent(query)}&to=${encodeURIComponent(arrivalQuery)}&date=${date}&time=${time}&format=json&lang=fr&timesel=departure`;
  } else {
    url = `https://api.irail.be/v1/liveboard/?station=${encodeURIComponent(query)}&date=${date}&time=${time}&format=json&lang=fr`;
  }

  const response = await fetch(url);
  const data = await response.json();
  let result: SearchResult = { departures: [], sources: [{ title: 'iRail API (Open Data)', uri: 'https://irail.be' }] };

  if (data.connection) {
    result.departures = data.connection.map((c: any, i: number) => {
      const legs: TripLeg[] = [];
      
      // Premier train
      legs.push({
        line: c.departure.vehicle.split('.').pop(),
        departureStation: c.departure.station,
        departureTime: new Date(parseInt(c.departure.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        arrivalStation: c.vias?.via ? c.vias.via[0].station : c.arrival.station,
        arrivalTime: c.vias?.via ? new Date(parseInt(c.vias.via[0].arrival.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : new Date(parseInt(c.arrival.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        platform: c.departure.platform,
        delay: parseInt(c.departure.delay) > 0 ? `+${Math.floor(c.departure.delay / 60)} min` : null
      });

      // Trains intermédiaires
      if (c.vias?.via) {
        c.vias.via.forEach((v: any, idx: number) => {
          const nextTarget = c.vias.via[idx + 1] ? c.vias.via[idx + 1].station : c.arrival.station;
          const nextTime = c.vias.via[idx + 1] ? new Date(parseInt(c.vias.via[idx + 1].arrival.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : new Date(parseInt(c.arrival.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          
          legs.push({
            line: v.vehicle.split('.').pop(),
            departureStation: v.station,
            departureTime: new Date(parseInt(v.departure.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            arrivalStation: nextTarget,
            arrivalTime: nextTime,
            platform: v.departure.platform,
            delay: parseInt(v.departure.delay) > 0 ? `+${Math.floor(v.departure.delay / 60)} min` : null
          });
        });
      }

      return {
        id: `conn-${i}`,
        line: legs.length > 1 ? `${legs.length} trains` : legs[0].line,
        destination: c.arrival.station,
        time: legs[0].departureTime,
        arrivalTime: new Date(parseInt(c.arrival.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        delay: legs[0].delay,
        platform: legs[0].platform,
        status: c.departure.canceled === "1" ? 'cancelled' : parseInt(c.departure.delay) > 0 ? 'delayed' : 'ontime',
        legs: legs
      };
    });
  } else if (data.departures) {
    result.departures = data.departures.departure.map((d: any) => ({
      id: d.id,
      line: d.vehicle.split('.').pop(),
      destination: d.station,
      time: new Date(parseInt(d.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      delay: parseInt(d.delay) > 0 ? `+${Math.floor(d.delay / 60)} min` : null,
      platform: d.platform,
      status: d.canceled === "1" ? 'cancelled' : parseInt(d.delay) > 0 ? 'delayed' : 'ontime'
    }));
  }

  setCachedData(cacheKey, result);
  return result;
};

const fetchSmartData = async (query: string, mode: TransportMode, arrivalQuery?: string, options?: SearchOptions): Promise<SearchResult> => {
  const cacheKey = `smart-${mode}-${query}-${arrivalQuery || 'any'}-${options?.date || 'today'}-${options?.time || 'now'}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const result = await callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const dateTimeStr = options ? `le ${options.date} à ${options.time}` : 'maintenant';
    const officialSource = mode === TransportMode.STIB ? 'stib-mivb.be' : 'delijn.be';
    const destinationPart = arrivalQuery && arrivalQuery.trim() !== '' ? ` en direction de "${arrivalQuery}"` : '';
    
    const systemInstruction = `Tu es un expert des transports ${mode} en Belgique.
Extrais les prochains passages RÉELS à l'arrêt "${query}"${destinationPart} pour ${dateTimeStr}.
IMPORTANT: Si tu ne trouves pas de données précises, fais une recherche web approfondie sur ${officialSource}.
RETOURNE UNIQUEMENT DU JSON PUR au format suivant:
{
  "departures": [
    {
      "id": "string",
      "line": "numéro de ligne",
      "destination": "destination finale",
      "time": "HH:mm",
      "delay": "string ou null",
      "status": "ontime" | "delayed" | "cancelled"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Donne-moi les horaires en temps réel pour l'arrêt ${query}${destinationPart} sur le réseau ${mode} pour ${dateTimeStr}. Utilise ${officialSource} comme référence principale.`,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("Erreur de parsing JSON AI:", rawText);
      throw new Error("Format de réponse invalide");
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = [{ title: `Portail Officiel ${mode}`, uri: mode === TransportMode.STIB ? 'https://www.stib-mivb.be' : 'https://www.delijn.be' }];
    
    groundingChunks.forEach(chunk => {
      if (chunk.web && !sources.some(s => s.uri === chunk.web?.uri)) {
        sources.push({ title: chunk.web.title || 'Source vérifiée', uri: chunk.web.uri || '' });
      }
    });

    return { departures: data.departures || [], sources };
  });

  setCachedData(cacheKey, result);
  return result;
};

export const fetchTransportData = async (
  query: string,
  mode: TransportMode,
  arrivalQuery?: string,
  options?: SearchOptions
): Promise<SearchResult> => {
  try {
    if (mode === TransportMode.SNCB) {
      return await fetchSNCBData(query, arrivalQuery, options);
    } else {
      return await fetchSmartData(query, mode, arrivalQuery, options);
    }
  } catch (err) {
    console.error(`Erreur fetchTransportData (${mode}):`, err);
    throw err;
  }
};
