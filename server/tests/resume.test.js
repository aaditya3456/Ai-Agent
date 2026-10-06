import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB } from './setup.js';

setupTestDB();

describe('Resume Management & File Extraction', () => {
  let tokenUserA;
  let tokenUserB;

  beforeEach(async () => {
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Alice Tech',
      email: 'alice@example.com',
      password: 'password123',
    });
    tokenUserA = resA.body.data.token;

    const resB = await request(app).post('/api/auth/register').send({
      name: 'Bob Dev',
      email: 'bob@example.com',
      password: 'password123',
    });
    tokenUserB = resB.body.data.token;
  });

  it('should upload a text-based resume, parse skills and return structured document', async () => {
    const resumeBuffer = Buffer.from(
      `Alice Tech
Senior Software Engineer
Summary: Proven full-stack engineer with 5 years building scalable web services.
Skills: JavaScript, TypeScript, React, Node.js, Express, MongoDB, Docker, Git.
Experience:
Senior Developer at Acme Corp (2021-Present)
- Built high throughput REST APIs with Node.js and MongoDB.
- Deployed microservices using Docker.
Projects:
- Cloud Dashboard: Built with React and TypeScript.
Education:
BS in Computer Science, State University, 2020.`
    );

    const res = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .attach('file', resumeBuffer, 'alice_resume.txt');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resume.fileType).toBe('txt');
    expect(res.body.data.resume.skills.length).toBeGreaterThan(0);
    expect(res.body.data.resume.skills).toContain('javascript');
  });

  it('should reject unsupported file extensions', async () => {
    const fileBuffer = Buffer.from('executable binary code');
    const res = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .attach('file', fileBuffer, 'malicious_script.exe');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('INVALID_FILE_TYPE');
  });

  it('should prevent User B from deleting User A resume', async () => {
    const resumeBuffer = Buffer.from('Alice resume contents with React, Node.js, and TypeScript.');
    const uploadRes = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .attach('file', resumeBuffer, 'resume.txt');

    const resumeId = uploadRes.body.data.resume._id;

    const deleteRes = await request(app)
      .delete(`/api/resumes/${resumeId}`)
      .set('Authorization', `Bearer ${tokenUserB}`);

    expect(deleteRes.status).toBe(404);
  });
});
