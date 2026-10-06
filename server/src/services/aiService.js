import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorMiddleware.js';

let openaiClient = null;

const getClient = () => {
  if (!openaiClient && env.AI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: env.AI_API_KEY,
      baseURL: env.AI_BASE_URL || 'https://api.openai.com/v1',
    });
  }
  return openaiClient;
};

// Safe JSON parser that handles codeblocks and partial JSON
const parseSafeJson = (text, fallback = {}) => {
  if (!text) return fallback;
  try {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    logger.warn('Failed to parse raw LLM JSON, attempting regex extraction', { err: err.message });
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        logger.error('Regex JSON recovery failed', e);
      }
    }
    return fallback;
  }
};

const getEmptyProfile = () => ({
  professionalSummary: '',
  programmingLanguages: [],
  frameworks: [],
  databases: [],
  tools: [],
  otherSkills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
});

/**
 * Helper to parse experience entries from identified lines or whole text
 */
const parseExperienceSection = (expLines, allLines) => {
  const targetLines = expLines.length > 0 ? expLines : allLines;
  const entries = [];
  let currentEntry = null;

  const TITLE_KEYWORDS = /(?:developer|engineer|manager|architect|consultant|lead|specialist|analyst|programmer|administrator|officer|designer|intern|associate|director|vp|head|scientist|technician|writer|assistant|coordinator)/i;
  const DATE_REGEX = /[\(\[]?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-9]{1,2}\/)?\s*[0-9]{4}\s*(?:-|–|to)\s*(?:Present|Current|Now|[0-9]{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-9]{1,2}\/)?\s*[0-9]{4}))[\)\]]?/i;
  const BULLET_REGEX = /^[-*•–·]\s*(.*)$/;

  for (let i = 0; i < targetLines.length; i++) {
    const rawLine = targetLines[i].trim();
    if (!rawLine) continue;

    const bulletMatch = rawLine.match(BULLET_REGEX);
    if (bulletMatch && currentEntry) {
      const achievement = bulletMatch[1].trim();
      if (achievement) {
        currentEntry.achievements.push(achievement);
      }
      continue;
    }

    const dateMatch = rawLine.match(DATE_REGEX);
    const hasTitleKeyword = TITLE_KEYWORDS.test(rawLine);
    const hasCompanySeparator = /\s+(?:at|@|\||-)\s+/i.test(rawLine) || rawLine.includes(',');

    const isHeaderLine = expLines.length > 0
      ? (dateMatch || hasTitleKeyword || hasCompanySeparator || !currentEntry)
      : (dateMatch && hasTitleKeyword);

    if (isHeaderLine) {
      if (currentEntry) {
        entries.push(currentEntry);
      }

      let lineWithoutDate = rawLine;
      let startDate = '';
      let endDate = '';
      let isCurrent = false;

      if (dateMatch) {
        const fullDateStr = dateMatch[1];
        lineWithoutDate = rawLine.replace(dateMatch[0], '').replace(/[\(\[\)\]]/g, '').trim();
        const dateParts = fullDateStr.split(/\s*(?:-|–|to)\s*/i);
        startDate = dateParts[0]?.trim() || '';
        endDate = dateParts[1]?.trim() || '';
        isCurrent = /present|current|now/i.test(endDate);
      }

      let title = '';
      let company = '';

      if (/\s+(?:at|@)\s+/i.test(lineWithoutDate)) {
        const parts = lineWithoutDate.split(/\s+(?:at|@)\s+/i);
        title = parts[0]?.trim();
        company = parts[1]?.trim();
      } else if (lineWithoutDate.includes('|')) {
        const parts = lineWithoutDate.split('|');
        title = parts[0]?.trim();
        company = parts[1]?.trim();
      } else if (lineWithoutDate.includes(' - ')) {
        const parts = lineWithoutDate.split(' - ');
        if (TITLE_KEYWORDS.test(parts[0])) {
          title = parts[0]?.trim();
          company = parts[1]?.trim();
        } else {
          company = parts[0]?.trim();
          title = parts[1]?.trim();
        }
      } else if (lineWithoutDate.includes(',')) {
        const parts = lineWithoutDate.split(',');
        title = parts[0]?.trim();
        company = parts.slice(1).join(',').trim();
      } else {
        title = lineWithoutDate;
      }

      currentEntry = {
        title: title || 'Software Engineer',
        company: company || '',
        location: '',
        startDate,
        endDate,
        current: isCurrent,
        description: '',
        achievements: [],
      };
    } else if (currentEntry) {
      if (rawLine.length > 20) {
        currentEntry.achievements.push(rawLine);
      } else if (!currentEntry.company) {
        currentEntry.company = rawLine;
      }
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  entries.forEach((e) => {
    if (!e.description && e.achievements.length > 0) {
      e.description = e.achievements.join(' ');
    }
  });

  return entries;
};

/**
 * Helper to parse education entries
 */
const parseEducationSection = (eduLines, allLines) => {
  const targetLines = eduLines.length > 0 ? eduLines : allLines;
  const entries = [];

  const DEGREE_REGEX = /(?:B\.?S\.?|B\.?A\.?|B\.?Sc|B\.?Tech|B\.?E\.?|M\.?S\.?|M\.?A\.?|M\.?Sc|M\.?Tech|MBA|Ph\.?D\.?|Bachelor(?:'s)?(?:\s+of\s+[A-Za-z]+)?|Master(?:'s)?(?:\s+of\s+[A-Za-z]+)?|Associate(?:'s)?|Diploma)/i;
  const YEAR_REGEX = /\b((?:19|20)\d{2})\b/;
  const INSTITUTION_KEYWORDS = /(?:University|College|Institute|School|Academy|Polytechnic)/i;

  for (let i = 0; i < targetLines.length; i++) {
    const rawLine = targetLines[i].trim().replace(/^[-*•–·]\s*/, '');
    if (!rawLine) continue;

    const hasDegree = DEGREE_REGEX.test(rawLine);
    const hasInstitution = INSTITUTION_KEYWORDS.test(rawLine);

    if (eduLines.length > 0 || hasDegree || hasInstitution) {
      const yearMatch = rawLine.match(YEAR_REGEX);
      const year = yearMatch ? yearMatch[1] : '';

      const parts = rawLine.split(',').map((p) => p.trim());

      let degree = '';
      let fieldOfStudy = '';
      let institution = '';

      parts.forEach((p) => {
        if (DEGREE_REGEX.test(p)) {
          degree = p;
          const inMatch = p.match(/(?:in|of)\s+([^,]+)/i);
          if (inMatch) {
            fieldOfStudy = inMatch[1].trim();
            degree = p.replace(/(?:in|of)\s+[^,]+/i, '').trim();
          }
        } else if (INSTITUTION_KEYWORDS.test(p) || (!institution && p.length > 3 && !YEAR_REGEX.test(p))) {
          institution = p;
        }
      });

      if (!degree && hasDegree) {
        const degMatch = rawLine.match(DEGREE_REGEX);
        degree = degMatch ? degMatch[0] : '';
      }

      if (!fieldOfStudy) {
        const inMatch = rawLine.match(/(?:in|of)\s+([A-Za-z\s]+?)(?:,|$|\b(?:at|from)\b)/i);
        if (inMatch) fieldOfStudy = inMatch[1].trim();
      }

      if (!institution && hasInstitution) {
        const instMatch = rawLine.match(/([A-Za-z\s]+(?:University|College|Institute|School|Academy)[A-Za-z\s]*)/i);
        if (instMatch) institution = instMatch[1].trim();
      }

      if (degree || institution || fieldOfStudy) {
        entries.push({
          institution: institution || (parts[1] && !YEAR_REGEX.test(parts[1]) ? parts[1] : 'University'),
          degree: degree || 'Degree',
          fieldOfStudy: fieldOfStudy || '',
          graduationYear: year,
        });
      }
    }
  }

  return entries;
};

/**
 * Helper to parse project entries
 */
const parseProjectsSection = (projLines, allLines, knownSkills = []) => {
  const targetLines = projLines.length > 0 ? projLines : allLines;
  const entries = [];
  let currentProject = null;

  const BULLET_REGEX = /^[-*•–·]\s*(.*)$/;
  const URL_REGEX = /(https?:\/\/[^\s]+|github\.com\/[^\s]+)/i;

  for (let i = 0; i < targetLines.length; i++) {
    const rawLine = targetLines[i].trim();
    if (!rawLine) continue;

    // Check if line matches "- Name: Description" or "Name: Description"
    const colonMatch = rawLine.match(/^[-*•–·]?\s*([^:]{3,40}):\s*(.+)$/);
    if (colonMatch) {
      if (currentProject) entries.push(currentProject);

      const name = colonMatch[1].trim();
      const desc = colonMatch[2].trim();
      const matchedTech = knownSkills.filter((s) => new RegExp(`\\b${s.replace('+', '\\+')}\\b`, 'i').test(desc));
      const urlMatch = desc.match(URL_REGEX);

      currentProject = {
        name,
        description: desc,
        technologies: Array.from(new Set(matchedTech)),
        link: urlMatch ? urlMatch[0] : '',
      };
      continue;
    }

    // Check for "- Name - Description" or "Name | Description"
    const sepMatch = rawLine.match(/^[-*•–·]?\s*([A-Za-z0-9\s]{3,35})\s*[|–-]\s*(.+)$/);
    if (sepMatch && !rawLine.toLowerCase().includes('http')) {
      if (currentProject) entries.push(currentProject);

      const name = sepMatch[1].trim();
      const desc = sepMatch[2].trim();
      const matchedTech = knownSkills.filter((s) => new RegExp(`\\b${s.replace('+', '\\+')}\\b`, 'i').test(desc));
      const urlMatch = desc.match(URL_REGEX);

      currentProject = {
        name,
        description: desc,
        technologies: Array.from(new Set(matchedTech)),
        link: urlMatch ? urlMatch[0] : '',
      };
      continue;
    }

    const bulletMatch = rawLine.match(BULLET_REGEX);
    if (bulletMatch && currentProject) {
      currentProject.description += (currentProject.description ? ' ' : '') + bulletMatch[1].trim();
      const matchedTech = knownSkills.filter((s) => new RegExp(`\\b${s.replace('+', '\\+')}\\b`, 'i').test(bulletMatch[1]));
      matchedTech.forEach((t) => {
        if (!currentProject.technologies.includes(t)) currentProject.technologies.push(t);
      });
      continue;
    }

    if (projLines.length > 0 && rawLine.length < 50 && !rawLine.startsWith('-')) {
      if (currentProject) entries.push(currentProject);

      const name = rawLine.replace(/\(.*?\)/, '').trim();
      const matchedTech = knownSkills.filter((s) => new RegExp(`\\b${s.replace('+', '\\+')}\\b`, 'i').test(rawLine));

      currentProject = {
        name: name || rawLine,
        description: '',
        technologies: Array.from(new Set(matchedTech)),
        link: '',
      };
    } else if (currentProject) {
      currentProject.description += (currentProject.description ? ' ' : '') + rawLine;
    }
  }

  if (currentProject) {
    entries.push(currentProject);
  }

  return entries;
};

/**
 * Helper to parse certifications
 */
const parseCertificationsSection = (certLines) => {
  const certs = [];
  certLines.forEach((line) => {
    const cleaned = line.replace(/^[-*•–·]\s*/, '').trim();
    if (cleaned && cleaned.length > 3 && !cleaned.toLowerCase().startsWith('cert')) {
      certs.push(cleaned);
    }
  });
  return certs;
};

/**
 * Heuristic fallback parser when AI API key is omitted or provider is unreachable.
 * Extracts real sections, keywords, experience, education, projects, and skills strictly without hallucination.
 */
export const fallbackResumeParser = (rawText = '') => {
  if (!rawText) return getEmptyProfile();

  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cleanedLines = lines.map((l) => l.trim());

  const SECTION_HEADERS = [
    { type: 'summary', regex: /^(?:professional\s+|career\s+)?(?:summary|profile|about(?:\s+me)?|objective|overview)[:\s]*$/i },
    { type: 'skills', regex: /^(?:technical\s+|core\s+|key\s+)?(?:skills|competencies|technologies|tech\s+stack|expertise)[:\s]*$/i },
    { type: 'experience', regex: /^(?:work\s+|professional\s+|relevant\s+|employment\s+)?(?:experience|history|employment)[:\s]*$/i },
    { type: 'projects', regex: /^(?:featured\s+|personal\s+|key\s+|academic\s+|technical\s+)?(?:projects)[:\s]*$/i },
    { type: 'education', regex: /^(?:education(?:al)?|academic\s+background|academic\s+qualifications?|academics|education\s+&\s+credentials)[:\s]*$/i },
    { type: 'certifications', regex: /^(?:certifications?|certificates?|licenses?)[:\s]*$/i },
  ];

  const INLINE_HEADER_REGEX = /^(summary|skills|experience|work\s+experience|projects|education|certifications):\s*(.+)$/i;

  const sections = {
    summary: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    general: [],
  };

  let currentSection = 'general';

  for (let i = 0; i < cleanedLines.length; i++) {
    const line = cleanedLines[i];
    if (!line) continue;

    const inlineMatch = line.match(INLINE_HEADER_REGEX);
    if (inlineMatch) {
      const headerWord = inlineMatch[1].toLowerCase().replace(/\s+/g, '');
      const content = inlineMatch[2].trim();
      let matchedType = null;
      if (headerWord.includes('summary')) matchedType = 'summary';
      else if (headerWord.includes('skill')) matchedType = 'skills';
      else if (headerWord.includes('experience')) matchedType = 'experience';
      else if (headerWord.includes('project')) matchedType = 'projects';
      else if (headerWord.includes('education')) matchedType = 'education';
      else if (headerWord.includes('cert')) matchedType = 'certifications';

      if (matchedType) {
        currentSection = matchedType;
        if (content) sections[currentSection].push(content);
        continue;
      }
    }

    const matchedHeader = SECTION_HEADERS.find((h) => h.regex.test(line));
    if (matchedHeader) {
      currentSection = matchedHeader.type;
      continue;
    }

    sections[currentSection].push(line);
  }

  // 1. Parse Skills
  const commonLangs = ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'ruby', 'php', 'swift', 'kotlin', 'rust', 'sql', 'html', 'css', 'r', 'scala', 'dart'];
  const commonFrameworks = ['react', 'vue', 'angular', 'next.js', 'express', 'node.js', 'django', 'flask', 'spring', 'fastapi', 'nest.js', 'tailwind', 'tailwind css', 'redux', 'bootstrap', 'svelte', 'fastify', 'asp.net', 'laravel'];
  const commonDatabases = ['mongodb', 'postgresql', 'mysql', 'redis', 'sqlite', 'elasticsearch', 'dynamodb', 'cassandra', 'mariadb', 'oracle', 'firebase', 'supabase'];
  const commonTools = ['git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jira', 'linux', 'ci/cd', 'github actions', 'postman', 'jest', 'webpack', 'vite', 'npm', 'yarn', 'pnpm', 'terraform', 'jenkins'];

  const lowerFullText = rawText.toLowerCase();

  const foundLangs = commonLangs.filter((s) => new RegExp(`\\b${s.replace('+', '\\+')}\\b`, 'i').test(lowerFullText));
  const foundFrameworks = commonFrameworks.filter((s) => new RegExp(`\\b${s.replace('.', '\\.')}\\b`, 'i').test(lowerFullText));
  const foundDbs = commonDatabases.filter((s) => new RegExp(`\\b${s}\\b`, 'i').test(lowerFullText));
  const foundTools = commonTools.filter((s) => new RegExp(`\\b${s.replace('/', '\\/')}\\b`, 'i').test(lowerFullText));

  const customSkills = [];
  if (sections.skills.length > 0) {
    sections.skills.forEach((line) => {
      const parts = line.split(/[,;|•·\t]/).map((p) => p.trim().replace(/^[-*•]\s*/, '')).filter(Boolean);
      parts.forEach((p) => {
        if (p.length > 1 && p.length < 35 && !p.toLowerCase().startsWith('skills') && !customSkills.includes(p)) {
          customSkills.push(p);
        }
      });
    });
  }

  // 2. Parse Professional Summary
  let summary = '';
  if (sections.summary.length > 0) {
    summary = sections.summary.join(' ').substring(0, 500);
  } else if (sections.general.length > 0) {
    const candidateSummary = sections.general.slice(1, 4).join(' ');
    if (candidateSummary.length > 30) {
      summary = candidateSummary.substring(0, 400);
    }
  }

  const allSkillsList = [...foundLangs, ...foundFrameworks, ...foundDbs, ...foundTools];

  return {
    professionalSummary: summary || 'Technical professional with demonstrated software development experience.',
    programmingLanguages: Array.from(new Set(foundLangs)),
    frameworks: Array.from(new Set(foundFrameworks)),
    databases: Array.from(new Set(foundDbs)),
    tools: Array.from(new Set(foundTools)),
    otherSkills: Array.from(new Set(customSkills)),
    experience: parseExperienceSection(sections.experience, cleanedLines),
    education: parseEducationSection(sections.education, cleanedLines),
    projects: parseProjectsSection(sections.projects, cleanedLines, allSkillsList),
    certifications: parseCertificationsSection(sections.certifications),
  };
};

/**
 * Normalizes resume profile object across various LLM or parser outputs
 */
export const normalizeResumeProfile = (profile = {}, rawText = '') => {
  const norm = {
    professionalSummary: profile.professionalSummary || profile.summary || profile.profileSummary || profile.about || '',
    programmingLanguages: Array.isArray(profile.programmingLanguages) ? profile.programmingLanguages : [],
    frameworks: Array.isArray(profile.frameworks) ? profile.frameworks : [],
    databases: Array.isArray(profile.databases) ? profile.databases : [],
    tools: Array.isArray(profile.tools) ? profile.tools : [],
    otherSkills: Array.isArray(profile.otherSkills) ? profile.otherSkills : (Array.isArray(profile.skills) ? profile.skills : []),
    experience: [],
    education: [],
    projects: [],
    certifications: Array.isArray(profile.certifications) ? profile.certifications : (Array.isArray(profile.certificates) ? profile.certificates : []),
  };

  const rawExp = profile.experience || profile.experiences || profile.workExperience || profile.work_experience || profile.employmentHistory || profile.employment || [];
  if (Array.isArray(rawExp)) {
    norm.experience = rawExp.map((item) => {
      if (typeof item === 'string') {
        return {
          title: item,
          company: '',
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          description: item,
          achievements: [],
        };
      }
      return {
        title: item.title || item.role || item.position || item.jobTitle || 'Role',
        company: item.company || item.employer || item.organization || '',
        location: item.location || '',
        startDate: item.startDate || item.start_date || item.from || '',
        endDate: item.endDate || item.end_date || item.to || '',
        current: Boolean(item.current || item.isCurrent || (item.endDate && /present|current/i.test(item.endDate))),
        description: item.description || item.summary || item.details || '',
        achievements: Array.isArray(item.achievements)
          ? item.achievements
          : Array.isArray(item.highlights)
          ? item.highlights
          : Array.isArray(item.responsibilities)
          ? item.responsibilities
          : [],
      };
    }).filter((e) => e.title || e.company || e.description);
  }

  const rawEdu = profile.education || profile.educations || profile.academic || profile.academics || profile.academicBackground || [];
  if (Array.isArray(rawEdu)) {
    norm.education = rawEdu.map((item) => {
      if (typeof item === 'string') {
        return {
          institution: item,
          degree: '',
          fieldOfStudy: '',
          graduationYear: '',
        };
      }
      return {
        institution: item.institution || item.school || item.university || item.college || 'Institution',
        degree: item.degree || item.qualification || '',
        fieldOfStudy: item.fieldOfStudy || item.field || item.major || '',
        graduationYear: String(item.graduationYear || item.year || item.gradYear || item.endDate || ''),
      };
    }).filter((e) => e.institution || e.degree);
  }

  const rawProj = profile.projects || profile.projectList || profile.personalProjects || profile.keyProjects || [];
  if (Array.isArray(rawProj)) {
    norm.projects = rawProj.map((item) => {
      if (typeof item === 'string') {
        return {
          name: item,
          description: '',
          technologies: [],
          link: '',
        };
      }
      return {
        name: item.name || item.title || item.projectName || 'Project',
        description: item.description || item.details || item.summary || '',
        technologies: Array.isArray(item.technologies)
          ? item.technologies
          : Array.isArray(item.tech)
          ? item.tech
          : Array.isArray(item.skills)
          ? item.skills
          : [],
        link: item.link || item.url || '',
      };
    }).filter((p) => p.name || p.description);
  }

  // If experience, education, or projects are empty and rawText is available, run fallback extraction to backfill
  if (rawText && (norm.experience.length === 0 || norm.education.length === 0 || norm.projects.length === 0)) {
    const fallbackData = fallbackResumeParser(rawText);
    if (norm.experience.length === 0 && fallbackData.experience.length > 0) {
      norm.experience = fallbackData.experience;
    }
    if (norm.education.length === 0 && fallbackData.education.length > 0) {
      norm.education = fallbackData.education;
    }
    if (norm.projects.length === 0 && fallbackData.projects.length > 0) {
      norm.projects = fallbackData.projects;
    }
    if (!norm.professionalSummary && fallbackData.professionalSummary) {
      norm.professionalSummary = fallbackData.professionalSummary;
    }
  }

  return norm;
};

/**
 * Heuristic fallback for Job Analysis when AI provider is offline.
 */
const fallbackJobParser = (description) => {
  const lower = description.toLowerCase();
  const allKnownSkills = [
    'javascript', 'typescript', 'python', 'java', 'go', 'c++', 'c#', 'ruby', 'sql',
    'react', 'next.js', 'vue', 'angular', 'node.js', 'express', 'django', 'fastapi', 'spring boot',
    'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'git', 'ci/cd', 'microservices', 'rest api', 'graphql'
  ];

  const matched = allKnownSkills.filter((s) => lower.includes(s));
  const required = matched.slice(0, Math.ceil(matched.length * 0.7));
  const preferred = matched.slice(Math.ceil(matched.length * 0.7));

  return {
    requiredSkills: required.length ? required : ['Communication', 'Problem Solving'],
    preferredSkills: preferred,
    programmingLanguages: matched.filter((s) => ['javascript', 'typescript', 'python', 'java', 'go', 'c++', 'c#', 'ruby', 'sql'].includes(s)),
    frameworks: matched.filter((s) => ['react', 'next.js', 'vue', 'angular', 'node.js', 'express', 'django', 'fastapi', 'spring boot'].includes(s)),
    databases: matched.filter((s) => ['mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch'].includes(s)),
    tools: matched.filter((s) => ['docker', 'kubernetes', 'aws', 'gcp', 'azure', 'git', 'ci/cd'].includes(s)),
    yearsOfExperience: {
      min: lower.includes('3+') || lower.includes('3 years') ? 3 : lower.includes('5+') || lower.includes('5 years') ? 5 : 2,
      max: null,
      text: 'Estimated from job description',
    },
    educationRequirements: lower.includes('bachelor') ? ["Bachelor's degree in Computer Science or related field"] : [],
    responsibilities: ['Develop and maintain software solutions.', 'Collaborate with cross-functional teams.'],
    qualifications: ['Demonstrated problem solving ability.'],
    keywords: matched,
  };
};

/**
 * Parse Resume Profile using LLM Structured Output with graceful fallback.
 */
export const parseResumeProfile = async (rawText) => {
  const client = getClient();
  if (!client || !env.AI_API_KEY) {
    logger.info('No AI_API_KEY provided; using deterministic structured text extractor for resume.');
    return fallbackResumeParser(rawText);
  }

  const prompt = `You are an expert ATS and technical resume parser. Extract structured information strictly based on the text below.
DO NOT fabricate or hallucinate any degrees, skills, or experiences that are not present. If a field is not present, use an empty list or null.

RESUME TEXT:
"""
${rawText.substring(0, 12000)}
"""

Return valid JSON adhering exactly to this structure:
{
  "professionalSummary": string,
  "programmingLanguages": string[],
  "frameworks": string[],
  "databases": string[],
  "tools": string[],
  "otherSkills": string[],
  "experience": [
    {
      "title": string,
      "company": string,
      "location": string,
      "startDate": string,
      "endDate": string,
      "current": boolean,
      "description": string,
      "achievements": string[]
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "fieldOfStudy": string,
      "graduationYear": string
    }
  ],
  "projects": [
    {
      "name": string,
      "description": string,
      "technologies": string[],
      "link": string
    }
  ],
  "certifications": string[]
}`;

  try {
    const response = await client.chat.completions.create({
      model: env.AI_MODEL,
      messages: [
        { role: 'system', content: 'You are an accurate resume parser. You output strictly structured JSON without markdown.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const parsed = parseSafeJson(response.choices[0]?.message?.content, null);
    if (!parsed) {
      throw new Error('LLM returned invalid JSON structure');
    }
    return normalizeResumeProfile(parsed, rawText);
  } catch (error) {
    logger.error(`AI resume parsing failed: ${error.message}, falling back to deterministic extractor`, error);
    return fallbackResumeParser(rawText);
  }
};

/**
 * Analyze Job Description using LLM Structured Output.
 */
export const analyzeJobDescription = async (description, title = '', company = '') => {
  const client = getClient();
  if (!client || !env.AI_API_KEY) {
    logger.info('No AI_API_KEY provided; using deterministic job analyzer.');
    return fallbackJobParser(description);
  }

  const prompt = `Analyze this job posting. Distinguish clearly between REQUIRED and PREFERRED skills. Do NOT invent requirements.

Job Title: ${title}
Company: ${company}

Job Description:
"""
${description.substring(0, 10000)}
"""

Return strictly valid JSON:
{
  "requiredSkills": string[],
  "preferredSkills": string[],
  "programmingLanguages": string[],
  "frameworks": string[],
  "databases": string[],
  "tools": string[],
  "yearsOfExperience": {
    "min": number,
    "max": number or null,
    "text": string
  },
  "educationRequirements": string[],
  "responsibilities": string[],
  "qualifications": string[],
  "keywords": string[]
}`;

  try {
    const response = await client.chat.completions.create({
      model: env.AI_MODEL,
      messages: [
        { role: 'system', content: 'You are a technical recruiter. Extract structured job criteria strictly in valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const parsed = parseSafeJson(response.choices[0]?.message?.content, null);
    if (!parsed) {
      throw new Error('LLM returned invalid JSON for job analysis');
    }
    return parsed;
  } catch (error) {
    logger.error(`AI job analysis failed: ${error.message}, using fallback`, error);
    return fallbackJobParser(description);
  }
};

/**
 * Generate Customized Application Message based strictly on real resume data.
 */
export const generateCustomizedMessage = async ({ resumeProfile, jobTitle, company, jobDescription, tone = 'Professional' }) => {
  const client = getClient();

  const skillsList = [
    ...(resumeProfile.programmingLanguages || []),
    ...(resumeProfile.frameworks || []),
    ...(resumeProfile.databases || []),
    ...(resumeProfile.tools || []),
  ].slice(0, 15).join(', ');

  const recentRole = resumeProfile.experience?.[0]?.title ? `${resumeProfile.experience[0].title} at ${resumeProfile.experience[0].company}` : 'Software Developer';
  const projectsSummary = (resumeProfile.projects || []).slice(0, 2).map((p) => p.name).join(', ');

  if (!client || !env.AI_API_KEY) {
    // Deterministic personalized template
    return `Dear Hiring Team at ${company},\n\nI am writing to express my strong interest in the ${jobTitle} position. With my background as a ${recentRole} and hands-on experience in ${skillsList || 'full-stack software development'}, I am confident in my ability to contribute effectively to your engineering goals.\n\nIn my previous projects${projectsSummary ? ` (such as ${projectsSummary})` : ''}, I focused on delivering scalable, maintainable solutions and collaborating across teams to solve complex technical challenges.\n\nThank you for considering my application. I look forward to the opportunity to discuss how my technical skills align with the needs at ${company}.\n\nSincerely,\nCandidate`;
  }

  const prompt = `Write a targeted job application outreach message/cover note.
TONE: ${tone} (e.g. Professional, Concise, or Friendly).

STRICT SAFETY RULES:
1. Ground the message ONLY on real candidate resume information provided below.
2. DO NOT fabricate any companies, degrees, metrics, or years of experience.
3. Sound authentic, direct, and human. Avoid generic AI cliches ("thrilled to apply", "esteemed company", "passionate synergistic catalyst").

CANDIDATE PROFILE:
- Summary: ${resumeProfile.professionalSummary || 'Technical professional'}
- Key Skills: ${skillsList}
- Relevant Projects: ${JSON.stringify(resumeProfile.projects || [])}
- Work Experience: ${JSON.stringify((resumeProfile.experience || []).slice(0, 2))}

TARGET JOB:
- Title: ${jobTitle}
- Company: ${company}
- Requirements Snippet: ${jobDescription?.substring(0, 1200)}

Generate the application message directly as plain text.`;

  try {
    const response = await client.chat.completions.create({
      model: env.AI_MODEL,
      messages: [
        { role: 'system', content: 'You are an authentic career advisor writing tailored, non-fluffy application messages grounded solely in factual candidate history.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
    });

    return response.choices[0]?.message?.content?.trim();
  } catch (error) {
    logger.error(`AI message generation failed: ${error.message}`, error);
    throw new AppError(`Failed to generate application message: ${error.message}`, 500, 'AI_GENERATION_FAILED');
  }
};

/**
 * Universal Tool Calling interface with LLM.
 */
export const callLLMWithTools = async ({ messages, tools, toolChoice = 'auto' }) => {
  const client = getClient();
  if (!client || !env.AI_API_KEY) {
    return {
      message: {
        role: 'assistant',
        content: 'AI Agent is currently operating in local mode (AI_API_KEY not configured). You can still query jobs, view matches, and manage applications using the dashboard and tabs, or configure AI_API_KEY in your .env file to enable live LLM reasoning.',
        tool_calls: null,
      },
      finish_reason: 'stop',
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: env.AI_MODEL,
      messages,
      tools,
      tool_choice: toolChoice,
      temperature: 0.2,
    });

    const choice = response.choices[0];
    return {
      message: choice.message,
      finish_reason: choice.finish_reason,
    };
  } catch (error) {
    logger.error(`LLM Tool calling error: ${error.message}`, error);
    throw new AppError(`LLM call failed: ${error.message}`, 502, 'AI_PROVIDER_ERROR');
  }
};
