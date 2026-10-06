import request from 'supertest';
import app from '../src/app.js';
import { setupTestDB } from './setup.js';

setupTestDB();

describe('Authentication API Endpoints', () => {
  const validUser = {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    password: 'password123',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user and return a JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject registration with an existing email', async () => {
      await request(app).post('/api/auth/register').send(validUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('AUTH_USER_EXISTS');
    });

    it('should reject invalid email or short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'J', email: 'invalid-email', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('should log in successfully with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.name).toBe(validUser.name);
    });

    it('should fail with 401 for incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('AUTH_INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    let token;

    beforeEach(async () => {
      const reg = await request(app).post('/api/auth/register').send(validUser);
      token = reg.body.data.token;
    });

    it('should return user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.user.stats).toBeDefined();
    });

    it('should reject request when token is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('AUTH_TOKEN_MISSING');
    });

    it('should reject request when token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token_12345');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('AUTH_INVALID_TOKEN');
    });
  });
});
