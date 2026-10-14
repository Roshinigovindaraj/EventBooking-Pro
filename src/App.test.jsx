import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './main.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

describe('Eventoria application', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('API unavailable')));
  });

  it('preserves the landing page and exposes authentication actions', () => {
    render(<MemoryRouter initialEntries={['/']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    expect(screen.getAllByText('Eventoria').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/auth/login');
    expect(screen.getByRole('link', { name: /Sign Up/ })).toHaveAttribute('href', '/auth/register');
    expect(screen.getByRole('navigation').querySelector('a[href="/discover"]')).toHaveTextContent('Events');
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByText('Extraordinary')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Browse Events by Category' })).not.toBeInTheDocument();
  });

  it('filters, sorts, and loads more events', () => {
    render(<MemoryRouter initialEntries={['/discover']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    expect(screen.getByText('12 Events Found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Filter by Sold Out' }));
    expect(screen.getByText('12 Events Found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Apply Filters/ }));
    expect(screen.getByText('2 Events Found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Maximum event price' }), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Filters/ }));
    expect(screen.getByText('3 Events Found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));
    fireEvent.click(screen.getByRole('button', { name: /Load More Events/ }));
    expect(screen.getByRole('button', { name: /All Events Loaded/ })).toBeDisabled();
  });

  it('searches dynamically by artist, event, and category', () => {
    render(<MemoryRouter initialEntries={['/discover']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    const search = screen.getByPlaceholderText('Search events, artists, or categories');
    fireEvent.click(screen.getByRole('button', { name: /Salem, Tamil Nadu/ }));
    fireEvent.click(screen.getByRole('option', { name: 'All locations' }));
    fireEvent.change(search, { target: { value: 'DJ Chetas' } });
    fireEvent.submit(search.closest('form'));
    expect(screen.getByText('1 Events Found')).toBeInTheDocument();
    expect(screen.getByText('EDM Night – DJ Festival')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'Workshops' } });
    fireEvent.submit(search.closest('form'));
    expect(screen.getByText('2 Events Found')).toBeInTheDocument();
  });

  it('searches the exact selected calendar date immediately', () => {
    render(<MemoryRouter initialEntries={['/discover']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^Any date$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('button', { name: '28 November 2026' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '15 November 2026' }));
    expect(screen.getByText('1 Events Found')).toBeInTheDocument();
    expect(screen.getByText('Arijit Singh Live in Concert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /15 Nov 2026/ })).toBeInTheDocument();
  });

  it('uses the search term supplied by a discovery link', () => {
    render(<MemoryRouter initialEntries={['/discover?q=Arijit']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    expect(screen.getByPlaceholderText('Search events, artists, or categories')).toHaveValue('Arijit');
    expect(screen.getByText('1 Events Found')).toBeInTheDocument();
  });

  it('renders and filters the venues catalog', () => {
    render(<MemoryRouter initialEntries={['/venues']}><AuthProvider><App/></AuthProvider></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Extraordinary Venues/ })).toBeInTheDocument();
    expect(screen.getByText('6 Venues Found')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Resorts' })[0]);
    expect(screen.getByText('2 Venues Found')).toBeInTheDocument();
  });
});

