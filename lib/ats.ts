import type { StructuredResume, JDFeatures, ScoreBreakdown } from "./types";
import { ACTION_VERBS } from "./skills-lexicon";
import { containsToken } from "./parse-jd";

const WEIGHTS = {
  hardSkills: 50,
  titleRelevance: 15,
  yearsOfExperience: 10,
  sectionCoverage: 10,
  formatting: 10,
  softSkillsAndVerbs: 5,
};

export function scoreResume(resume: StructuredResume, jd: JDFeatures): ScoreBreakdown {
  const resumeText = resume.rawText.toLowerCase();

  // 1. Hard skills coverage
  const hardSkills = scoreHardSkills(resumeText, jd.hardSkills);

  // 2. Title relevance
  const titleRelevance = scoreTitle(resume, jd);

  // 3. Years of experience
  const yearsOfExperience = scoreYears(resume, jd);

  // 4. Section coverage
  const sectionCoverage = scoreSections(resume);

  // 5. Formatting
  const formatting = scoreFormatting(resume);

  // 6. Soft skills + verbs
  const softSkillsAndVerbs = scoreSoftAndVerbs(resume, jd);

  const total = Math.round(
    hardSkills.score +
      titleRelevance.score +
      yearsOfExperience.score +
      sectionCoverage.score +
      formatting.score +
      softSkillsAndVerbs.score,
  );

  return {
    total: Math.min(100, total),
    hardSkills,
    titleRelevance,
    yearsOfExperience,
    sectionCoverage,
    formatting,
    softSkillsAndVerbs,
  };
}

function scoreHardSkills(resumeLower: string, jdSkills: string[]) {
  if (!jdSkills.length) {
    return { score: WEIGHTS.hardSkills, max: WEIGHTS.hardSkills, matched: [], missing: [] };
  }
  const matched: string[] = [];
  const missing: string[] = [];
  for (const skill of jdSkills) {
    if (containsToken(resumeLower, skill.toLowerCase())) matched.push(skill);
    else missing.push(skill);
  }
  const ratio = matched.length / jdSkills.length;
  // Slight bonus curve: hitting ~85% of skills should pull this category near full credit.
  const adjusted = Math.min(1, ratio * 1.05);
  return {
    score: Math.round(adjusted * WEIGHTS.hardSkills),
    max: WEIGHTS.hardSkills,
    matched,
    missing,
  };
}

function scoreTitle(resume: StructuredResume, jd: JDFeatures) {
  if (!jd.title) {
    return { score: WEIGHTS.titleRelevance, max: WEIGHTS.titleRelevance, note: "no title in JD" };
  }
  const target = normalizeTitle(jd.title);
  const joinedExperience = resume.experience
    .map((e) => normalizeTitle(e.title))
    .join(" | ");
  const tokens = target
    .split(/\s+/)
    .filter((t) => t.length > 2 && !/^(the|a|an|and|or|for|of|in|to|at|with)$/.test(t));
  let hits = 0;
  for (const t of tokens) {
    if (joinedExperience.includes(t)) hits++;
  }
  const ratio = tokens.length ? hits / tokens.length : 0;
  const score = Math.round(ratio * WEIGHTS.titleRelevance);
  return {
    score,
    max: WEIGHTS.titleRelevance,
    note: tokens.length
      ? `${hits}/${tokens.length} title keywords matched against your job titles`
      : "no specific title keywords to match",
  };
}

// Compare titles without punctuation noise: "Full-Stack" ↔ "Full Stack",
// "Senior SWE" ↔ "Sr. Software Engineer" via alias hop, etc.
function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/\bsr\.?\b/g, "senior")
    .replace(/\bjr\.?\b/g, "junior")
    .replace(/\bswe\b/g, "software engineer")
    .replace(/\bsde\b/g, "software engineer")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreYears(resume: StructuredResume, jd: JDFeatures) {
  if (!jd.requiredYears) {
    return { score: WEIGHTS.yearsOfExperience, max: WEIGHTS.yearsOfExperience, note: "no year requirement in JD" };
  }
  const claimed = estimateYearsFromResume(resume);
  if (claimed >= jd.requiredYears) {
    return {
      score: WEIGHTS.yearsOfExperience,
      max: WEIGHTS.yearsOfExperience,
      note: `~${claimed}y experience >= ${jd.requiredYears}y required`,
    };
  }
  const ratio = Math.max(0, claimed / jd.requiredYears);
  return {
    score: Math.round(ratio * WEIGHTS.yearsOfExperience),
    max: WEIGHTS.yearsOfExperience,
    note: `~${claimed}y vs ${jd.requiredYears}y required`,
  };
}

function estimateYearsFromResume(resume: StructuredResume): number {
  let totalMonths = 0;
  const now = new Date().getFullYear();
  for (const item of resume.experience) {
    // Fresh regex per iteration to sidestep any global-flag lastIndex carryover.
    // Accepts "2018-2021", "2022 - Mar 2024", "Mar 2024 - Present", etc.
    const range = /(\d{4})\s*[-–]\s*(?:[a-z]+\.?\s+)?(present|current|\d{4})/gi;
    for (const m of item.dates.matchAll(range)) {
      const start = parseInt(m[1], 10);
      const end = /present|current/i.test(m[2]) ? now : parseInt(m[2], 10);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        totalMonths += (end - start) * 12;
      }
    }
  }
  return Math.round(totalMonths / 12);
}

function scoreSections(resume: StructuredResume) {
  const required: Array<[keyof StructuredResume, boolean]> = [
    ["name", Boolean(resume.name)],
    ["contact", Boolean(resume.contact.email || resume.contact.phone)],
    ["summary", Boolean(resume.summary)],
    ["skills", resume.skills.length > 0],
    ["experience", resume.experience.length > 0],
    ["education", resume.education.length > 0],
  ];
  const missing = required.filter(([, present]) => !present).map(([k]) => String(k));
  const present = required.length - missing.length;
  const score = Math.round((present / required.length) * WEIGHTS.sectionCoverage);
  return { score, max: WEIGHTS.sectionCoverage, missing };
}

function scoreFormatting(resume: StructuredResume) {
  const issues: string[] = [];

  // Bullets should start with action verbs.
  const allBullets = resume.experience.flatMap((e) => e.bullets);
  if (allBullets.length === 0) {
    issues.push("no bullet points in experience");
  } else {
    const verbStarts = allBullets.filter((b) => {
      const first = b.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
      return first && ACTION_VERBS.includes(first);
    });
    const ratio = verbStarts.length / allBullets.length;
    if (ratio < 0.5) issues.push(`only ${Math.round(ratio * 100)}% of bullets start with action verbs`);
  }

  // Date format check.
  const datedJobs = resume.experience.filter((e) => /\d{4}/.test(e.dates));
  if (resume.experience.length && datedJobs.length / resume.experience.length < 0.8) {
    issues.push("some experience entries are missing dates");
  }

  // Length sanity.
  const wc = resume.rawText.split(/\s+/).length;
  if (wc < 200) issues.push("resume seems short");
  if (wc > 1200) issues.push("resume is very long — may dilute keywords");

  const penaltyPerIssue = WEIGHTS.formatting / 4;
  const score = Math.max(0, WEIGHTS.formatting - issues.length * penaltyPerIssue);
  return { score: Math.round(score), max: WEIGHTS.formatting, issues };
}

function scoreSoftAndVerbs(resume: StructuredResume, jd: JDFeatures) {
  const resumeLower = resume.rawText.toLowerCase();
  const matched: string[] = [];
  for (const s of jd.softSkills) {
    if (containsToken(resumeLower, s)) matched.push(s);
  }
  const skillScore = jd.softSkills.length ? matched.length / jd.softSkills.length : 1;

  const allBullets = resume.experience.flatMap((e) => e.bullets);
  const verbStarts = allBullets.filter((b) => {
    const first = b.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
    return first && ACTION_VERBS.includes(first);
  }).length;
  const verbScore = allBullets.length ? verbStarts / allBullets.length : 0;

  const combined = skillScore * 0.6 + verbScore * 0.4;
  return {
    score: Math.round(combined * WEIGHTS.softSkillsAndVerbs),
    max: WEIGHTS.softSkillsAndVerbs,
    matched,
  };
}
