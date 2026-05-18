export type Contact = {
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
};

export type ExperienceItem = {
  title: string;
  company: string;
  dates: string;
  location?: string;
  bullets: string[];
};

export type EducationItem = {
  school: string;
  degree: string;
  dates?: string;
};

export type ProjectItem = {
  name: string;
  description?: string;
  bullets: string[];
};

export type StructuredResume = {
  name: string;
  contact: Contact;
  summary?: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects?: ProjectItem[];
  certifications?: string[];
  rawText: string;
};

export type JDFeatures = {
  title?: string;
  requiredYears?: number;
  hardSkills: string[];
  softSkills: string[];
  responsibilities: string[];
  niceToHave: string[];
  rawText: string;
};

export type ScoreBreakdown = {
  total: number;
  hardSkills: { score: number; max: number; matched: string[]; missing: string[] };
  titleRelevance: { score: number; max: number; note: string };
  yearsOfExperience: { score: number; max: number; note: string };
  sectionCoverage: { score: number; max: number; missing: string[] };
  formatting: { score: number; max: number; issues: string[] };
  softSkillsAndVerbs: { score: number; max: number; matched: string[] };
};
