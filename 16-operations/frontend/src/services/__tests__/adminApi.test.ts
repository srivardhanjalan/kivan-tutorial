import * as api from '../api';

/**
 * The admin api client's wiring: every call must hit the right method, path, and
 * body for its backend route (the 14 admin routes), and a failure must carry the
 * backend's own reason so a screen can surface it. fetch is mocked, so these are
 * pure request-shape assertions with no network and no React Native runtime.
 */

const BASE = 'http://test.local';
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

/** A successful fetch Response stub carrying JSON `data`. */
function ok(data: unknown, status = 200) {
  return { ok: true, status, json: async () => data } as unknown as Response;
}

/** A failed fetch Response stub carrying a FastAPI-shaped error `body`. */
function fail(status: number, body: unknown) {
  return { ok: false, status, json: async () => body } as unknown as Response;
}

/** The most recent request's URL, method, and parsed JSON body. */
function lastCall() {
  const calls = fetchMock.mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit | undefined];
  return {
    url,
    method: init?.method,
    body: init?.body ? JSON.parse(init.body as string) : undefined,
  };
}

describe('admin users', () => {
  it('lists the roster with default paging (a GET)', async () => {
    fetchMock.mockResolvedValue(ok([]));
    await api.fetchAdminUsers();
    const { url, method } = lastCall();
    expect(url).toBe(`${BASE}/admin/users?limit=50&offset=0`);
    expect(method).toBeUndefined();
  });

  it('passes an explicit page', async () => {
    fetchMock.mockResolvedValue(ok([]));
    await api.fetchAdminUsers(25, 50);
    expect(lastCall().url).toBe(`${BASE}/admin/users?limit=25&offset=50`);
  });

  it('PATCHes a role change', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'u1', role: 'admin' }));
    await api.setUserRole('u1', 'admin');
    const { url, method, body } = lastCall();
    expect(url).toBe(`${BASE}/admin/users/u1/role`);
    expect(method).toBe('PATCH');
    expect(body).toEqual({ role: 'admin' });
  });
});

describe('admin brands', () => {
  it('creates a brand', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'nike' }, 201));
    await api.createBrand({
      id: 'nike',
      name: 'Nike',
      website_url: 'https://nike.com',
      category: 'Fashion',
      country: 'US',
    });
    const { url, method, body } = lastCall();
    expect(url).toBe(`${BASE}/admin/brands`);
    expect(method).toBe('POST');
    expect(body).toMatchObject({ id: 'nike', name: 'Nike', country: 'US' });
  });

  it('updates a brand', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'nike' }));
    await api.updateBrand('nike', { name: 'Nike Inc' });
    const { url, method, body } = lastCall();
    expect(url).toBe(`${BASE}/admin/brands/nike`);
    expect(method).toBe('PUT');
    expect(body).toEqual({ name: 'Nike Inc' });
  });

  it('deletes a brand', async () => {
    fetchMock.mockResolvedValue(ok(null, 204));
    await api.deleteBrand('nike');
    const { url, method } = lastCall();
    expect(url).toBe(`${BASE}/admin/brands/nike`);
    expect(method).toBe('DELETE');
  });
});

describe('admin life events', () => {
  it('creates a life event', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'graduation' }, 201));
    await api.createLifeEvent({ id: 'graduation', name: 'Graduation' });
    const { url, method, body } = lastCall();
    expect(url).toBe(`${BASE}/admin/life-events`);
    expect(method).toBe('POST');
    expect(body).toMatchObject({ id: 'graduation', name: 'Graduation' });
  });

  it('updates a life event', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'graduation' }));
    await api.updateLifeEvent('graduation', { icon: '🎓' });
    const { url, method, body } = lastCall();
    expect(url).toBe(`${BASE}/admin/life-events/graduation`);
    expect(method).toBe('PUT');
    expect(body).toEqual({ icon: '🎓' });
  });

  it('deletes a life event', async () => {
    fetchMock.mockResolvedValue(ok(null, 204));
    await api.deleteLifeEvent('graduation');
    const { url, method } = lastCall();
    expect(url).toBe(`${BASE}/admin/life-events/graduation`);
    expect(method).toBe('DELETE');
  });
});

describe('admin storefronts', () => {
  it('creates a storefront', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'acme' }, 201));
    await api.createStorefront({ id: 'acme', name: 'Acme' });
    const { url, method, body } = lastCall();
    expect(url).toBe(`${BASE}/admin/storefronts`);
    expect(method).toBe('POST');
    expect(body).toMatchObject({ id: 'acme', name: 'Acme' });
  });

  it('updates a storefront', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'acme' }));
    await api.updateStorefront('acme', { display_order: 3 });
    const { url, method, body } = lastCall();
    expect(url).toBe(`${BASE}/admin/storefronts/acme`);
    expect(method).toBe('PUT');
    expect(body).toEqual({ display_order: 3 });
  });

  it('deletes a storefront', async () => {
    fetchMock.mockResolvedValue(ok(null, 204));
    await api.deleteStorefront('acme');
    const { url, method } = lastCall();
    expect(url).toBe(`${BASE}/admin/storefronts/acme`);
    expect(method).toBe('DELETE');
  });
});

describe('admin products (nested under a store)', () => {
  it('creates a product under its store', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'mug' }, 201));
    await api.createProduct('acme', {
      id: 'mug',
      name: 'Mug',
      price: 12,
      category: 'Mugs',
      link_url: 'https://acme.com/mug',
    });
    const { url, method, body } = lastCall();
    expect(url).toBe(`${BASE}/admin/storefronts/acme/products`);
    expect(method).toBe('POST');
    expect(body).toMatchObject({ id: 'mug', price: 12 });
  });

  it('updates a product', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'mug' }));
    await api.updateProduct('acme', 'mug', { price: 15 });
    const { url, method, body } = lastCall();
    expect(url).toBe(`${BASE}/admin/storefronts/acme/products/mug`);
    expect(method).toBe('PUT');
    expect(body).toEqual({ price: 15 });
  });

  it('deletes a product', async () => {
    fetchMock.mockResolvedValue(ok(null, 204));
    await api.deleteProduct('acme', 'mug');
    const { url, method } = lastCall();
    expect(url).toBe(`${BASE}/admin/storefronts/acme/products/mug`);
    expect(method).toBe('DELETE');
  });
});

describe('backend reason surfacing', () => {
  it('carries a 409 conflict detail on the thrown ApiError', async () => {
    const reason = 'An admin cannot remove their own admin role';
    fetchMock.mockResolvedValue(fail(409, { detail: reason }));
    await expect(api.setUserRole('me', 'user')).rejects.toMatchObject({
      status: 409,
      detail: reason,
    });
  });

  it('collapses a 422 field-error list to its first message', async () => {
    fetchMock.mockResolvedValue(
      fail(422, { detail: [{ loc: ['body', 'price'], msg: 'ensure this value is greater than or equal to 0' }] })
    );
    await expect(
      api.createProduct('acme', {
        id: 'mug',
        name: 'Mug',
        price: -1,
        category: 'Mugs',
        link_url: 'https://acme.com/mug',
      })
    ).rejects.toMatchObject({
      status: 422,
      detail: 'ensure this value is greater than or equal to 0',
    });
  });
});
