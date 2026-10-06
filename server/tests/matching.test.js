import { compareResumeToJob } from '../src/services/matchingService.js';

describe('Resume-Job Matching Heuristic Service', () => {
  const mockResume = {
    skills: ['react', 'node.js', 'typescript', 'mongodb'],
    parsedProfile: {
      programmingLanguages: ['typescript', 'javascript'],
      frameworks: ['react', 'node.js', 'express'],
      databases: ['mongodb'],
      tools: ['docker', 'git'],
      projects: [
        {
          name: 'Realtime Chat',
          description: 'Websocket chat using React and Node.js',
          technologies: ['react', 'node.js'],
        },
      ],
      experience: [
        {
          title: 'Full Stack Engineer',
          company: 'CloudWorks',
          description: 'Maintained React frontend and Node.js microservices',
          achievements: ['Increased performance using MongoDB indexing'],
        },
      ],
    },
  };

  const mockJob = {
    skills: ['React', 'Node.js', 'AWS', 'Kubernetes'],
    parsedAnalysis: {
      requiredSkills: ['React', 'Node.js', 'AWS'],
      preferredSkills: ['Kubernetes', 'TypeScript'],
      programmingLanguages: ['TypeScript'],
      frameworks: ['React', 'Node.js'],
    },
  };

  it('should accurately calculate matched and missing skills', () => {
    const result = compareResumeToJob(mockResume, mockJob);

    expect(result.isMatched).toBe(true);
    expect(result.matchedSkills).toContain('React');
    expect(result.matchedSkills).toContain('Node.js');
    expect(result.missingRequiredSkills).toContain('AWS');
    expect(result.missingPreferredSkills).toContain('Kubernetes');
    expect(result.matchScore).toBeGreaterThan(0);
    expect(result.matchScore).toBeLessThanOrEqual(100);
  });

  it('should identify relevant projects based on technology overlap', () => {
    const result = compareResumeToJob(mockResume, mockJob);

    expect(result.relevantProjects.length).toBeGreaterThan(0);
    expect(result.relevantProjects[0].name).toBe('Realtime Chat');
  });

  it('should generate transparent analysis without claiming hiring guarantees', () => {
    const result = compareResumeToJob(mockResume, mockJob);

    expect(result.analysis).toContain('heuristic');
    expect(result.analysis).toContain('not a hiring guarantee');
    expect(result.analysis).toContain('overlap');
  });
});
