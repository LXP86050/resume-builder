import type { StructuredResume, JDFeatures, ScoreBreakdown } from "./types";
import { SKILL_CATEGORIES } from "./types";
import { generateJSON } from "./ai";
import { scoreResume } from "./ats";

type RewriteResult = {
  resume: StructuredResume;
  score: ScoreBreakdown;
  attempts: number;
};

const TARGET = 90;
// Default 2 passes — fits inside Vercel hobby's 60s function timeout
// with one AI call taking ~15-25s. Override via env if you're on Pro
// (300s budget) and want more iterations.
const MAX_ATTEMPTS = clamp(parseInt(process.env.MAX_REWRITE_ATTEMPTS ?? "2", 10), 1, 5);
// Stop starting new passes once we're within this many ms of the timeout —
// a half-finished call returns a Vercel 504 instead of letting us return the
// best result we have so far.
const TIME_BUDGET_MS = parseInt(process.env.REWRITE_TIME_BUDGET_MS ?? "45000", 10);

export async function rewriteToTarget(
  resume: StructuredResume,
  jd: JDFeatures,
): Promise<RewriteResult> {
  const deadline = Date.now() + TIME_BUDGET_MS;
  let current = resume;
  let lastScore = scoreResume(current, jd);
  let attempts = 0;

  while (lastScore.total < TARGET && attempts < MAX_ATTEMPTS) {
    if (Date.now() >= deadline) break;
    attempts++;
    const rewritten = await callRewrite(current, jd, lastScore, attempts);
    const merged: StructuredResume = {
      ...current,
      ...rewritten,
      rawText: composeRawText(rewritten),
    };
    const newScore = scoreResume(merged, jd);
    // Always accept first attempt; subsequent attempts only if they improve.
    if (attempts === 1 || newScore.total > lastScore.total) {
      current = merged;
      lastScore = newScore;
    }
  }

  return { resume: current, score: lastScore, attempts };
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

async function callRewrite(
  resume: StructuredResume,
  jd: JDFeatures,
  lastScore: ScoreBreakdown,
  attempt: number,
): Promise<Partial<StructuredResume>> {
  const prompt = buildPrompt(resume, jd, lastScore, attempt);
  return generateJSON<Partial<StructuredResume>>(prompt);
}

function buildPrompt(
  resume: StructuredResume,
  jd: JDFeatures,
  lastScore: ScoreBreakdown,
  attempt: number,
): string {
  const missing = lastScore.hardSkills.missing.slice(0, 30);
  const matched = lastScore.hardSkills.matched.slice(0, 30);

  const guidance = attempt === 1
    ? "Make a first careful pass: rewrite to weave the JD's terminology into the candidate's real experience."
    : `Previous attempt scored ${lastScore.total}%. Be more aggressive about surfacing JD keywords. Still no fabrication.`;

  const categories = SKILL_CATEGORIES.join(", ");

  return [
    "You are an expert technical resume editor optimizing for ATS (Applicant Tracking System) screening.",
    "",
    "GOAL: rewrite the candidate's resume so it scores ≥90% against the job description, while remaining 100% truthful.",
    "",
    "STRICT RULES — read carefully:",
    "1. NEVER invent jobs, companies, schools, dates, titles, certifications, or tools the candidate didn't use.",
    "2. You MAY rephrase bullets to use the JD's exact terminology when the candidate's real work was analogous.",
    "   Example: if the candidate built 'a chatbot using OpenAI APIs' and the JD asks for 'RAG systems with LLMs',",
    "   it's fair to rewrite as 'Built a chatbot using LLMs (OpenAI) with retrieval over a vector index'",
    "   ONLY IF the candidate's original work actually included retrieval. If not, do not claim it.",
    "3. You MAY add JD-relevant skills to the Skills section ONLY if there is evidence in the candidate's experience",
    "   that they have used the skill (look at their bullets, summary, prior skills list).",
    "4. You MAY rewrite the summary to target this specific JD. Keep it to 2–4 sentences, prose.",
    "5. Every bullet must start with a strong past-tense action verb.",
    "6. Bullets should be 1–2 lines. Inline-bold the most impactful phrases and metrics by wrapping them in **double asterisks**, ",
    "   e.g. 'Built **RAG-based AI solutions** using Azure OpenAI ... reducing analyst lookup time by **55%**.'",
    "   Aim for 2–4 bolded phrases per bullet. Do NOT bold whole bullets.",
    "7. Preserve the candidate's contact info, name, education, and job dates EXACTLY.",
    "",
    "OUTPUT STRUCTURE — this resume MUST follow a fixed template:",
    "- Sections in this order: SUMMARY, CORE SKILLS, EXPERIENCE, PROJECTS, EDUCATION.",
    `- CORE SKILLS must use EXACTLY these 9 category labels, in this order: ${categories}.`,
    "  • Include every category in the JSON. If a category has no truthful items, return an empty items array.",
    "  • Move/rename items into the right category. Add JD-relevant items only when supported by the candidate's experience.",
    "  • Aim to surface as many JD hard-skills here as the candidate truthfully has.",
    "",
    `GUIDANCE FOR THIS ATTEMPT: ${guidance}`,
    "",
    "JOB DESCRIPTION KEY FACTS:",
    `- Target title: ${jd.title ?? "(unspecified)"}`,
    `- Required years: ${jd.requiredYears ?? "(unspecified)"}`,
    `- Hard skills (priority — try to cover all that fit the candidate's real experience): ${jd.hardSkills.join(", ") || "(none parsed)"}`,
    `- Soft skills: ${jd.softSkills.join(", ") || "(none parsed)"}`,
    `- Already matched in current resume: ${matched.join(", ") || "(none)"}`,
    `- MISSING / need coverage if truthful: ${missing.join(", ") || "(none)"}`,
    "",
    "FULL JOB DESCRIPTION:",
    "```",
    jd.rawText.slice(0, 4000),
    "```",
    "",
    "CANDIDATE'S CURRENT RESUME (JSON):",
    "```json",
    JSON.stringify(
      {
        name: resume.name,
        contact: resume.contact,
        summary: resume.summary,
        skills: resume.skills,
        experience: resume.experience,
        education: resume.education,
        projects: resume.projects,
        certifications: resume.certifications,
      },
      null,
      2,
    ),
    "```",
    "",
    "RESPOND WITH A SINGLE JSON OBJECT matching this TypeScript shape exactly:",
    "{",
    '  "name": string,',
    '  "contact": { "email"?: string, "phone"?: string, "location"?: string, "linkedin"?: string, "github"?: string, "website"?: string },',
    '  "summary": string,                            // 2–4 sentence prose, JD-targeted',
    '  "skills": [                                   // ALWAYS 9 entries in the order above',
    '     { "label": string, "items": string[] }',
    "  ],",
    '  "experience": [ { "title": string, "company": string, "dates": string, "location"?: string, "bullets": string[] } ],',
    '  "education": [ { "school": string, "degree": string, "dates"?: string } ],',
    '  "projects"?: [ { "name": string, "description"?: string, "bullets": string[] } ],',
    '  "certifications"?: string[]',
    "}",
    "",
    "Bullets in experience and projects may contain **bold** markers as described above.",
    "",
    "Return ONLY the JSON. No prose, no markdown fences, no commentary.",
  ].join("\n");
}

export function composeRawText(r: Partial<StructuredResume>): string {
  const out: string[] = [];
  if (r.name) out.push(r.name);
  if (r.contact) {
    const bits = [r.contact.email, r.contact.phone, r.contact.location, r.contact.linkedin, r.contact.github, r.contact.website].filter(Boolean);
    if (bits.length) out.push(bits.join(" | "));
  }
  if (r.summary) {
    out.push("");
    out.push("Summary");
    out.push(r.summary);
  }
  if (r.skills?.length) {
    out.push("");
    out.push("Core Skills");
    for (const cat of r.skills) {
      if (!cat.items?.length) continue;
      out.push(`${cat.label}: ${cat.items.join(", ")}`);
    }
  }
  if (r.experience?.length) {
    out.push("");
    out.push("Experience");
    for (const e of r.experience) {
      out.push(`${e.title} — ${e.company} | ${e.dates}${e.location ? " | " + e.location : ""}`);
      for (const b of e.bullets) out.push(`• ${b}`);
    }
  }
  if (r.projects?.length) {
    out.push("");
    out.push("Projects");
    for (const p of r.projects) {
      out.push(p.name + (p.description ? " — " + p.description : ""));
      for (const b of p.bullets) out.push(`• ${b}`);
    }
  }
  if (r.education?.length) {
    out.push("");
    out.push("Education");
    for (const e of r.education) {
      out.push(`${e.degree} — ${e.school}${e.dates ? " | " + e.dates : ""}`);
    }
  }
  if (r.certifications?.length) {
    out.push("");
    out.push("Certifications");
    out.push(r.certifications.join(", "));
  }
  return out.join("\n");
}
