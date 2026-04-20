import { GoogleGenAI } from "@google/genai";
import { Task, AIOptimization } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function optimizeSchedule(tasks: Task[]): Promise<AIOptimization> {
  const model = "gemini-3-flash-preview";
  
  const scheduleStr = tasks.map(t => 
    `- ${t.startTime} to ${t.endTime}: ${t.title} (${t.category})`
  ).join('\n');

  const prompt = `
    You are an expert productivity coach. Analyze the following daily schedule and provide optimization suggestions.
    Identify where time can be saved, where the user can be faster, and potential bottlenecks.
    Also, suggest why they might struggle with certain tasks based on the density or timing.

    Schedule:
    ${scheduleStr}

    Return the response in strict JSON format with the following structure:
    {
      "suggestions": ["string"],
      "timeSavedEstimate": "string (e.g. '45 mins')",
      "efficiencyScore": number (0-100),
      "bottlenecks": ["string"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Optimization failed:", error);
    return {
      suggestions: ["Could not generate suggestions at this time."],
      timeSavedEstimate: "0 mins",
      efficiencyScore: 0,
      bottlenecks: ["AI service unavailable"]
    };
  }
}

export async function analyzeObstacles(task: Task, reason: string): Promise<string> {
  const model = "gemini-3-flash-preview";
  const prompt = `
    The user failed to complete the task "${task.title}" (${task.startTime}-${task.endTime}).
    Their reason: "${reason}".
    Provide a concise, encouraging, and psychological insight into why this happened and how to overcome it next time.
    Keep it under 3 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "Keep pushing forward!";
  } catch (error) {
    return "Don't be too hard on yourself. Every day is a new opportunity.";
  }
}
