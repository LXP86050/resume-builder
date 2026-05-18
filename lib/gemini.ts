import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-2.5-flash";

export function geminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env.local (see .env.example).");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  });
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  const model = geminiClient();
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseJsonLoose<T>(text);
}

function parseJsonLoose<T>(raw: string): T {
  // Gemini sometimes wraps JSON in code fences despite responseMimeType. Be lenient.
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
    throw new Error("Gemini returned non-JSON response: " + raw.slice(0, 200));
  }
}
