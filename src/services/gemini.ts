import { Task, AIOptimization } from "../types";

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma3:latest";

interface OllamaGenerateResponse {
  response?: string;
  error?: string;
}

interface ObstacleInsightResponse {
  why?: string;
  nextStep?: string;
  microAction?: string;
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

function cleanInsightPart(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value
    .trim()
    .replace(/^[-*"'\s]+/, "")
    .replace(/[*"'\s]+$/, "");

  return cleaned || fallback;
}

function parseObstacleInsight(text: string, taskTitle: string): string {
  const parsed = JSON.parse(text) as ObstacleInsightResponse;

  const why = cleanInsightPart(
    parsed.why,
    `The block is connected to how "${taskTitle}" feels right now, not a lack of effort.`
  );
  const nextStep = cleanInsightPart(
    parsed.nextStep,
    "Make the task smaller before trying to finish the whole thing."
  );
  const microAction = cleanInsightPart(
    parsed.microAction,
    "Open the task and do the first two-minute action."
  );

  return `Why: ${why}\nNext: ${nextStep}\nStart now: ${microAction}`;
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
You are a practical productivity coach, not a motivational quote bot.

Task: "${task.title}" (${task.startTime}-${task.endTime})
User's reason for getting stuck: "${reason}"

Give a grounded diagnosis for this exact task and reason.

Rules:
- Do not write quotes, slogans, affirmations, or generic life advice.
- Do not say "you've got this", "believe in yourself", or similar filler.
- Mention the actual task or the user's stated reason.
- Make the advice concrete enough to do immediately.
- Keep each field under 22 words.

Return only valid JSON with this exact structure:
{
  "why": "specific reason this task felt hard",
  "nextStep": "one practical adjustment for next time",
  "microAction": "one action they can do in 2 minutes"
}
`;

  try {
    const text = await generateWithOllama(prompt, "json");
    return parseObstacleInsight(text, task.title);
  } catch (error) {
    console.error("Ollama insight failed:", error);
    return "Don't be too hard on yourself. Make sure Ollama is running, then try again.";
  }
}
