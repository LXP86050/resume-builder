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
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return parseJsonLoose<T>(text);
  } catch (e) {
    throw normalizeUpstreamError(e);
  }
}

// Translate raw provider errors into short, brand-free messages.
// Internal details still surface in the server's console.error.
function normalizeUpstreamError(e: unknown): Error {
  const raw = e instanceof Error ? e.message : String(e);
  // eslint-disable-next-line no-console
  console.error("[ai] upstream error:", raw);

  if (/\b429\b|quota|too many requests|rate.?limit/i.test(raw)) {
    const retry = raw.match(/retry in (\d+(?:\.\d+)?)s/i)?.[1];
    const hint = retry ? `Try again in ~${Math.ceil(Number(retry))}s` : "Try again in about 30s";
    return new Error(`AI rate limit reached on the free tier. ${hint}, or upgrade your provider plan.`);
  }
  if (/\b40[13]\b|invalid api key|api key not valid|permission denied/i.test(raw)) {
    return new Error("AI key was rejected. Check the AI_API_KEY env var on your host.");
  }
  if (/timeout|deadline|aborted/i.test(raw)) {
    return new Error("AI request timed out. Try again, or paste a shorter job description.");
  }
  if (/safety|blocked/i.test(raw)) {
    return new Error("AI declined to respond to this content. Try a different job description.");
  }
  return new Error("The rewrite service hit an error. Try again in a moment.");
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
