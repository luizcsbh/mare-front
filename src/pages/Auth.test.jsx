import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import Auth from './Auth.jsx';

vi.mock('../api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

describe('Auth', () => {
  beforeEach(() => { api.get.mockReset(); api.post.mockReset(); });

  it('passes the authenticated user to the application after login', async () => {
    const user = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };
    const onLogin = vi.fn();
    api.get.mockResolvedValue({ token: 'csrf-token' });
    api.post.mockResolvedValue({ user });
    render(<Auth onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-segura' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(user));
    expect(api.get).toHaveBeenCalledWith('/auth/csrf');
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      name: '',
      email: 'ana@example.com',
      password: 'senha-segura',
    });
  });
});