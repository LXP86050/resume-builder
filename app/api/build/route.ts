import { NextRequest, NextResponse } from "next/server";
import { extractTextFromUpload, parseResume } from "@/lib/parse-resume";
import { parseJD } from "@/lib/parse-jd";
import { rewriteToTarget } from "@/lib/rewrite";
import { buildDocx } from "@/lib/docx";

export const runtime = "nodejs";
// Vercel hobby plan caps function duration at 60s.
// The rewriter runs up to 3 AI passes (~10-20s each) — fits under 60s.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("resume");
    const jd = form.get("jd");

    if (!(file instanceof File)) return NextResponse.json({ error: "Missing resume file" }, { status: 400 });
    if (typeof jd !== "string" || jd.trim().length < 30) {
      return NextResponse.json({ error: "Missing or too-short job description" }, { status: 400 });
    }

    const text = await extractTextFromUpload(file);
    const resume = parseResume(text);
    const jdFeatures = parseJD(jd);

    const { resume: rewritten, score } = await rewriteToTarget(resume, jdFeatures);
    const docx = await buildDocx(rewritten);

    return new Response(new Uint8Array(docx), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="resume_tailored.docx"`,
        "X-Resume-Score": String(score.total),
        // HTTP headers must be ASCII; escape any non-ASCII chars in the JSON.
        "X-Resume-Score-Breakdown": JSON.stringify(score).replace(/[-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
