"use client";

import { useCallback, useRef, useState } from "react";
import type { ScoreBreakdown } from "@/lib/types";

type ScoreResponse = {
  ok: true;
  score: ScoreBreakdown;
  jdTitle?: string;
} | { ok: false; error: string };

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [jdTitle, setJdTitle] = useState<string | undefined>();
  const [analyzing, setAnalyzing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [builtScore, setBuiltScore] = useState<ScoreBreakdown | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onAnalyze = useCallback(async () => {
    setError(null);
    setScore(null);
    setBuiltScore(null);
    if (!file) return setError("Upload your resume first (PDF, DOCX, or TXT).");
    if (jd.trim().length < 30) return setError("Paste the full job description.");
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      fd.append("jd", jd);
      const res = await fetch("/api/score", { method: "POST", body: fd });
      const data: ScoreResponse = await res.json();
      if (!data.ok) throw new Error(data.error);
      setScore(data.score);
      setJdTitle(data.jdTitle);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  }, [file, jd]);

  const onBuild = useCallback(async () => {
    setError(null);
    if (!file) return setError("Upload your resume first.");
    if (jd.trim().length < 30) return setError("Paste the full job description.");
    setBuilding(true);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      fd.append("jd", jd);
      const res = await fetch("/api/build", { method: "POST", body: fd });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Build failed" }));
        throw new Error(errBody.error || "Build failed");
      }
      const finalScoreHeader = res.headers.get("X-Resume-Score");
      const finalBreakdown = res.headers.get("X-Resume-Score-Breakdown");
      if (finalBreakdown) {
        try { setBuiltScore(JSON.parse(finalBreakdown) as ScoreBreakdown); } catch {}
      } else if (finalScoreHeader) {
        setBuiltScore({ ...(score ?? emptyScore()), total: Number(finalScoreHeader) });
      }
      const blob = await res.blob();
      downloadBlob(blob, suggestedFilename(file.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBuilding(false);
    }
  }, [file, jd, score]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted">Resume Builder</p>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Score your resume against any JD.<br />
          Rebuild it to <span className="text-accent">90%+</span> ATS.
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          Upload your current resume, paste the job description, and see the breakdown.
          Click <em>Build resume</em> to get a tailored DOCX rewritten by Gemini — truthful, just sharper.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">1. Inputs</h2>

          <label className="label">Your current resume</label>
          <div
            className="rounded-xl border-2 border-dashed border-ink/15 px-4 py-6 text-center transition hover:border-accent"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) setFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-sm text-ink/80">
              {file ? <span className="font-medium">{file.name}</span> : "Drop a PDF, DOCX, or TXT — or click to choose"}
            </p>
          </div>

          <label className="label mt-6">Job description</label>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here — title, responsibilities, required and preferred qualifications."
            className="min-h-[260px] w-full rounded-xl border border-ink/15 bg-white/70 p-4 text-sm leading-relaxed focus:border-ink/40 focus:outline-none"
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={onAnalyze} disabled={analyzing || building} className="btn-primary">
              {analyzing ? "Analyzing…" : "Analyze ATS score"}
            </button>
            <button onClick={onBuild} disabled={building || analyzing} className="btn-ghost">
              {building ? "Building 90%+ resume…" : "Build resume (DOCX)"}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
          )}
        </section>

        <section className="card">
          <h2 className="mb-4 text-lg font-semibold">2. ATS score</h2>
          {!score ? (
            <p className="text-sm text-muted">
              Run analysis to see the breakdown. The score uses keyword coverage, title match,
              years-of-experience, section coverage, formatting, and soft-skill signals.
            </p>
          ) : (
            <ScoreView score={score} jdTitle={jdTitle} label="Current resume" />
          )}

          {builtScore && (
            <div className="mt-6 border-t border-ink/10 pt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">After rewrite</h3>
              <ScoreView score={builtScore} jdTitle={jdTitle} label="Built resume" />
              <p className="mt-3 text-xs text-muted">DOCX has been downloaded.</p>
            </div>
          )}
        </section>
      </div>

      <footer className="mt-12 text-xs text-muted">
        Built with Next.js + Gemini. No data is stored — everything runs in this process.
      </footer>
    </main>
  );
}

function ScoreView({ score, jdTitle, label }: { score: ScoreBreakdown; jdTitle?: string; label: string }) {
  const color = score.total >= 90 ? "text-green-600" : score.total >= 75 ? "text-amber-600" : "text-red-600";
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className={`text-5xl font-bold ${color}`}>{score.total}</span>
        <span className="text-sm text-muted">/100 — {label}</span>
      </div>
      {jdTitle && <p className="mt-1 text-xs text-muted">JD: {jdTitle}</p>}

      <ul className="mt-5 space-y-2 text-sm">
        <Row label="Hard skill coverage" got={score.hardSkills.score} max={score.hardSkills.max} />
        <Row label="Title relevance" got={score.titleRelevance.score} max={score.titleRelevance.max} note={score.titleRelevance.note} />
        <Row label="Years of experience" got={score.yearsOfExperience.score} max={score.yearsOfExperience.max} note={score.yearsOfExperience.note} />
        <Row label="Section coverage" got={score.sectionCoverage.score} max={score.sectionCoverage.max} note={score.sectionCoverage.missing.length ? `Missing: ${score.sectionCoverage.missing.join(", ")}` : undefined} />
        <Row label="Formatting" got={score.formatting.score} max={score.formatting.max} note={score.formatting.issues.join("; ") || undefined} />
        <Row label="Soft skills + verbs" got={score.softSkillsAndVerbs.score} max={score.softSkillsAndVerbs.max} />
      </ul>

      {score.hardSkills.missing.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-ink/80">
            {score.hardSkills.missing.length} JD skill{score.hardSkills.missing.length === 1 ? "" : "s"} missing
          </summary>
          <p className="mt-2 text-xs text-muted">{score.hardSkills.missing.join(" · ")}</p>
        </details>
      )}
      {score.hardSkills.matched.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium text-ink/80">
            {score.hardSkills.matched.length} matched
          </summary>
          <p className="mt-2 text-xs text-muted">{score.hardSkills.matched.join(" · ")}</p>
        </details>
      )}
    </div>
  );
}

function Row({ label, got, max, note }: { label: string; got: number; max: number; note?: string }) {
  const ratio = max ? got / max : 0;
  return (
    <li>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">{got}/{max}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full rounded-full bg-ink"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </li>
  );
}

function emptyScore(): ScoreBreakdown {
  return {
    total: 0,
    hardSkills: { score: 0, max: 50, matched: [], missing: [] },
    titleRelevance: { score: 0, max: 15, note: "" },
    yearsOfExperience: { score: 0, max: 10, note: "" },
    sectionCoverage: { score: 0, max: 10, missing: [] },
    formatting: { score: 0, max: 10, issues: [] },
    softSkillsAndVerbs: { score: 0, max: 5, matched: [] },
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function suggestedFilename(original: string): string {
  const stem = original.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_");
  return `${stem}_tailored.docx`;
}
