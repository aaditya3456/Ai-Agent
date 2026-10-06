import { jest } from '@jest/globals';
import { env } from '../src/config/env.js';
import {
  formatAIError,
  callLLMWithTools,
  parseResumeProfile,
  analyzeJobDescription,
  convertOpenAIToolsToGemini,
  convertOpenAIMessagesToGemini,
  getGeminiClient,
  getOpenAIClient,
} from '../src/services/aiService.js';
import { toolDefinitions, executeAgentTool } from '../src/tools/agentTools.js';

describe('Google Gemini Native API (@google/genai) & Multi-Provider Suite', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('A. Environment Resolution & Provider Switching', () => {
    it('should correctly resolve Gemini defaults when AI_PROVIDER is gemini', () => {
      delete process.env.AI_BASE_URL;
      delete process.env.AI_MODEL;
      process.env.AI_PROVIDER = 'gemini';

      expect(env.AI_PROVIDER).toBe('gemini');
      expect(env.AI_MODEL).toBe('gemini-3.7-flash');
    });

    it('should preserve OpenAI defaults when AI_PROVIDER is openai', () => {
      delete process.env.AI_BASE_URL;
      delete process.env.AI_MODEL;
      process.env.AI_PROVIDER = 'openai';

      expect(env.AI_PROVIDER).toBe('openai');
      expect(env.AI_BASE_URL).toBe('https://api.openai.com/v1');
      expect(env.AI_MODEL).toBe('gpt-4o-mini');
    });

    it('should allow custom model overrides under Gemini', () => {
      process.env.AI_PROVIDER = 'gemini';
      process.env.AI_MODEL = 'gemini-3.5-flash-lite';

      expect(env.AI_PROVIDER).toBe('gemini');
      expect(env.AI_MODEL).toBe('gemini-3.5-flash-lite');
    });
  });

  describe('B. Client Isolation (Credential Safety)', () => {
    it('should return null when AI_API_KEY is missing', () => {
      process.env.AI_API_KEY = '';
      expect(getGeminiClient()).toBeNull();
      expect(getOpenAIClient()).toBeNull();
    });

    it('should initialize separate clients without leaking Gemini keys to OpenAI', () => {
      process.env.AI_API_KEY = 'test_key_gemini_12345';
      const gemini = getGeminiClient();
      expect(gemini).toBeDefined();
      expect(gemini.apiKey).toBe('test_key_gemini_12345');
    });
  });

  describe('C. Tool and Message Schema Conversion for Gemini Native', () => {
    it('should convert OpenAI toolDefinitions to Gemini functionDeclarations format', () => {
      const converted = convertOpenAIToolsToGemini(toolDefinitions);
      expect(Array.isArray(converted)).toBe(true);
      expect(converted.length).toBe(1);

      const decls = converted[0].functionDeclarations;
      expect(decls.length).toBe(toolDefinitions.length);

      const searchTool = decls.find((d) => d.name === 'searchJobs');
      expect(searchTool).toBeDefined();
      expect(searchTool.description).toBeDefined();
      expect(searchTool.parameters.type).toBe('OBJECT');
      expect(searchTool.parameters.properties.query.type).toBe('STRING');
      expect(searchTool.parameters.properties.limit.type).toBe('NUMBER');
    });

    it('should convert messages into Gemini contents and systemInstruction', () => {
      const messages = [
        { role: 'system', content: 'Act as career assistant' },
        { role: 'user', content: 'Hello' },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'searchJobs', arguments: '{"query":"node"}' },
              thoughtSignature: 'sig_123',
            },
          ],
        },
        {
          role: 'tool',
          tool_call_id: 'call_1',
          name: 'searchJobs',
          content: JSON.stringify({ count: 1 }),
        },
      ];

      const { systemInstruction, contents } = convertOpenAIMessagesToGemini(messages);
      expect(systemInstruction).toBe('Act as career assistant');
      expect(contents.length).toBe(3);

      // User prompt
      expect(contents[0].role).toBe('user');
      expect(contents[0].parts[0].text).toBe('Hello');

      // Model function call with thoughtSignature preserved
      expect(contents[1].role).toBe('model');
      expect(contents[1].parts[0].functionCall.name).toBe('searchJobs');
      expect(contents[1].parts[0].functionCall.args).toEqual({ query: 'node' });
      expect(contents[1].parts[0].thoughtSignature).toBe('sig_123');

      // User function response
      expect(contents[2].role).toBe('user');
      expect(contents[2].parts[0].functionResponse.name).toBe('searchJobs');
      expect(contents[2].parts[0].functionResponse.response).toEqual({ count: 1 });
    });
  });

  describe('D. Error Classification & Credential Redaction', () => {
    it('should categorize 401/403 as authentication error and redact API keys', () => {
      process.env.AI_PROVIDER = 'gemini';
      const rawError = {
        status: 401,
        message: 'API_KEY_INVALID: key=AIzaSySecretTestingKey is not authorized',
      };

      const result = formatAIError(rawError, 'authentication test');
      expect(result.errorType).toBe('Gemini API authentication error');
      expect(result.message).not.toContain('AIzaSySecretTestingKey');
      expect(result.message).toContain('key=[REDACTED]');
    });

    it('should categorize 429 and 503 high demand as quota/rate-limit error', () => {
      process.env.AI_PROVIDER = 'gemini';
      const raw503 = {
        status: 503,
        message: JSON.stringify({
          error: {
            code: 503,
            message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.',
            status: 'UNAVAILABLE',
          },
        }),
      };

      const result = formatAIError(raw503, 'job analysis');
      expect(result.errorType).toBe('Gemini quota/rate-limit error');
      expect(result.message).toContain('high demand');
    });

    it('should categorize 404 / unsupported models as model error', () => {
      process.env.AI_PROVIDER = 'gemini';
      const rawError = {
        status: 404,
        message: 'models/gemini-unknown-model is not found',
      };

      const result = formatAIError(rawError, 'model request');
      expect(result.errorType).toBe('Gemini model error');
    });

    it('should categorize tool execution error under tool-calling error', () => {
      process.env.AI_PROVIDER = 'gemini';
      const rawError = {
        message: 'Function call argument parsing failed for getUserResume',
      };

      const result = formatAIError(rawError, 'tool-calling execution');
      expect(result.errorType).toBe('Gemini tool-calling error');
    });
  });

  describe('E. Safe Fallback Behavior when AI_API_KEY is not configured', () => {
    it('callLLMWithTools should return local mode message without throwing when API key is missing', async () => {
      process.env.AI_API_KEY = '';
      const res = await callLLMWithTools({ messages: [{ role: 'user', content: 'Hello' }] });

      expect(res.finish_reason).toBe('stop');
      expect(res.message.role).toBe('assistant');
      expect(res.message.content).toContain('local mode');
    });

    it('parseResumeProfile should fallback deterministically without crashing', async () => {
      process.env.AI_API_KEY = '';
      const resumeSample = `
        Jane Doe
        Software Engineer
        Summary: Full stack developer with 4 years experience building web applications.
        Skills: React, Node.js, Python, PostgreSQL, Docker
        Experience:
        Senior Developer at Acme Corp (2021 - Present)
        - Led migration to microservices architecture.
        Education:
        B.S. Computer Science, University of California (2020)
        Projects:
        - Portfolio Website: Built with React and Node.js
      `;

      const parsed = await parseResumeProfile(resumeSample);
      expect(parsed).toBeDefined();
      expect(parsed.programmingLanguages).toContain('python');
      expect(parsed.frameworks).toContain('react');
      expect(parsed.experience.length).toBeGreaterThan(0);
      expect(parsed.education.length).toBeGreaterThan(0);
      expect(parsed.projects.length).toBeGreaterThan(0);
    });

    it('analyzeJobDescription should fallback deterministically without crashing', async () => {
      process.env.AI_API_KEY = '';
      const jobDesc = 'We are hiring a Senior React and Node.js Developer with 3+ years experience in MongoDB and Docker.';
      const analysis = await analyzeJobDescription(jobDesc, 'Senior Developer', 'Acme');

      expect(analysis).toBeDefined();
      expect(analysis.requiredSkills.length).toBeGreaterThan(0);
      expect(analysis.frameworks).toContain('react');
      expect(analysis.databases).toContain('mongodb');
    });
  });
});
