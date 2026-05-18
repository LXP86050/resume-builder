import type { JDFeatures } from "./types";
import { SKILL_ALIASES, SOFT_SKILLS, aliasMap } from "./skills-lexicon";

const REQUIRED_YEARS_PATTERNS = [
  /(\d+)\+?\s*(?:to\s*\d+\s*)?(?:years|yrs)/i,
  /(?:minimum|at\s+least)\s+(\d+)\s+(?:years|yrs)/i,
];

const TITLE_PATTERNS = [
  /(senior|sr\.?|staff|principal|lead|junior|jr\.?)\s+(software\s+engineer|engineer|developer|sde|swe|data\s+(scientist|engineer)|ml\s+engineer|ai\s+engineer|fullstack|full[-\s]stack|backend|back[-\s]end|frontend|front[-\s]end)/i,
  /(software\s+engineer|software\s+developer|full[-\s]?stack\s+(engineer|developer)|backend\s+(engineer|developer)|frontend\s+(engineer|developer)|data\s+engineer|data\s+scientist|ml\s+engineer|ai\s+engineer|machine\s+learning\s+engineer|sde\s+ii?i?|swe\s+ii?i?)/i,
];

export function parseJD(rawText: string): JDFeatures {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  return {
    title: extractTitle(text),
    requiredYears: extractYears(lower),
    hardSkills: extractHardSkills(lower),
    softSkills: extractSoftSkills(lower),
    responsibilities: extractBulletsUnder(text, /(responsibilities|what you'?ll do|the role|day[-\s]?to[-\s]?day)/i),
    niceToHave: extractBulletsUnder(text, /(nice to have|bonus|preferred|plus|good to have)/i),
    rawText: text,
  };
}

function extractTitle(text: string): string | undefined {
  // Try first non-empty line, then fall back to scanning patterns.
  const firstLine = text.split("\n").map((l) => l.trim()).find(Boolean);
  if (firstLine && firstLine.length < 80) {
    for (const p of TITLE_PATTERNS) {
      if (p.test(firstLine)) return firstLine;
    }
  }
  for (const p of TITLE_PATTERNS) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return firstLine;
}

function extractYears(lower: string): number | undefined {
  for (const p of REQUIRED_YEARS_PATTERNS) {
    const m = lower.match(p);
    if (m) return Number.parseInt(m[1], 10);
  }
  return undefined;
}

export function extractHardSkills(lower: string): string[] {
  // Walk the alias map and capture any canonical skill whose alias appears as a token boundary match.
  const found = new Set<string>();
  const aliases = aliasMap();
  for (const [alias, canonical] of aliases.entries()) {
    if (containsToken(lower, alias)) found.add(canonical);
  }
  // Light dedupe: ensure stable, friendly ordering by frequency.
  const freq = new Map<string, number>();
  for (const canonical of found) {
    const aliasesForCanonical = SKILL_ALIASES[canonical] ?? [];
    let count = 0;
    for (const a of [canonical.toLowerCase(), ...aliasesForCanonical]) {
      const re = boundaryRegex(a);
      const matches = lower.match(re);
      if (matches) count += matches.length;
    }
    freq.set(canonical, count);
  }
  return [...found].sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0));
}

function extractSoftSkills(lower: string): string[] {
  const out: string[] = [];
  for (const s of SOFT_SKILLS) {
    if (containsToken(lower, s)) out.push(s);
  }
  return [...new Set(out)];
}

function extractBulletsUnder(text: string, header: RegExp): string[] {
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => header.test(l));
  if (idx === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(idx + 1)) {
    const t = line.trim();
    if (!t) continue;
    if (/^[a-z][a-z\s/]{2,30}:?$/i.test(t) && t.length < 40 && !/^[•\-\*•]/.test(line)) {
      // Probably the next section header.
      break;
    }
    const bullet = t.replace(/^[•\-\*•]\s*/, "");
    if (bullet.length > 4) out.push(bullet);
    if (out.length >= 25) break;
  }
  return out;
}

export function containsToken(haystack: string, needle: string): boolean {
  return boundaryRegex(needle).test(haystack);
}

function boundaryRegex(needle: string): RegExp {
  // Skills like "C++", "C#", ".NET" contain regex-special chars and don't sit on \b boundaries.
  // Use a lookaround on non-alphanumerics so "C#" matches in "C# developer" but not inside "abcC#".
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9+#.])${escaped}(?:$|[^a-z0-9+#])`, "gi");
}
