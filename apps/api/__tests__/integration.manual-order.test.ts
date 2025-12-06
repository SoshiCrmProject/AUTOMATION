import request from 'supertest';
import jwt from 'jsonwebtoken';
import appModule, { prisma } from '../src/index';

const app = appModule as any;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

describe('Manual order integration (DB-backed)', () => {
  const token = jwt.sign({ userId: 'test-user' }, JWT_SECRET);

  beforeAll(async () => {
    // Ensure test shop exists
    await prisma.shop.createMany({ data: [{ id: 'shop-test', ownerId: 'test-user', name: 'T' }], skipDuplicates: true });
  });

  afterAll(async () => {
    await prisma.manualAmazonOrder.deleteMany({ where: { ownerId: 'test-user' } }).catch(() => {});
  });

  it('creates manual order and enqueues job', async () => {
    const payload = {
      shopId: 'shop-test',
      productUrl: 'https://www.amazon.co.jp/dp/B000EXAMPLE',
      buyerName: 'Alice',
      phone: '09012345678',
      addressLine1: '1-2-3 Tokyo',
      city: 'Tokyo',
      postalCode: '100-0001'
    };

    const res = await request(app).post('/manual-orders').set('Authorization', `Bearer ${token}`).send(payload).expect(201);
    expect(res.body).toHaveProperty('id');
    const rec = await prisma.manualAmazonOrder.findUnique({ where: { id: res.body.id } });
    expect(rec).not.toBeNull();
    expect(rec?.buyerName).toBe('Alice');
  }, 20000);
});
