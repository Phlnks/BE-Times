
import { GoogleGenAI, Type } from "@google/genai";
import { TransportMode, SearchResult, Departure, SearchOptions } from "../types";

// Cache for SNCB stations to avoid redundant heavy fetches
let sncbStationsCache: any[] = [];

const formatIRailDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-');
  return `${d}${m}${y.slice(2)}`;
};

const formatIRailTime = (timeStr: string) => {
  return timeStr.replace(':', '');
};

/**
 * Helper to perform API calls with a simple retry logic for 429 errors
 */
const callWithRetry = async (fn: () => Promise<any>, retries = 2, delay = 1000): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && error?.message?.includes('429')) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

/**
 * Searches for stops/stations.
 * Uses iRail for SNCB and Gemini (targeting official lists) for others.
 */
export const searchStops = async (query: string, mode: TransportMode): Promise<string[]> => {
  if (!query || query.length < 2) return [];

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
      console.error("SNCB stations fetch error", e);
      return [];
    }
  } else {
    return callWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Trouve les noms officiels des arrêts du réseau ${mode} en Belgique correspondant à "${query}". 
        Utilise les données officielles de ${mode === TransportMode.STIB ? 'mivb.be' : 'delijn.be'}.
        Retourne uniquement un tableau JSON de strings.`,
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
  }
};

/**
 * Fetches real-time departures from iRail (SNCB).
 */
const fetchSNCBData = async (query: string, arrivalQuery?: string, options?: SearchOptions): Promise<SearchResult> => {
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

  if (data.connection) {
    const departures: Departure[] = data.connection.map((c: any, i: number) => ({
      id: `conn-${i}`,
      line: c.departure.vehicle.split('.').pop(),
      destination: c.arrival.station,
      time: new Date(parseInt(c.departure.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      delay: parseInt(c.departure.delay) > 0 ? `+${Math.floor(c.departure.delay / 60)} min` : null,
      platform: c.departure.platform,
      status: c.departure.canceled === "1" ? 'cancelled' : parseInt(c.departure.delay) > 0 ? 'delayed' : 'ontime'
    }));
    return { departures, sources: [{ title: 'iRail API (Open Data)', uri: 'https://irail.be' }] };
  } else if (data.departures) {
    const departures: Departure[] = data.departures.departure.map((d: any) => ({
      id: d.id,
      line: d.vehicle.split('.').pop(),
      destination: d.station,
      time: new Date(parseInt(d.time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      delay: parseInt(d.delay) > 0 ? `+${Math.floor(d.delay / 60)} min` : null,
      platform: d.platform,
      status: d.canceled === "1" ? 'cancelled' : parseInt(d.delay) > 0 ? 'delayed' : 'ontime'
    }));
    return { departures, sources: [{ title: 'iRail API (Open Data)', uri: 'https://irail.be' }] };
  }

  return { departures: [], sources: [] };
};

/**
 * Fetches real-time data for STIB and De Lijn using Gemini with Search Grounding.
 */
const fetchSmartData = async (query: string, mode: TransportMode, options?: SearchOptions): Promise<SearchResult> => {
  return callWithRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const dateTimeStr = options ? `le ${options.date} à ${options.time}` : 'maintenant';
    
    const officialSource = mode === TransportMode.STIB ? 'stib-mivb.be' : 'delijn.be';
    
    const systemInstruction = `
      Tu es un connecteur d'API virtuel pour les transports belges (${mode}).
      Ta mission est d'extraire les horaires en temps réel de l'arrêt "${query}" pour ${dateTimeStr}.
      Utilise Google Search pour consulter DIRECTEMENT le portail temps réel officiel de ${officialSource}.
      Retourne uniquement un JSON.
      
      Structure :
      {
        "departures": [
          {
            "id": "string",
            "line": "string",
            "destination": "string",
            "time": "HH:mm",
            "delay": "string" ou null,
            "status": "ontime" | "delayed" | "cancelled"
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Donne-moi les prochains passages officiels en temps réel à l'arrêt ${query} (${mode}) via le site ${officialSource} pour ${dateTimeStr}.`,
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
