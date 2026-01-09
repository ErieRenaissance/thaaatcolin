// =============================================================================
// FERALIS PLATFORM - AUTH E2E TESTS
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should return 400 for missing email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          password: 'password123',
        })
        .expect(400);
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('should return tokens for valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@feralis.com',
          password: 'Admin123!@#',
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe('admin@feralis.com');
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@feralis.com',
          password: 'Admin123!@#',
        });
      accessToken = response.body.data.accessToken;
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should return current user with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe('admin@feralis.com');
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should return 401 for invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);
    });
  });

  describe('/auth/forgot-password (POST)', () => {
    it('should return 200 even for non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'not-an-email',
        })
        .expect(400);
    });
  });
});
