import { GoogleGenAI } from "@google/genai";

const getApiKey = (): string => {
  if ((import.meta as any).env?.VITE_GEMINI_API_KEY) return (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (typeof process !== 'undefined' && (process.env as any)?.GEMINI_API_KEY) return (process.env as any).GEMINI_API_KEY;
  return '';
};

const getAI = () => new GoogleGenAI({ apiKey: getApiKey() });

export interface Message {
  role: 'user' | 'model';
  text: string;
  grounding?: any[];
}

export const GeminiService = {
  async chat(history: Message[], userPrompt: string, location?: { lat: number; lng: number }) {
    const ai = getAI();
    let model = 'gemini-2.0-flash';
    if (userPrompt.length > 200 || userPrompt.toLowerCase().includes('analyze') || userPrompt.toLowerCase().includes('compare')) {
      model = 'gemini-2.5-pro-preview-06-05';
    } else if (userPrompt.length < 20) {
      model = 'gemini-2.0-flash-lite';
    }

    const contents = history.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    contents.push({ role: 'user', parts: [{ text: userPrompt }] });

    const config: any = {
      systemInstruction: "You are 'PricePal', an expert shopping assistant for the Editorial Market price tracker app in Egypt. You help users find the best deals, compare prices, and locate nearby stores. Be helpful, concise, and professional. Always respond in the same language the user writes in.",
      tools: [{ googleSearch: {} }],
    };

    if (location) {
      config.toolConfig = {
        retrievalConfig: { latLng: { latitude: location.lat, longitude: location.lng } },
      };
    }

    try {
      const response = await ai.models.generateContent({ model, contents, config });
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      return {
        text: response.text || "I'm sorry, I couldn't process that request.",
        groundingChunks,
      };
    } catch (error: any) {
      console.error('Gemini Error:', error);
      throw error;
    }
  },

  async getSmartAdvice(recentData: any[]): Promise<string> {
    const ai = getAI();
    if (!recentData || recentData.length === 0) return 'Add some prices to get smart insights!';
    const summary = recentData.slice(0, 10).map(d => ({ item: d.itemName, price: d.price, currency: d.currency, store: d.storeName }));
    const prompt = `Recent Cairo market prices: ${JSON.stringify(summary)}. Give ONE punchy shopping tip. Max 20 words. No disclaimers.`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: { systemInstruction: 'You are a data analyst. One sentence shopping advice only.' },
      });
      return response.text?.trim() || 'Great prices available now — explore the market!';
    } catch {
      return 'Great prices available now — explore the market!';
    }
  },
};
