import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  TabStopPosition,
  ExternalHyperlink,
  IRunOptions,
} from "docx";
import type { StructuredResume, SkillCategory } from "./types";
import { SKILL_CATEGORIES } from "./types";

// Matches the candidate's existing template:
// - Centered name + single contact line at the top
// - Section order: SUMMARY → CORE SKILLS → EXPERIENCE → PROJECTS → EDUCATION
// - Blue, uppercase, bold section headings
// - CORE SKILLS as 9 fixed categorized lines
// - EXPERIENCE: "Title | **Company**" left, dates right-aligned (tab stop)
// - Bullets support inline **bold** markers
// - PROJECTS: "**Name** | tech stack" header line, then bullets
// - EDUCATION: "**Degree** - School"
//
// Single-column, no tables, no images — ATS-safe.

const ACCENT_BLUE = "2E9BD6"; // matches the existing PDF template
const INK = "111111";
const MUTED = "555555";

export async function buildDocx(resume: StructuredResume): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(...header(resume));

  if (resume.summary) {
    children.push(sectionHeading("SUMMARY"));
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: resume.summary, size: 20, color: INK })],
      }),
    );
  }

  children.push(sectionHeading("CORE SKILLS"));
  children.push(...skillsBlock(resume.skills));

  if (resume.experience.length) {
    children.push(sectionHeading("EXPERIENCE"));
    for (const item of resume.experience) {
      children.push(experienceHeader(item.title, item.company, item.dates));
      for (const b of item.bullets) {
        children.push(bulletParagraph(b, "•"));
      }
    }
  }

  if (resume.projects?.length) {
    children.push(sectionHeading("PROJECTS"));
    for (const p of resume.projects) {
      children.push(projectHeader(p.name, p.description));
      for (const b of p.bullets) {
        children.push(bulletParagraph(b, "●"));
      }
    }
  }

  if (resume.education.length) {
    children.push(sectionHeading("EDUCATION"));
    for (const e of resume.education) {
      children.push(educationLine(e.degree, e.school, e.dates));
    }
  }

  if (resume.certifications?.length) {
    children.push(sectionHeading("CERTIFICATIONS"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: resume.certifications.join(" • "), size: 20, color: INK })],
      }),
    );
  }

  const doc = new Document({
    creator: "Resume Builder",
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 20 } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 540, bottom: 540, left: 720, right: 720 } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function header(resume: StructuredResume): Paragraph[] {
  const out: Paragraph[] = [];

  if (resume.name) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: resume.name, bold: true, size: 36, color: ACCENT_BLUE })],
      }),
    );
  }

  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: contactRuns(resume),
    }),
  );

  return out;
}

function contactRuns(resume: StructuredResume): (TextRun | ExternalHyperlink)[] {
  const sep = () => new TextRun({ text: "  |  ", size: 18, color: MUTED });
  const out: (TextRun | ExternalHyperlink)[] = [];
  const push = (run: TextRun | ExternalHyperlink) => {
    if (out.length) out.push(sep());
    out.push(run);
  };

  if (resume.contact.phone) push(new TextRun({ text: resume.contact.phone, size: 18, color: INK }));
  if (resume.contact.email) push(new TextRun({ text: resume.contact.email, size: 18, color: INK }));
  if (resume.contact.linkedin) {
    const url = ensureUrl(resume.contact.linkedin);
    push(
      new ExternalHyperlink({
        link: url,
        children: [new TextRun({ text: "Linkedin", size: 18, color: ACCENT_BLUE, underline: {} })],
      }),
    );
  }
  if (resume.contact.github) {
    const url = ensureUrl(resume.contact.github);
    push(
      new ExternalHyperlink({
        link: url,
        children: [new TextRun({ text: "GitHub", size: 18, color: ACCENT_BLUE, underline: {} })],
      }),
    );
  }
  if (resume.contact.location) push(new TextRun({ text: resume.contact.location, size: 18, color: INK }));
  return out;
}

function ensureUrl(s: string): string {
  if (/^https?:\/\//i.test(s)) return s;
  return "https://" + s.replace(/^\/+/, "");
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 220, after: 80 },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: 24, color: ACCENT_BLUE }),
    ],
  });
}

function skillsBlock(skills: SkillCategory[]): Paragraph[] {
  // Normalize to the canonical 9 categories in fixed order, dropping empties cleanly.
  const byLabel = new Map<string, string[]>();
  for (const c of skills) {
    const key = canonicalCategoryKey(c.label);
    if (!key) continue;
    const existing = byLabel.get(key) ?? [];
    byLabel.set(key, [...existing, ...c.items]);
  }

  const out: Paragraph[] = [];
  for (const label of SKILL_CATEGORIES) {
    const items = dedupeKeepCase(byLabel.get(label) ?? []);
    if (!items.length) continue;
    out.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 20, color: INK }),
          new TextRun({ text: items.join(", "), size: 20, color: INK }),
        ],
      }),
    );
  }
  return out;
}

function canonicalCategoryKey(label: string): (typeof SKILL_CATEGORIES)[number] | null {
  const norm = label.toLowerCase().replace(/\s+/g, " ").trim();
  for (const c of SKILL_CATEGORIES) {
    if (c.toLowerCase() === norm) return c;
  }
  // Light aliasing for parser noise.
  const map: Record<string, (typeof SKILL_CATEGORIES)[number]> = {
    "language": "Languages",
    "programming languages": "Languages",
    "back end": "Backend",
    "back-end": "Backend",
    "front end": "Frontend",
    "front-end": "Frontend",
    "databases": "Databases & Search",
    "data": "Databases & Search",
    "cloud": "Cloud & DevOps",
    "devops": "Cloud & DevOps",
    "cloud and devops": "Cloud & DevOps",
    "ai": "AI & ML",
    "ml": "AI & ML",
    "ai/ml": "AI & ML",
    "machine learning": "AI & ML",
    "security": "Security & Integration",
    "engineering": "Engineering Areas",
    "tools": "Tools & Testing",
    "testing": "Tools & Testing",
  };
  return map[norm] ?? null;
}

function dedupeKeepCase(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of items) {
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function experienceHeader(title: string, company: string, dates: string): Paragraph {
  const left = title ? `${title}${company ? " | " : ""}` : "";
  return new Paragraph({
    spacing: { before: 140, after: 40 },
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: left, size: 22, color: INK }),
      new TextRun({ text: company, bold: true, size: 22, color: INK }),
      new TextRun({ text: "\t", size: 22 }),
      new TextRun({ text: dates, size: 22, color: INK }),
    ],
  });
}

function projectHeader(name: string, description?: string): Paragraph {
  const children: TextRun[] = [new TextRun({ text: name, bold: true, size: 22, color: INK })];
  if (description) {
    children.push(new TextRun({ text: " | ", size: 22, color: INK }));
    children.push(new TextRun({ text: description, size: 22, color: INK }));
  }
  return new Paragraph({
    spacing: { before: 140, after: 40 },
    children,
  });
}

function educationLine(degree: string, school: string, dates?: string): Paragraph {
  const tabStops = dates ? [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }] : undefined;
  const children: TextRun[] = [
    new TextRun({ text: degree, bold: true, size: 22, color: INK }),
    new TextRun({ text: school ? ` - ${school}` : "", size: 22, color: INK }),
  ];
  if (dates) {
    children.push(new TextRun({ text: "\t", size: 22 }));
    children.push(new TextRun({ text: dates, size: 22, color: INK }));
  }
  return new Paragraph({
    spacing: { after: 40 },
    tabStops,
    children,
  });
}

function bulletParagraph(text: string, marker: string): Paragraph {
  return new Paragraph({
    indent: { left: 360, hanging: 200 },
    spacing: { after: 40 },
    children: [
      new TextRun({ text: `${marker}  `, size: 20, color: INK }),
      ...inlineBoldRuns(text, { size: 20, color: INK }),
    ],
  });
}

// Splits a string with **bold** markers into TextRuns with bold runs interleaved.
function inlineBoldRuns(text: string, base: IRunOptions): TextRun[] {
  const out: TextRun[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) {
      out.push(new TextRun({ ...base, text: text.slice(lastIdx, match.index) }));
    }
    out.push(new TextRun({ ...base, text: match[1], bold: true }));
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    out.push(new TextRun({ ...base, text: text.slice(lastIdx) }));
  }
  return out;
}
