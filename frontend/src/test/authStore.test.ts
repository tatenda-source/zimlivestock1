import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import { act } from '@testing-library/react';

// Mock the API module
vi.mock('@/services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
  },
  setAuthToken: vi.fn(),
}));

import { authAPI, setAuthToken } from '@/services/api';

const mockedAuthAPI = authAPI as any;
const mockedSetAuthToken = setAuthToken as any;

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('starts with no user', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('login sets user and token', async () => {
    mockedAuthAPI.login.mockResolvedValue({ access_token: 'jwt-123' });
    mockedAuthAPI.me.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
    });

    await act(async () => {
      await useAuthStore.getState().login('test@test.com', 'password');
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('jwt-123');
    expect(state.user?.email).toBe('test@test.com');
    expect(mockedSetAuthToken).toHaveBeenCalledWith('jwt-123');
  });

  it('login failure keeps unauthenticated', async () => {
    mockedAuthAPI.login.mockRejectedValue(new Error('Invalid'));

    await expect(
      useAuthStore.getState().login('bad@test.com', 'wrong')
    ).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
  });

  it('logout clears state', async () => {
    // Set up authenticated state
    useAuthStore.setState({
      user: { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B' },
      token: 'jwt',
      isAuthenticated: true,
    });

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(mockedSetAuthToken).toHaveBeenCalledWith(null);
  });

  it('checkAuth validates existing token', async () => {
    useAuthStore.setState({ token: 'existing-jwt' });
    mockedAuthAPI.me.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
    });

    await act(async () => {
      await useAuthStore.getState().checkAuth();
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.id).toBe('user-1');
  });

  it('checkAuth with invalid token clears state', async () => {
    useAuthStore.setState({ token: 'expired-jwt' });
    mockedAuthAPI.me.mockRejectedValue(new Error('401'));

    await act(async () => {
      await useAuthStore.getState().checkAuth();
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
  });

  it('checkAuth does nothing without token', async () => {
    await act(async () => {
      await useAuthStore.getState().checkAuth();
    });

    expect(mockedAuthAPI.me).not.toHaveBeenCalled();
  });
});
