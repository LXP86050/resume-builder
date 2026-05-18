import type { StructuredResume, JDFeatures, ScoreBreakdown } from "./types";
import { generateJSON } from "./gemini";
import { scoreResume } from "./ats";

type RewriteResult = {
  resume: StructuredResume;
  score: ScoreBreakdown;
  attempts: number;
};

const TARGET = 90;
const MAX_ATTEMPTS = 3;

export async function rewriteToTarget(
  resume: StructuredResume,
  jd: JDFeatures,
): Promise<RewriteResult> {
  let current = resume;
  let lastScore = scoreResume(current, jd);
  let attempts = 0;

  while (lastScore.total < TARGET && attempts < MAX_ATTEMPTS) {
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
    "4. You MAY rewrite the summary to target this specific JD.",
    "5. Every bullet must start with a strong past-tense action verb.",
    "6. Keep bullets concise (1–2 lines). Include metrics when they were already in the original.",
    "7. Preserve the candidate's contact info, name, education, and job dates EXACTLY.",
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
    '  "summary": string,',
    '  "skills": string[],   // grouped/flat list — include canonical JD skill names where truthful',
    '  "experience": [ { "title": string, "company": string, "dates": string, "location"?: string, "bullets": string[] } ],',
    '  "education": [ { "school": string, "degree": string, "dates"?: string } ],',
    '  "projects"?: [ { "name": string, "description"?: string, "bullets": string[] } ],',
    '  "certifications"?: string[]',
    "}",
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
    out.push("Skills");
    out.push(r.skills.join(", "));
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
