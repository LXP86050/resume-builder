# Resume Builder

Score your resume against any job description and rebuild it to **90%+ ATS** with one click. Local-first, free to run.

- **Score:** deterministic ATS scoring across 6 weighted categories (hard skills, title, years, sections, formatting, soft skills).
- **Rebuild:** Gemini rewrites bullets to match the JD's terminology — truthfully — and iterates until the score clears 90.
- **Output:** clean, ATS-friendly DOCX.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Google Gemini (`gemini-2.5-flash` by default) · `pdf-parse` · `mammoth` · `docx`.

## Setup

```bash
git clone <this repo>
cd resume-builder
npm install
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY=<your key>
npm run dev
```

Open <http://localhost:3000>.

### Getting a free Gemini API key

1. Go to <https://aistudio.google.com/apikey>.
2. Click **Create API key**.
3. Paste into `.env.local` as `GEMINI_API_KEY=...`.

Free tier (as of writing): 1,500 requests/day, 1M tokens/minute on `gemini-2.5-flash`. More than enough for this tool.

To override the model, set `GEMINI_MODEL` in `.env.local` (e.g. `gemini-2.5-pro` for higher quality at the cost of free-tier RPM).

## How it works

```
┌── POST /api/score ──────────────────────────────────────────┐
│  upload + JD → parseResume → parseJD → scoreResume → JSON  │
└────────────────────────────────────────────────────────────┘

┌── POST /api/build ─────────────────────────────────────────────────────────┐
│  upload + JD → parseResume → parseJD → rewriteToTarget(Gemini, up to 3x)  │
│  → scoreResume(final) → buildDocx → DOCX response                          │
└────────────────────────────────────────────────────────────────────────────┘
```

### Scoring weights

| Category            | Weight | What it checks                                         |
| ------------------- | -----: | ------------------------------------------------------ |
| Hard skill coverage |     50 | JD's tech keywords found in the resume (alias-aware)   |
| Title relevance     |     15 | JD title tokens appear in your past job titles         |
| Years of experience |     10 | Sum of date ranges in `Experience` vs JD's requirement |
| Section coverage    |     10 | Contact, summary, skills, experience, education exist  |
| Formatting          |     10 | Action-verb starts, dates present, sane length         |
| Soft skills + verbs |      5 | Matches JD's soft-skill cues + strong verb density     |

### Truthfulness guardrails

The Gemini prompt forbids:
- inventing jobs, companies, schools, dates, titles
- adding technologies the candidate hasn't actually used
- changing contact info or dates

It's allowed to:
- rephrase real bullets to use the JD's exact terminology
- write a JD-targeted summary
- reorder/relabel skills the candidate has already used

## File map

```
app/
  layout.tsx            root layout
  page.tsx              UI (upload, JD, score panel, build button)
  globals.css           tailwind base + a few component classes
  api/
    score/route.ts      POST → ATS score JSON
    build/route.ts      POST → tailored DOCX
lib/
  types.ts              StructuredResume, JDFeatures, ScoreBreakdown
  skills-lexicon.ts     200+ canonical skills + aliases
  parse-resume.ts       PDF/DOCX/TXT → StructuredResume
  parse-jd.ts           JD text → JDFeatures (title, years, hard/soft skills)
  ats.ts                weighted ATS scoring
  gemini.ts             Gemini client (JSON mode)
  rewrite.ts            iterative rewriter targeting 90%+
  docx.ts               ATS-friendly DOCX writer
```

## Notes

- Resume parsing is heuristic. Heavily-formatted PDFs (multi-column, infographic) won't parse cleanly — convert to a simple text PDF first, or upload a TXT/DOCX version.
- The score is deterministic, but realistic enterprise ATS systems vary; treat it as a strong directional indicator, not gospel.
- Nothing is stored — each request processes in memory and returns.
- `npm audit` will flag a handful of Next.js 14 advisories. They cover image optimization, request smuggling, and cache poisoning in **publicly-deployed** Next servers. None apply when you run `npm run dev` locally. If you ever host this on the open internet, upgrade to Next 15+ first.
