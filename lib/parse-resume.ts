import type { StructuredResume, ExperienceItem, EducationItem, SkillCategory } from "./types";

const SECTION_PATTERNS: Array<{ key: string; regex: RegExp }> = [
  { key: "summary", regex: /^(professional\s+)?(summary|profile|objective|about)\s*:?\s*$/i },
  { key: "skills", regex: /^(core\s+|technical\s+|key\s+)?(skills|technologies|competenc(ies|y)|tech\s+stack)\s*:?\s*$/i },
  { key: "experience", regex: /^(professional\s+|work\s+)?(experience|employment|work\s+history)\s*:?\s*$/i },
  { key: "projects", regex: /^projects?\s*:?\s*$/i },
  { key: "education", regex: /^education\s*:?\s*$/i },
  { key: "certifications", regex: /^(certifications?|licenses?|awards?)\s*:?\s*$/i },
];

export async function extractTextFromUpload(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const out = await pdfParse(buf);
    return normalize(out.text);
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const out = await mammoth.extractRawText({ buffer: buf });
    return normalize(out.value);
  }

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return normalize(buf.toString("utf8"));
  }

  // Best-effort fallback for unknown extensions.
  return normalize(buf.toString("utf8"));
}

function normalize(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseResume(rawText: string): StructuredResume {
  const lines = rawText.split("\n").map((l) => l.trim());

  const sections = sliceSections(lines);
  const contactBlock = sections.header.join("\n");

  return {
    name: extractName(sections.header),
    contact: extractContact(contactBlock),
    summary: sections.summary.length ? sections.summary.join(" ").trim() : undefined,
    skills: parseSkillSections(sections.skills),
    experience: parseExperience(sections.experience),
    education: parseEducation(sections.education),
    projects: sections.projects.length
      ? parseProjects(sections.projects)
      : undefined,
    certifications: sections.certifications.length
      ? sections.certifications.filter(Boolean)
      : undefined,
    rawText,
  };
}

function sliceSections(lines: string[]): Record<string, string[]> & { header: string[] } {
  const buckets: Record<string, string[]> = {
    header: [],
    summary: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
  };
  let current: keyof typeof buckets = "header";

  for (const line of lines) {
    if (!line) continue;
    const matched = SECTION_PATTERNS.find((p) => p.regex.test(line));
    if (matched) {
      current = matched.key as keyof typeof buckets;
      continue;
    }
    buckets[current].push(line);
  }
  return buckets as Record<string, string[]> & { header: string[] };
}

function extractName(header: string[]): string {
  // First non-empty line that isn't an email/phone/URL.
  for (const l of header) {
    if (/@|http|\d{3}.*\d{3}.*\d{4}/.test(l)) continue;
    if (l.length > 1 && l.length < 60) return l;
  }
  return header[0] ?? "";
}

function extractContact(block: string): StructuredResume["contact"] {
  const email = block.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  const phone = block
    .match(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0]
    ?.replace(/\s+/g, " ")
    .trim();
  const linkedin = block.match(/linkedin\.com\/[\w\-/]+/i)?.[0];
  const github = block.match(/github\.com\/[\w\-/]+/i)?.[0];
  const website = block.match(/https?:\/\/[^\s,]+/i)?.[0];
  const location = block.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*,\s*[A-Z]{2}\b/)?.[0]?.replace(/\s*,\s*/, ", ");
  return { email, phone, linkedin, github, website, location };
}

function parseSkillSections(lines: string[]): SkillCategory[] {
  const out: SkillCategory[] = [];
  for (const line of lines) {
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon > 0 && colon < 40) {
      const label = line.slice(0, colon).trim();
      const items = splitSkillItems(line.slice(colon + 1));
      if (items.length) out.push({ label, items });
      continue;
    }
    // Continuation line — fold into the previous category, or open a generic one.
    const items = splitSkillItems(line);
    if (!items.length) continue;
    if (out.length) out[out.length - 1].items.push(...items);
    else out.push({ label: "Skills", items });
  }
  // Final per-category dedupe.
  return out.map((c) => ({ label: c.label, items: dedupe(c.items) }));
}

function splitSkillItems(s: string): string[] {
  return s
    .split(/[,;•·|]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && t.length < 60);
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of items) {
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function parseExperience(lines: string[]): ExperienceItem[] {
  // Heuristic: a "header" line for a job is one that contains a date range or month-year.
  // We treat each header line as the start of a new ExperienceItem.
  const items: ExperienceItem[] = [];
  let current: ExperienceItem | null = null;

  const dateLine = /(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\b\d{4}\s*[-–]\s*(present|current|\d{4})/i;

  for (const line of lines) {
    if (!line) continue;
    const isHeader = dateLine.test(line) || /–|—| at | – /.test(line);
    if (isHeader && (!current || current.bullets.length > 0 || current.title)) {
      if (current) items.push(current);
      current = parseExperienceHeader(line);
      continue;
    }
    const bullet = line.replace(/^[•\-\*•▪●\s]+/, "").trim();
    if (!current) {
      current = { title: "", company: "", dates: "", bullets: [] };
    }
    if (bullet) current.bullets.push(bullet);
  }
  if (current) items.push(current);
  return items.filter((i) => i.title || i.company || i.bullets.length > 0);
}

function parseExperienceHeader(line: string): ExperienceItem {
  // Tries patterns like: "Software Engineer II — Infosys | Mar 2024 – Present | Redmond, WA"
  const parts = line.split(/[|·••]| – | — | at /).map((s) => s.trim()).filter(Boolean);
  let title = parts[0] ?? "";
  let company = parts[1] ?? "";
  let dates = "";
  let location = "";
  for (const p of parts.slice(2)) {
    if (/\d{4}/.test(p) || /present|current/i.test(p)) dates = p;
    else if (/[A-Z][a-z]+,\s*[A-Z]{2}/.test(p)) location = p;
  }
  // PDF text often joins a right-aligned date range onto the company line.
  // Peel a trailing month-year-range out of company (or title, as fallback).
  const trailingDate = /\s+((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}\s*[-–—]\s*(?:present|current|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{4}))\s*$/i;
  if (!dates) {
    const mCompany = company.match(trailingDate);
    if (mCompany) {
      company = company.slice(0, mCompany.index).trim();
      dates = mCompany[1].trim();
    } else {
      const mTitle = title.match(trailingDate);
      if (mTitle) {
        title = title.slice(0, mTitle.index).trim();
        dates = mTitle[1].trim();
      }
    }
  }
  return { title, company, dates, location, bullets: [] };
}

function parseEducation(lines: string[]): EducationItem[] {
  const items: EducationItem[] = [];
  for (const line of lines) {
    if (!line) continue;
    const parts = line.split(/[|·••\-]| – | — /).map((s) => s.trim()).filter(Boolean);
    const school = parts.find((p) => /university|college|institute|school/i.test(p)) ?? parts[0] ?? "";
    const degree = parts.find((p) => /(bachelor|master|ph\.?d|b\.?s|m\.?s|b\.?e|m\.?e|associate|mba|bs\b|ms\b)/i.test(p)) ?? "";
    const dates = parts.find((p) => /\d{4}/.test(p));
    items.push({ school, degree, dates });
  }
  return items.filter((i) => i.school || i.degree);
}

function parseProjects(lines: string[]): { name: string; description?: string; bullets: string[] }[] {
  const items: { name: string; description?: string; bullets: string[] }[] = [];
  let current: { name: string; description?: string; bullets: string[] } | null = null;

  const BULLET_CHARS = /[•●○◦▪◾◆\-\*▸‣]/;
  const startsWithBullet = (s: string) => new RegExp(`^${BULLET_CHARS.source}`).test(s);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (startsWithBullet(line)) {
      // A single PDF line may pack multiple bullets joined by mid-line markers.
      const bullets = line
        .split(new RegExp(BULLET_CHARS.source, "g"))
        .map((s) => s.trim())
        .filter(Boolean);
      if (!current) current = { name: "", bullets: [] };
      current.bullets.push(...bullets);
      continue;
    }

    if (line.includes("|") && line.length < 240) {
      if (current) items.push(current);
      const [name, ...rest] = line.split("|");
      current = {
        name: name.trim(),
        description: rest.length ? rest.join("|").trim() : undefined,
        bullets: [],
      };
      continue;
    }

    // Continuation of the previous bullet (PDF text-wrapping).
    if (current && current.bullets.length) {
      current.bullets[current.bullets.length - 1] += " " + line;
    } else {
      if (current) items.push(current);
      current = { name: line, bullets: [] };
    }
  }
  if (current) items.push(current);
  return items;
}
