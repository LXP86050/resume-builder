# Resume Builder

Score your resume against any job description and rebuild it to **90%+ ATS** with one click.

- **Score:** deterministic ATS scoring across 6 weighted categories (hard skills, title, years, sections, formatting, soft skills).
- **Rebuild:** an LLM rewrites bullets to match the JD's terminology — truthfully — and iterates until the score clears 90.
- **Output:** clean, ATS-friendly DOCX.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · `pdf-parse` · `mammoth` · `docx`. Uses Google's free Gemini API as the rewrite backend (swap-friendly via `lib/ai.ts`).

## Setup

```bash
git clone <this repo>
cd resume-builder
npm install
cp .env.example .env.local
# Edit .env.local and set AI_API_KEY=<your key>
npm run dev
```

Open <http://localhost:3000>.

### Getting a free AI key

1. Go to <https://aistudio.google.com/apikey>.
2. Click **Create API key**.
3. Paste into `.env.local` as `AI_API_KEY=...`.

Free tier (as of writing): 1,500 requests/day, 1M tokens/minute on `gemini-2.5-flash`. More than enough for this tool.

To override the model, set `AI_MODEL` in `.env.local` (e.g. `gemini-2.5-pro` for higher quality at the cost of free-tier RPM).

### Deploying to Vercel

The repo is Vercel-ready out of the box. On the project's **Settings → Environment Variables** page, add:

| Name          | Value                                                  |
| ------------- | ------------------------------------------------------ |
| `AI_API_KEY`  | your key from <https://aistudio.google.com/apikey>     |
| `AI_MODEL`    | _(optional — defaults to `gemini-2.5-flash`)_          |

Add to **Production**, **Preview**, and **Development** environments, then redeploy.

## How it works

```
┌── POST /api/score ──────────────────────────────────────────┐
│  upload + JD → parseResume → parseJD → scoreResume → JSON  │
└────────────────────────────────────────────────────────────┘

┌── POST /api/build ──────────────────────────────────────────────────────┐
│  upload + JD → parseResume → parseJD → rewriteToTarget (up to 3 passes)│
│  → scoreResume(final) → buildDocx → DOCX response                       │
└─────────────────────────────────────────────────────────────────────────┘
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

The rewrite prompt forbids:
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
  ai.ts                 AI client (JSON mode)
  rewrite.ts            iterative rewriter targeting 90%+
  docx.ts               ATS-friendly DOCX writer
```

## Notes

- Resume parsing is heuristic. Heavily-formatted PDFs (multi-column, infographic) won't parse cleanly — convert to a simple text PDF first, or upload a TXT/DOCX version.
- The score is deterministic, but realistic enterprise ATS systems vary; treat it as a strong directional indicator, not gospel.
- Nothing is stored — each request processes in memory and returns.
- `npm audit` will flag a handful of Next.js 14 advisories. They cover image optimization, request smuggling, and cache poisoning in **publicly-deployed** Next servers — if you self-host this beyond a tiny personal project, upgrade to Next 15+ first.
