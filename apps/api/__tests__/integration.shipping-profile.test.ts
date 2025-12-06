import request from 'supertest';
import jwt from 'jsonwebtoken';
import appModule, { prisma } from '../src/index';

const app = appModule as any;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

describe('Shipping Profiles API (integration - mocked prisma)', () => {
  const token = jwt.sign({ userId: 'test-user' }, JWT_SECRET);
  const shopId = 'shop-123';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a shipping profile', async () => {
    jest.spyOn(prisma, 'shop' as any).mockImplementation(() => ({}) as any);
    // mock shop.findFirst
    (prisma.shop as any).findFirst = jest.fn().mockResolvedValue({ id: shopId, ownerId: 'test-user' });
    (prisma.shippingProfile as any).create = jest.fn().mockResolvedValue({
      id: 'p1', shopId, label: 'HQ', contactName: 'ACME', phone: '0123', addressLine1: '1-1', city: 'Tokyo', postalCode: '100', amazonAddressLabel: 'ACME HQ', isDefault: true, isActive: true
    });
    (prisma.shippingProfile as any).updateMany = jest.fn().mockResolvedValue({ count: 1 });
    (prisma.autoShippingSetting as any).updateMany = jest.fn().mockResolvedValue({ count: 1 });

    const payload = {
      shopId,
      label: 'HQ',
      contactName: 'ACME',
      phone: '0123',
      addressLine1: '1-1',
      city: 'Tokyo',
      postalCode: '100',
      amazonAddressLabel: 'ACME HQ',
      isDefault: true
    };

    const res = await request(app)
      .post('/shipping-profiles')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('id', 'p1');
    expect((prisma.shippingProfile as any).create).toHaveBeenCalled();
  });

  it('lists shipping profiles for user shops', async () => {
    (prisma.shop as any).findMany = jest.fn().mockResolvedValue([{ id: shopId }]);
    (prisma.shippingProfile as any).findMany = jest.fn().mockResolvedValue([
      { id: 'p1', shopId, label: 'HQ' }
    ]);

    const res = await request(app).get('/shipping-profiles').set('Authorization', `Bearer ${token}`).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('id', 'p1');
  });

  it('updates a shipping profile', async () => {
    const profileId = 'p1';
    (prisma.shippingProfile as any).findUnique = jest.fn().mockResolvedValue({ id: profileId, shopId });
    (prisma.shop as any).findFirst = jest.fn().mockResolvedValue({ id: shopId, ownerId: 'test-user' });
    (prisma.shippingProfile as any).update = jest.fn().mockResolvedValue({ id: profileId, label: 'Updated' });
    (prisma.shippingProfile as any).updateMany = jest.fn().mockResolvedValue({ count: 1 });
    (prisma.autoShippingSetting as any).updateMany = jest.fn().mockResolvedValue({ count: 1 });

    const res = await request(app)
      .put(`/shipping-profiles/${profileId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ shopId, label: 'Updated', contactName: 'X', phone: '1', addressLine1: 'a', city: 'b', postalCode: 'c', amazonAddressLabel: 'L' })
      .expect(200);

    expect(res.body).toHaveProperty('label', 'Updated');
    expect((prisma.shippingProfile as any).update).toHaveBeenCalled();
  });

  it('deletes a shipping profile', async () => {
    const profileId = 'p-delete';
    (prisma.shippingProfile as any).findUnique = jest.fn().mockResolvedValue({ id: profileId, shopId });
    (prisma.shop as any).findFirst = jest.fn().mockResolvedValue({ id: shopId, ownerId: 'test-user' });
    (prisma.shippingProfile as any).delete = jest.fn().mockResolvedValue({});
    (prisma.autoShippingSetting as any).updateMany = jest.fn().mockResolvedValue({ count: 1 });

    const res = await request(app).delete(`/shipping-profiles/${profileId}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ ok: true });
    expect((prisma.shippingProfile as any).delete).toHaveBeenCalled();
  });
});
