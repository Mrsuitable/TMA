import { Task, AIOptimization } from "../types";

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma3:latest";

interface OllamaGenerateResponse {
  response?: string;
  error?: string;
}

async function generateWithOllama(prompt: string, format?: "json"): Promise<string> {
  const response = await fetch(OLLAMA_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      ...(format ? { format } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with ${response.status}`);
  }

  const data = (await response.json()) as OllamaGenerateResponse;

  if (data.error) {
    throw new Error(data.error);
  }

  return data.response?.trim() || "";
}

function parseOptimizationResponse(text: string): AIOptimization {
  const parsed = JSON.parse(text) as Partial<AIOptimization>;

  return {
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map(String)
      : ["Review your schedule and group similar tasks together."],
    timeSavedEstimate: typeof parsed.timeSavedEstimate === "string" ? parsed.timeSavedEstimate : "0 mins",
    efficiencyScore: typeof parsed.efficiencyScore === "number" ? Math.min(100, Math.max(0, parsed.efficiencyScore)) : 0,
    bottlenecks: Array.isArray(parsed.bottlenecks) ? parsed.bottlenecks.map(String) : [],
  };
}

export async function optimizeSchedule(tasks: Task[]): Promise<AIOptimization> {
  const scheduleStr = tasks.map(t =>
    `- ${t.startTime} to ${t.endTime}: ${t.title} (${t.category})`
  ).join("\n");

  const prompt = `
You are an expert productivity coach. Analyze the following daily schedule and provide optimization suggestions.
Identify where time can be saved, where the user can be faster, and potential bottlenecks.
Also suggest why they might struggle with certain tasks based on the density or timing.

Schedule:
${scheduleStr}

Return only valid JSON with this exact structure and no markdown:
{
  "suggestions": ["string"],
  "timeSavedEstimate": "string, for example '45 mins'",
  "efficiencyScore": 75,
  "bottlenecks": ["string"]
}
`;

  try {
    const text = await generateWithOllama(prompt, "json");
    return parseOptimizationResponse(text);
  } catch (error) {
    console.error("Ollama optimization failed:", error);
    return {
      suggestions: ["Could not reach Ollama. Make sure Ollama is running and gemma3:latest is installed."],
      timeSavedEstimate: "0 mins",
      efficiencyScore: 0,
      bottlenecks: ["Local Ollama service unavailable"]
    };
  }
}

export async function analyzeObstacles(task: Task, reason: string): Promise<string> {
  const prompt = `
The user failed to complete the task "${task.title}" (${task.startTime}-${task.endTime}).
Their reason: "${reason}".
Provide a concise, encouraging, psychological insight into why this happened and how to overcome it next time.
Keep it under 3 sentences.
`;

  try {
    const text = await generateWithOllama(prompt);
    return text || "Keep pushing forward!";
  } catch (error) {
    console.error("Ollama insight failed:", error);
    return "Don't be too hard on yourself. Make sure Ollama is running, then try again.";
  }
}
