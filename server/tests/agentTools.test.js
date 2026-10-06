import mongoose from 'mongoose';
import { setupTestDB } from './setup.js';
import { User } from '../src/models/User.js';
import { Job } from '../src/models/Job.js';
import { Resume } from '../src/models/Resume.js';
import { executeAgentTool } from '../src/tools/agentTools.js';

setupTestDB();

describe('Agent Controlled Tools & Authorization Security', () => {
  let user1Id;
  let user2Id;

  beforeEach(async () => {
    const user1 = await User.create({
      name: 'Agent User 1',
      email: 'agent1@example.com',
      passwordHash: 'fakehash',
    });
    user1Id = user1._id;

    const user2 = await User.create({
      name: 'Agent User 2',
      email: 'agent2@example.com',
      passwordHash: 'fakehash',
    });
    user2Id = user2._id;

    // Create resume for user 1
    await Resume.create({
      userId: user1Id,
      fileName: 'agent1_resume.pdf',
      fileType: 'pdf',
      rawText: 'Resume text',
      skills: ['python', 'fastapi', 'postgresql'],
      parsedProfile: { professionalSummary: 'Backend Python Engineer' },
    });

    // Create job for user 1
    await Job.create({
      userId: user1Id,
      title: 'Senior Python Engineer',
      company: 'PyCorp',
      description: 'Requirements: Python, FastAPI, and PostgreSQL.',
      skills: ['python', 'fastapi'],
    });
  });

  it('getUserResume should retrieve only calling user resume', async () => {
    // Calling for user1
    const res1 = await executeAgentTool('getUserResume', {}, user1Id);
    expect(res1.success).toBe(true);
    expect(res1.skills).toContain('python');

    // Calling for user2 (who has no resume)
    const res2 = await executeAgentTool('getUserResume', {}, user2Id);
    expect(res2.success).toBe(false);
    expect(res2.message).toContain('No resume found');
  });

  it('searchJobs should never return jobs of another user', async () => {
    const res1 = await executeAgentTool('searchJobs', { query: 'Python' }, user1Id);
    expect(res1.success).toBe(true);
    expect(res1.count).toBe(1);

    const res2 = await executeAgentTool('searchJobs', { query: 'Python' }, user2Id);
    expect(res2.success).toBe(true);
    expect(res2.count).toBe(0);
  });

  it('saveJob should create new job bound to the authenticated user', async () => {
    const saveRes = await executeAgentTool(
      'saveJob',
      {
        title: 'Full Stack Dev',
        company: 'Veloce',
        description: 'React, Node.js, and TypeScript role.',
      },
      user1Id
    );

    expect(saveRes.success).toBe(true);
    const createdJob = await Job.findById(saveRes.job.id);
    expect(createdJob).toBeDefined();
    expect(createdJob.userId.toString()).toBe(user1Id.toString());
  });

  it('updateApplicationStatus should update status and record pipeline timeline', async () => {
    const jobs = await Job.find({ userId: user1Id });
    const jobId = jobs[0]._id.toString();

    const updateRes = await executeAgentTool(
      'updateApplicationStatus',
      {
        jobId,
        status: 'Interview',
        notes: 'Round 1 technical phone screen scheduled.',
      },
      user1Id
    );

    expect(updateRes.success).toBe(true);
    expect(updateRes.message).toContain('Interview');
  });
});
