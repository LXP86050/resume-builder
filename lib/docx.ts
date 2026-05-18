import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { StructuredResume } from "./types";

export async function buildDocx(resume: StructuredResume): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Header — name centered.
  if (resume.name) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: resume.name, bold: true, size: 32 })],
      }),
    );
  }

  // Contact line.
  const contactBits = [
    resume.contact.location,
    resume.contact.email,
    resume.contact.phone,
    resume.contact.linkedin,
    resume.contact.github,
    resume.contact.website,
  ].filter(Boolean);
  if (contactBits.length) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: contactBits.join("  |  "), size: 20 })],
      }),
    );
  }

  // Summary
  if (resume.summary) {
    children.push(sectionHeading("Professional Summary"));
    children.push(
      new Paragraph({ children: [new TextRun({ text: resume.summary, size: 22 })] }),
    );
  }

  // Skills
  if (resume.skills.length) {
    children.push(sectionHeading("Skills"));
    children.push(
      new Paragraph({ children: [new TextRun({ text: resume.skills.join(" • "), size: 22 })] }),
    );
  }

  // Experience
  if (resume.experience.length) {
    children.push(sectionHeading("Professional Experience"));
    for (const item of resume.experience) {
      const headerText = [
        item.title && `${item.title}`,
        item.company && `— ${item.company}`,
      ]
        .filter(Boolean)
        .join(" ");
      children.push(
        new Paragraph({
          spacing: { before: 120 },
          children: [
            new TextRun({ text: headerText, bold: true, size: 24 }),
          ],
        }),
      );
      const meta = [item.dates, item.location].filter(Boolean).join("  |  ");
      if (meta) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: meta, italics: true, size: 20 })],
          }),
        );
      }
      for (const b of item.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: b, size: 22 })],
          }),
        );
      }
    }
  }

  // Projects
  if (resume.projects?.length) {
    children.push(sectionHeading("Projects"));
    for (const p of resume.projects) {
      children.push(
        new Paragraph({
          spacing: { before: 120 },
          children: [new TextRun({ text: p.name, bold: true, size: 24 })],
        }),
      );
      if (p.description) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: p.description, italics: true, size: 22 })] }),
        );
      }
      for (const b of p.bullets) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: b, size: 22 })],
          }),
        );
      }
    }
  }

  // Education
  if (resume.education.length) {
    children.push(sectionHeading("Education"));
    for (const e of resume.education) {
      const left = [e.degree, e.school].filter(Boolean).join(" — ");
      const right = e.dates ?? "";
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: left, bold: true, size: 22 }),
            new TextRun({ text: right ? `  |  ${right}` : "", size: 22 }),
          ],
        }),
      );
    }
  }

  // Certifications
  if (resume.certifications?.length) {
    children.push(sectionHeading("Certifications"));
    children.push(
      new Paragraph({ children: [new TextRun({ text: resume.certifications.join(" • "), size: 22 })] }),
    );
  }

  const doc = new Document({
    creator: "Resume Builder",
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { color: "999999", space: 2, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 24, color: "222222" })],
  });
}
