import { registerPlugin } from '@capacitor/core';

export interface GenAIPlugin {
  isModelReady(options: { filename?: string }): Promise<{ exists: boolean }>;
  downloadModel(options: { url: string, filename: string }): Promise<{ success: boolean }>;
  deleteModel(): Promise<{ success: boolean }>;
  generateResponse(options: { prompt: string }): Promise<{ response: string }>;
}

// 👇 This tells Capacitor: "Look for the Java/Kotlin code named 'GenAI'"
const GenAI = registerPlugin<GenAIPlugin>('GenAI');

export default GenAI;