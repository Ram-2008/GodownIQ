import { GoogleGenAI } from "@google/genai";
import { env } from "./env";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

export function extractJsonBlock(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/[[{][\s\S]*[}\]]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
