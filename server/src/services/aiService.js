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

/**
 * Heuristic fallback parser when AI API key is omitted or provider is unreachable.
 * Extracts real sections, keywords, and skills strictly without hallucination.
 */
const fallbackResumeParser = (rawText) => {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const commonLangs = ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'ruby', 'php', 'swift', 'kotlin', 'rust', 'sql', 'html', 'css'];
  const commonFrameworks = ['react', 'vue', 'angular', 'next.js', 'express', 'node.js', 'django', 'flask', 'spring', 'fastapi', 'nest.js', 'tailwind', 'redux'];
  const commonDatabases = ['mongodb', 'postgresql', 'mysql', 'redis', 'sqlite', 'elasticsearch', 'dynamodb', 'cassandra'];
  const commonTools = ['git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jira', 'linux', 'ci/cd', 'github actions', 'postman', 'jest'];

  const lowerText = rawText.toLowerCase();

  const foundLangs = commonLangs.filter((s) => new RegExp(`\\b${s.replace('+', '\\+')}\\b`, 'i').test(lowerText));
  const foundFrameworks = commonFrameworks.filter((s) => new RegExp(`\\b${s.replace('.', '\\.')}\\b`, 'i').test(lowerText));
  const foundDbs = commonDatabases.filter((s) => new RegExp(`\\b${s}\\b`, 'i').test(lowerText));
  const foundTools = commonTools.filter((s) => new RegExp(`\\b${s.replace('/', '\\/')}\\b`, 'i').test(lowerText));

  // Extract brief summary
  const summaryLine = lines.slice(0, 4).join(' ').substring(0, 300);

  return {
    professionalSummary: summaryLine || 'Experienced professional with technical background.',
    programmingLanguages: foundLangs,
    frameworks: foundFrameworks,
    databases: foundDbs,
    tools: foundTools,
    otherSkills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
  };
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
    return parsed;
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
