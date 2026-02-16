
import { GoogleGenAI, Type } from "@google/genai";
import { TransportMode, SearchResult, Departure, SearchOptions } from "../types.ts";
import { SUGGESTIONS } from "../data/suggestions.ts";

// Caches pour éviter les appels inutiles
let sncbStationsCache: any[] = [];
const apiCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 60 * 1000; // 60 secondes

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

/**
 * Robust retry with exponential backoff for 429 errors
 */
const callWithRetry = async (fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 429;
    if (retries > 0 && isRateLimit) {
      console.warn(`Quota atteint. Nouvelle tentative dans ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

/**
 * Searches for stops/stations.
 * Prioritizes local suggestions to save API quota.
 */
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
      // Use process.env.API_KEY directly for client initialization as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Trouve les noms officiels des arrêts du réseau ${mode} en Belgique correspondant à "${query}".`,
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
  const cacheKey = `sncb-${query}-${arrivalQuery || 'none'}-${options?.time || 'now'}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const date = options ? formatIRailDate(options.date) : '';
  const time = options ? formatIRailTime(options.time) : '';
  
  let url = '';
  if (arrivalQuery) {
    url = `https://api.irail.be/v1/connections/?from=${encodeURIComponent(query)}&to=${encodeURIComponent(arrivalQuery)}&date=${date}&time=${time}&format=json&lang=fr`;
  } else {
    url = `https://api.irail.be/v1/liveboard/?station=${encodeURIComponent(query)}&date=${date}&time=${time}&format=json&lang=fr`;
  }

  const response = await fetch(url);
  const data = await response.json();
  let result: SearchResult = { departures: [], sources: [] };

  if (data.connection) {
    result = {
      departures: data.connection.map((c: any, i: number) => ({
        id: `conn-${i}`,
        line: c.departure.vehicle.split('.').pop(),
        destination: c.arrival.station,
        time: new Date(parseInt(c.departure.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        delay: parseInt(c.departure.delay) > 0 ? `+${Math.floor(c.departure.delay / 60)} min` : null,
        platform: c.departure.platform,
        status: c.departure.canceled === "1" ? 'cancelled' : parseInt(c.departure.delay) > 0 ? 'delayed' : 'ontime'
      })),
      sources: [{ title: 'iRail API (Open Data)', uri: 'https://irail.be' }]
    };
  } else if (data.departures) {
    result = {
      departures: data.departures.departure.map((d: any) => ({
        id: d.id,
        line: d.vehicle.split('.').pop(),
        destination: d.station,
        time: new Date(parseInt(d.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        delay: parseInt(d.delay) > 0 ? `+${Math.floor(d.delay / 60)} min` : null,
        platform: d.platform,
        status: d.canceled === "1" ? 'cancelled' : parseInt(d.delay) > 0 ? 'delayed' : 'ontime'
      })),
      sources: [{ title: 'iRail API (Open Data)', uri: 'https://irail.be' }]
    };
  }

  setCachedData(cacheKey, result);
  return result;
};

const fetchSmartData = async (query: string, mode: TransportMode, options?: SearchOptions): Promise<SearchResult> => {
  const cacheKey = `smart-${mode}-${query}-${options?.time || 'now'}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const result = await callWithRetry(async () => {
    // Use process.env.API_KEY directly for client initialization as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const dateTimeStr = options ? `le ${options.date} à ${options.time}` : 'maintenant';
    const officialSource = mode === TransportMode.STIB ? 'stib-mivb.be' : 'delijn.be';
    
    const systemInstruction = `Extract real-time departures for ${mode} at stop "${query}" for ${dateTimeStr}. Use official site ${officialSource}. Return JSON only.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Prochains passages officiels en temps réel à l'arrêt ${query} (${mode}) via ${officialSource} pour ${dateTimeStr}.`,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const data = JSON.parse(response.text || "{}");
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = [{ title: `Portail Officiel ${mode}`, uri: mode === TransportMode.STIB ? 'https://www.stib-mivb.be' : 'https://www.delijn.be' }];
    
    groundingChunks.forEach(chunk => {
      if (chunk.web && !sources.some(s => s.uri === chunk.web?.uri)) {
        sources.push({ title: chunk.web.title || 'Source temps réel', uri: chunk.web.uri || '' });
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
  if (mode === TransportMode.SNCB) {
    return fetchSNCBData(query, arrivalQuery, options);
  } else {
    return fetchSmartData(query, mode, options);
  }
};
