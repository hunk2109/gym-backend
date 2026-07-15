import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Gym API - End-to-End Testing (FASE 8)', () => {
  let app: INestApplication;
  let token: string;
  let memberId: number;
  let membershipId: number;
  let classId: number;
  let paymentId: number;
  let productId: number;
  let saleId: number;
  let employeeId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PHASE 0: AUTH - 3 Endpoints', () => {
    it('POST /api/auth/register - should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'testuser@gym.com',
          password: 'Test123456',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.statusCode).toBe(201);
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('access_token');
          token = res.body.data.access_token;
        });
    });

    it('POST /api/auth/login - should login user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'testuser@gym.com',
          password: 'Test123456',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('access_token');
          token = res.body.data.access_token;
        });
    });

    it('POST /api/auth/logout - should logout user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('PHASE 1: MEMBERS - 11 Endpoints', () => {
    it('GET /api/members - should get all members with pagination', () => {
      return request(app.getHttpServer())
        .get('/api/members?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('page');
          expect(res.body.data).toHaveProperty('limit');
          expect(res.body.data).toHaveProperty('total');
        });
    });

    it('POST /api/members - should create a new member', () => {
      return request(app.getHttpServer())
        .post('/api/members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Juan Pérez',
          email: 'juan@gym.com',
          phone: '1234567890',
          address: 'Calle Principal 123',
          joinDate: new Date().toISOString().split('T')[0],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.statusCode).toBe(201);
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('id');
          memberId = res.body.data.id;
        });
    });

    it('GET /api/members/:id - should get member by id', () => {
      return request(app.getHttpServer())
        .get(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data.id).toBe(memberId);
        });
    });

    it('PUT /api/members/:id - should update member', () => {
      return request(app.getHttpServer())
        .put(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Juan Pérez Updated',
          phone: '9876543210',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.success).toBe(true);
        });
    });

    it('GET /api/members/search?search=juan - should search members', () => {
      return request(app.getHttpServer())
        .get('/api/members/search?search=juan')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/members/paid?isPaid=true - should filter paid members', () => {
      return request(app.getHttpServer())
        .get('/api/members/paid?isPaid=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
        });
    });

    it('GET /api/members/recent - should get recent members', () => {
      return request(app.getHttpServer())
        .get('/api/members/recent')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('PHASE 5: DASHBOARD - 8 Endpoints', () => {
    it('GET /api/dashboard/stats - should get dashboard stats', () => {
      return request(app.getHttpServer())
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('totalMembers');
          expect(res.body.data).toHaveProperty('totalRevenue');
          expect(res.body.data).toHaveProperty('totalSales');
        });
    });

    it('GET /api/dashboard/members/count - should get members count', () => {
      return request(app.getHttpServer())
        .get('/api/dashboard/members/count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(typeof res.body.data).toBe('number');
        });
    });

    it('GET /api/dashboard/employees/count - should get employees count', () => {
      return request(app.getHttpServer())
        .get('/api/dashboard/employees/count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(typeof res.body.data).toBe('number');
        });
    });

    it('GET /api/dashboard/revenue/total - should get total revenue', () => {
      return request(app.getHttpServer())
        .get('/api/dashboard/revenue/total')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(typeof res.body.data).toBe('number');
        });
    });

    it('GET /api/dashboard/sales/monthly - should get monthly sales', () => {
      return request(app.getHttpServer())
        .get('/api/dashboard/sales/monthly')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/dashboard/products/top - should get top products', () => {
      return request(app.getHttpServer())
        .get('/api/dashboard/products/top')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('PHASE 6: REPORTS - 8 Endpoints', () => {
    it('GET /api/reports/sales - should get sales report', () => {
      return request(app.getHttpServer())
        .get('/api/reports/sales?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('totalSales');
          expect(res.body.data).toHaveProperty('chartData');
        });
    });

    it('GET /api/reports/memberships - should get memberships report', () => {
      return request(app.getHttpServer())
        .get('/api/reports/memberships?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('totalMemberships');
        });
    });

    it('GET /api/reports/payments - should get payments report', () => {
      return request(app.getHttpServer())
        .get('/api/reports/payments?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('totalPayments');
        });
    });

    it('GET /api/reports/revenue - should get revenue report', () => {
      return request(app.getHttpServer())
        .get('/api/reports/revenue?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(typeof res.body.data).toBe('number');
        });
    });

    it('GET /api/reports/comprehensive - should get comprehensive analytics', () => {
      return request(app.getHttpServer())
        .get('/api/reports/comprehensive?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.statusCode).toBe(200);
          expect(res.body.data).toHaveProperty('sales');
          expect(res.body.data).toHaveProperty('memberships');
          expect(res.body.data).toHaveProperty('revenue');
        });
    });
  });

  describe('Response Format Validation', () => {
    it('should have consistent response format with statusCode, success, message, data, timestamp, path', () => {
      return request(app.getHttpServer())
        .get('/api/members/recent')
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode');
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('path');
        });
    });

    it('should have consistent pagination format', () => {
      return request(app.getHttpServer())
        .get('/api/members?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('page');
          expect(res.body.data).toHaveProperty('limit');
          expect(res.body.data).toHaveProperty('total');
          expect(res.body.data).toHaveProperty('pages');
          expect(res.body.data).toHaveProperty('hasNextPage');
          expect(res.body.data).toHaveProperty('hasPrevPage');
        });
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthorized request', () => {
      return request(app.getHttpServer())
        .get('/api/members')
        .expect(401);
    });

    it('should return 404 for non-existent member', () => {
      return request(app.getHttpServer())
        .get('/api/members/99999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should return 400 for invalid pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/api/members?page=invalid&limit=invalid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('DELETE Methods', () => {
    it('DELETE /api/members/:id - should delete member', () => {
      return request(app.getHttpServer())
        .delete(`/api/members/${memberId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => {
          expect([200, 204]).toContain(res.status);
        });
    });
  });
});
