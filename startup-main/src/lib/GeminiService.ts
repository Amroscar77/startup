import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Message {
  role: 'user' | 'model';
  text: string;
  grounding?: any[];
}

export const GeminiService = {
  async chat(history: Message[], userPrompt: string, location?: { lat: number, lng: number }) {
    // Determine model based on prompt complexity or speed requirement
    // For general shopping queries with Maps, use flash
    let model = "gemini-3-flash-preview";
    
    // If prompt seems complex (e.g., asking for detailed analysis or comparison), use pro
    if (userPrompt.length > 200 || userPrompt.toLowerCase().includes('analyze') || userPrompt.toLowerCase().includes('compare')) {
      model = "gemini-3.1-pro-preview";
    }

    // If it's a very simple greeting or short query, use flash-lite for speed
    if (userPrompt.length < 20 && !userPrompt.toLowerCase().includes('store') && !userPrompt.toLowerCase().includes('price')) {
      model = "gemini-3.1-flash-lite-preview";
    }

    const contents = history.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }]
    });

    const config: any = {
      systemInstruction: "You are 'PricePal', an expert shopping assistant for the Price Tracker app. You help users find the best deals, compare prices, and locate nearby stores. You have access to Google Maps to provide real-time store information. Be helpful, concise, and professional. If the user asks for stores or locations, use the Google Maps tool.",
      tools: [{ googleMaps: {} }],
    };

    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: location.lat,
            longitude: location.lng
          }
        }
      };
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config
      });

      return {
        text: response.text || "I'm sorry, I couldn't process that request.",
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (error) {
      console.error("Gemini Error:", error);
      throw error;
    }
  },

  async getSmartAdvice(history: any[]) {
    // Use gemini-3.1-pro-preview for complex analysis
    const model = "gemini-3.1-pro-preview";
    const prompt = `Based on this price history: ${JSON.stringify(history)}, give me a 1-sentence smart advice on whether to buy now or wait.`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: "You are a data analyst. Provide a single, punchy sentence of advice."
        }
      });
      return response.text;
    } catch (error) {
      return "Wait for a better deal.";
    }
  }
};
