import { NextRequest, NextResponse } from "next/server";
import { extractTextFromUpload, parseResume } from "@/lib/parse-resume";
import { parseJD } from "@/lib/parse-jd";
import { scoreResume } from "@/lib/ats";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("resume");
    const jd = form.get("jd");

    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Missing resume file" }, { status: 400 });
    if (typeof jd !== "string" || jd.trim().length < 30) {
      return NextResponse.json({ ok: false, error: "Missing or too-short job description" }, { status: 400 });
    }

    const text = await extractTextFromUpload(file);
    const resume = parseResume(text);
    const jdFeatures = parseJD(jd);
    const score = scoreResume(resume, jdFeatures);

    return NextResponse.json({ ok: true, score, jdTitle: jdFeatures.title });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
