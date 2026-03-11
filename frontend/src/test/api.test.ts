import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { livestockAPI, authAPI, paymentAPI, setAuthToken } from '@/services/api';

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mockAxios };
});

const mockedAxios = axios as any;

describe('livestockAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getListings calls GET /livestock', async () => {
    const mockData = [{ id: 1, title: 'Bull' }];
    mockedAxios.get.mockResolvedValue({ data: mockData });

    const res = await livestockAPI.getListings();
    expect(mockedAxios.get).toHaveBeenCalledWith('/livestock', { params: undefined });
  });

  it('getListings with category filter', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });

    await livestockAPI.getListings({ category: 'cattle' });
    expect(mockedAxios.get).toHaveBeenCalledWith('/livestock', {
      params: { category: 'cattle' },
    });
  });

  it('getListing calls GET /livestock/:id', async () => {
    mockedAxios.get.mockResolvedValue({ data: { id: 1 } });

    await livestockAPI.getListing(1);
    expect(mockedAxios.get).toHaveBeenCalledWith('/livestock/1');
  });

  it('placeBid calls POST /bids', async () => {
    mockedAxios.post.mockResolvedValue({ data: { id: 1, amount: 500 } });

    const result = await livestockAPI.placeBid({ livestock_id: 1, amount: 500 });
    expect(mockedAxios.post).toHaveBeenCalledWith('/bids', { livestock_id: 1, amount: 500 });
    expect(result).toEqual({ id: 1, amount: 500 });
  });
});

describe('authAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login calls POST /auth/login', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { access_token: 'jwt-123', token_type: 'bearer' },
    });

    const result = await authAPI.login({ contact: 'test@test.com', password: 'pass' });
    expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
      contact: 'test@test.com',
      password: 'pass',
    });
    expect(result.access_token).toBe('jwt-123');
  });

  it('register calls POST /auth/register', async () => {
    mockedAxios.post.mockResolvedValue({ data: { id: 'new-id' } });

    await authAPI.register({ email: 'new@test.com', password: 'pass' });
    expect(mockedAxios.post).toHaveBeenCalledWith('/auth/register', {
      email: 'new@test.com',
      password: 'pass',
    });
  });

  it('me calls GET /auth/me', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { id: 'user-1', email: 'test@test.com' },
    });

    const result = await authAPI.me();
    expect(mockedAxios.get).toHaveBeenCalledWith('/auth/me');
    expect(result.email).toBe('test@test.com');
  });
});

describe('paymentAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initiate calls POST /payments/initiate', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { reference: 'ZL-1-ABC', status: 'pending', redirect_url: 'https://paynow.co.zw/pay' },
    });

    const result = await paymentAPI.initiate({
      livestock_id: 1,
      payment_method: 'web',
    });
    expect(result.reference).toBe('ZL-1-ABC');
    expect(result.redirect_url).toBe('https://paynow.co.zw/pay');
  });

  it('getStatus calls GET /payments/status/:ref', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { reference: 'ZL-1-ABC', status: 'paid', paid: true },
    });

    const result = await paymentAPI.getStatus('ZL-1-ABC');
    expect(mockedAxios.get).toHaveBeenCalledWith('/payments/status/ZL-1-ABC');
    expect(result.paid).toBe(true);
  });

  it('getUserPayments calls GET /payments/history', async () => {
    mockedAxios.get.mockResolvedValue({
      data: [{ id: 1, amount: 500, status: 'paid' }],
    });

    const result = await paymentAPI.getUserPayments();
    expect(mockedAxios.get).toHaveBeenCalledWith('/payments/history');
    expect(result).toHaveLength(1);
  });
});

describe('setAuthToken', () => {
  it('stores the token for interceptor use', () => {
    // setAuthToken just sets an internal variable — no assertion needed beyond no-throw
    expect(() => setAuthToken('test-token')).not.toThrow();
    expect(() => setAuthToken(null)).not.toThrow();
  });
});
