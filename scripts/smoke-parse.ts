/**
 * One-off smoke test: parse the user's existing PDF resume and print the structured output.
 * Run from the project root with:  npx tsx scripts/smoke-parse.ts <path-to-pdf>
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractTextFromUpload, parseResume } from "../lib/parse-resume";

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: tsx scripts/smoke-parse.ts <path-to-resume.pdf>");
    process.exit(1);
  }
  const path = resolve(arg);
  const buf = readFileSync(path);
  // Build a File-like object using the global File constructor (Node 20+).
  const file = new File([buf], path.split("/").pop() ?? "resume.pdf", { type: "application/pdf" });
  const text = await extractTextFromUpload(file);
  const structured = parseResume(text);
  console.log(JSON.stringify({
    name: structured.name,
    contact: structured.contact,
    summary: structured.summary?.slice(0, 160) + "…",
    skills: structured.skills,
    experienceTitles: structured.experience.map(e => ({ title: e.title, company: e.company, dates: e.dates, bullets: e.bullets.length })),
    projects: structured.projects?.map(p => ({ name: p.name, bullets: p.bullets.length })),
    education: structured.education,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
