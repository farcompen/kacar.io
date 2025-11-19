import { GoogleGenAI } from "@google/genai";

// Initialize the client with the API key from the environment
// The environment variable process.env.API_KEY is guaranteed to be present.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateGameOverCommentary = async (
  nickname: string,
  score: number,
  killerName: string,
  timeAliveSeconds: number
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      You are a sarcastic and witty esports commentator for a game called "Cell.io" (similar to Agar.io).
      The player named "${nickname}" just died.
      
      Stats:
      - Score (Mass): ${score}
      - Killed by: "${killerName}"
      - Time Alive: ${timeAliveSeconds} seconds.

      Give a short, funny, 1-2 sentence commentary on their performance. 
      If the score is low (< 100), roast them for being tiny. 
      If the score is high (> 500), praise them but mock their tragic end.
      Don't use emojis.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "Better luck next time!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Connection to AI commentator lost... but you still lost the game.";
  }
};
