/**
 * Smoke test for the full pipeline: PDF → parse → DOCX, no Gemini call.
 * Run from project root:  npx tsx scripts/smoke-docx.ts <pdf>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractTextFromUpload, parseResume } from "../lib/parse-resume";
import { buildDocx } from "../lib/docx";

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: tsx scripts/smoke-docx.ts <path-to-resume.pdf>");
    process.exit(1);
  }
  const path = resolve(arg);
  const buf = readFileSync(path);
  const file = new File([buf], path.split("/").pop() ?? "resume.pdf", { type: "application/pdf" });
  const text = await extractTextFromUpload(file);
  const resume = parseResume(text);

  // Inject some inline-bold markers into a couple of bullets so we can visually verify
  // that the DOCX writer renders them correctly (in real use, Gemini emits the markers).
  if (resume.experience[0]?.bullets[0]) {
    resume.experience[0].bullets[0] =
      "Designed and implemented **Azure AD and RBAC-based access control** for enterprise applications, supporting compliance.";
  }
  if (resume.experience[0]?.bullets[1]) {
    resume.experience[0].bullets[1] =
      "Built and deployed **RAG-based AI solutions** using Python, **Azure OpenAI**, **Azure AI Search**, LangChain — reducing analyst lookup time by **55%** and supporting **8K+ weekly queries**.";
  }

  const docx = await buildDocx(resume);
  const outPath = resolve("./scripts/sample.docx");
  writeFileSync(outPath, docx);
  console.log(`wrote ${docx.byteLength} bytes → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
