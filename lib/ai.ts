import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-2.5-flash";

function getKey(): string {
  // Prefer the generic name, fall back to the legacy name so old deployments keep working.
  return process.env.AI_API_KEY || process.env.GEMINI_API_KEY || "";
}

function getModel(): string {
  return process.env.AI_MODEL || process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function aiClient() {
  const apiKey = getKey();
  if (!apiKey) {
    throw new Error(
      "AI provider key is not configured. Set the AI_API_KEY environment variable on your host (locally: .env.local).",
    );
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: getModel(),
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  });
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  const model = aiClient();
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseJsonLoose<T>(text);
}

function parseJsonLoose<T>(raw: string): T {
  // Provider sometimes wraps JSON in code fences despite responseMimeType. Be lenient.
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "");
  }
  try {
    return JSON.parse(s) as T;
  } catch {
    const first = s.indexOf("{");
    const last = s.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(s.slice(first, last + 1)) as T;
    }
    throw new Error("AI returned non-JSON response: " + raw.slice(0, 200));
  }
}
