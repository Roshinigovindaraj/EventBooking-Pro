import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './main.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

const mockOrganizerEvent = {
  _id: '6ad8562635504016b2627b99',
  title: 'Global Tech Expo 2027',
  slug: 'global-tech-expo-2027',
  category: 'Business Events',
  subcategory: 'Conferences',
  venueName: 'Metro Convention Center',
  location: { city: 'Salem', address: '123 Ring Road' },
  startsAt: '2027-05-15T09:00:00+05:30',
  endsAt: '2027-05-15T18:00:00+05:30',
  images: ['/images/business.png'],
  ticketTypes: [
    { _id: 'tkt1', name: 'General Admission', priceMinor: 49900, capacity: 200, sold: 10, reserved: 0 },
  ],
  organizer: { _id: 'org1', name: 'Tech Innovators' },
  status: 'published',
};

const mockVenueOwnerVenue = {
  _id: '6ad8562635504016b2627b88',
  name: 'Salem Grand Convention Hall',
  slug: 'salem-grand-convention-hall',
  type: 'Convention Centers',
  location: { city: 'Salem', address: '45 Palace Road' },
  capacity: 800,
  priceMinorPerHour: 3500000,
  images: ['/images/why-events.png'],
  status: 'published',
};

describe('Eventoria application', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      const urlStr = String(url);
      if (urlStr.includes('/events')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            items: [mockOrganizerEvent],
            pagination: { page: 1, limit: 50, total: 1, pages: 1 },
          }),
        });
      }
      if (urlStr.includes('/venues')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            items: [mockVenueOwnerVenue],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      });
    }));
  });

  it('preserves the landing page and exposes authentication actions', () => {
    render(<MemoryRouter initialEntries={['/']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    expect(screen.getAllByText('Eventoria').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/auth/login');
    expect(screen.getByRole('link', { name: /Sign Up/ })).toHaveAttribute('href', '/auth/register');
    expect(screen.getByRole('navigation').querySelector('a[href="/discover"]')).toHaveTextContent('Events');
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByText('Extraordinary')).toBeInTheDocument();
  });

  it('displays organizer events on the home page and allows booking', async () => {
    render(<MemoryRouter initialEntries={['/']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    expect(await screen.findByText('Global Tech Expo 2027')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Book Global Tech Expo 2027' }));
    expect(await screen.findByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
  });

  it('loads and filters organizer events in the catalog', async () => {
    render(<MemoryRouter initialEntries={['/discover']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    expect(await screen.findByText('1 Events Found')).toBeInTheDocument();
    expect(screen.getByText('Global Tech Expo 2027')).toBeInTheDocument();
  });

  it('searches dynamically by event name or keyword', async () => {
    render(<MemoryRouter initialEntries={['/discover']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    expect(await screen.findByText('Global Tech Expo 2027')).toBeInTheDocument();
    const search = screen.getByPlaceholderText('Search events, artists, or categories');
    fireEvent.change(search, { target: { value: 'Global Tech' } });
    fireEvent.submit(search.closest('form'));
    expect(screen.getByText('1 Events Found')).toBeInTheDocument();
    expect(screen.getByText('Global Tech Expo 2027')).toBeInTheDocument();
  });

  it('uses search term supplied by URL parameter', async () => {
    render(<MemoryRouter initialEntries={['/discover?q=Tech']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    expect(screen.getByPlaceholderText('Search events, artists, or categories')).toHaveValue('Tech');
    expect(await screen.findByText('1 Events Found')).toBeInTheDocument();
    expect(screen.getByText('Global Tech Expo 2027')).toBeInTheDocument();
  });

  it('renders and displays venue owner venues in the catalog', async () => {
    render(<MemoryRouter initialEntries={['/venues']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    const heading = await screen.findByRole('heading', { level: 2, name: /Venues Found|Searching/i });
    expect(heading.textContent).toBe('1 Venues Found');
    expect(screen.getAllByText('Salem Grand Convention Hall').length).toBeGreaterThan(0);
  });

  it('displays empty state when no events are published yet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    }));
    render(<MemoryRouter initialEntries={['/discover']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    expect(await screen.findByText('No events found')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Become an Organizer' }).length).toBeGreaterThan(0);
  });
});
