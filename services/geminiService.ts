
import { GoogleGenAI, Type } from "@google/genai";
import { TransportMode, SearchResult, Departure } from "../types";

export const fetchRealTimeData = async (
  query: string,
  mode: TransportMode,
  destinationQuery?: string
): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    Tu es un assistant spécialisé dans les transports en commun en Belgique.
    Retourne TOUJOURS un objet JSON valide.
    {
      "departures": [
        {
          "id": "unique_id",
          "line": "IC, S, P, Bus 48, etc.",
          "destination": "nom",
          "time": "HH:mm",
          "delay": "+X min" ou null,
          "platform": "numéro" ou null,
          "status": "ontime" | "delayed" | "cancelled"
        }
      ]
    }
  `;

  const prompt = destinationQuery 
    ? `Donne-moi les prochains départs de ${query} vers ${destinationQuery} via le réseau ${mode}.`
    : `Donne-moi les prochains départs en temps réel pour ${query} via le réseau ${mode}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web?.title || 'Source',
        uri: chunk.web?.uri || ''
      }));

    return {
      departures: data.departures || [],
      sources: sources
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
