import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import OrganizePage from './OrganizePage.jsx';
import { AuthProvider } from '../../context/AuthContext.jsx';

describe('OrganizePage', () => {
  it('renders OrganizePage without crashing', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ items: [] })
    })));

    render(
      <MemoryRouter initialEntries={['/organize']}>
        <AuthProvider>
          <OrganizePage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByText(/Organize/i).length).toBeGreaterThan(0);
  });

  it('renders ticket tier builder for organizer', async () => {
    // Mock user as approved event_organizer
    const mockUser = {
      _id: 'org_user_1',
      name: 'Organizer Test',
      roles: ['customer', 'event_organizer']
    };
    localStorage.setItem('eventoria_user', JSON.stringify(mockUser));
    localStorage.setItem('eventoria_token', 'mock_token');

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ items: [] })
    })));

    const { container } = render(
      <MemoryRouter initialEntries={['/organize']}>
        <AuthProvider>
          <OrganizePage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Should find the Event Builder section
    expect(screen.getAllByText(/Create an Event|Event Details/i).length).toBeGreaterThan(0);

    localStorage.removeItem('eventoria_user');
    localStorage.removeItem('eventoria_token');
  });
});
