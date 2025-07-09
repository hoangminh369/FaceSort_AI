import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Simple wrapper around Google Generative AI SDK.
 * Requires env var GOOGLE_GENAI_API_KEY.
 */
class GoogleAiService {
  private client: GoogleGenerativeAI | null = null;

  private getClient() {
    if (!this.client) {
      const apiKey = process.env.GOOGLE_GENAI_API_KEY;
      if (!apiKey) {
        throw new Error("Missing GOOGLE_GENAI_API_KEY env variable");
      }
      this.client = new GoogleGenerativeAI(apiKey);
    }
    return this.client;
  }

  async generateChatResponse(prompt: string, history: { role: "user" | "model"; parts: string }[] = []) {
    try {
      const modelId = process.env.GEMINI_MODEL_ID || 'gemini-1.5-pro';
      const model = this.getClient().getGenerativeModel({ model: modelId });
      // Optional: log once for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[GoogleAiService] Using Gemini model: ${modelId}`);
      }

      const contents = [
        ...history.map(h => ({ role: h.role, parts: [{ text: h.parts }] })),
        { role: 'user', parts: [{ text: prompt }] }
      ];

      const result = await model.generateContent({ contents });
      return result.response.text();
    } catch (err: any) {
      // Log full error details for server-side debugging
      console.error('[GoogleAiService] generateChatResponse error:', err);

      // Provide more user-friendly error messages to upstream callers
      const rawMsg = typeof err?.message === 'string' ? err.message : '';
      const msg = rawMsg.toLowerCase();

      if (msg.includes('missing google_genai_api_key')) {
        throw new Error('AI service not configured. Please set GOOGLE_GENAI_API_KEY on the server.');
      }

      if (msg.includes('permission') || msg.includes('401') || msg.includes('unauthorized')) {
        throw new Error('Invalid or unauthorized Google GenAI API key.');
      }

      if (msg.includes('quota') || msg.includes('rate') || msg.includes('exceed')) {
        throw new Error('Google AI quota exceeded. Please try again later.');
      }

      // Generic fallback
      throw new Error('Google AI service is currently unavailable.');
    }
  }
}

export default new GoogleAiService(); 