import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB } from './setup.js';

setupTestDB();

describe('Job Management & Authorization Boundaries', () => {
  let tokenUserA;
  let tokenUserB;

  beforeEach(async () => {
    const resA = await request(app).post('/api/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'password123',
    });
    tokenUserA = resA.body.data.token;

    const resB = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'password123',
    });
    tokenUserB = resB.body.data.token;
  });

  it('should allow user to create a job posting with auto-analysis', async () => {
    const jobData = {
      title: 'Senior Backend Engineer',
      company: 'TechCorp',
      location: 'Remote',
      description: 'We need an experienced Node.js and MongoDB engineer with Docker and Redis skills.',
    };

    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send(jobData);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.job.title).toBe(jobData.title);
    expect(res.body.data.job.company).toBe(jobData.company);
    expect(res.body.data.job.parsedAnalysis.isAnalyzed).toBe(true);
  });

  it('should list jobs belonging ONLY to the authenticated user', async () => {
    // User A creates 2 jobs
    await request(app).post('/api/jobs').set('Authorization', `Bearer ${tokenUserA}`).send({
      title: 'Job 1',
      company: 'Company A',
      description: 'Requirement: React, TypeScript, and Tailwind CSS.',
    });
    await request(app).post('/api/jobs').set('Authorization', `Bearer ${tokenUserA}`).send({
      title: 'Job 2',
      company: 'Company B',
      description: 'Requirement: Python, Django, and PostgreSQL.',
    });

    // User B creates 1 job
    await request(app).post('/api/jobs').set('Authorization', `Bearer ${tokenUserB}`).send({
      title: 'User B Job',
      company: 'Company C',
      description: 'Requirement: Java and Spring Boot.',
    });

    // User A fetches jobs
    const resA = await request(app).get('/api/jobs').set('Authorization', `Bearer ${tokenUserA}`);
    expect(resA.status).toBe(200);
    expect(resA.body.data.jobs.length).toBe(2);

    // User B fetches jobs
    const resB = await request(app).get('/api/jobs').set('Authorization', `Bearer ${tokenUserB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.data.jobs.length).toBe(1);
    expect(resB.body.data.jobs[0].title).toBe('User B Job');
  });

  it('should PREVENT User B from accessing or updating User A job (Authorization Security)', async () => {
    const createRes = await request(app).post('/api/jobs').set('Authorization', `Bearer ${tokenUserA}`).send({
      title: 'Secret Project Job',
      company: 'Private Corp',
      description: 'High security clearance engineering role with Kubernetes and Go.',
    });
    const jobId = createRes.body.data.job._id;

    // User B tries to get User A's job
    const getRes = await request(app)
      .get(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(getRes.status).toBe(404); // Kept 404 to avoid leaking existence across tenants

    // User B tries to update User A's job
    const updateRes = await request(app)
      .patch(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({ title: 'Hacked Title' });

    expect(updateRes.status).toBe(404);
  });
});
