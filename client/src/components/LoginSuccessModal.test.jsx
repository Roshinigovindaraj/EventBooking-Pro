import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import confetti from 'canvas-confetti';
import LoginSuccessModal from './LoginSuccessModal.jsx';

vi.mock('canvas-confetti', () => {
  const mockConfetti = vi.fn();
  mockConfetti.reset = vi.fn();
  return { default: mockConfetti };
});

describe('LoginSuccessModal component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('renders login successful details matching the celebration design', () => {
    const handleContinue = vi.fn();
    render(
      <LoginSuccessModal
        open={true}
        onContinue={handleContinue}
        titleTop="Login"
        titleBottom="Successful!"
        description="Welcome back! You have been logged in successfully to your account."
        buttonText="Continue"
      />
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Successful!')).toBeInTheDocument();
    expect(
      screen.getByText('Welcome back! You have been logged in successfully to your account.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close dialog/i })).toBeInTheDocument();
  });

  it('renders account created celebration details when a new account is registered', () => {
    const handleContinue = vi.fn();
    render(
      <LoginSuccessModal
        open={true}
        onContinue={handleContinue}
        titleTop="Account"
        titleBottom="Created!"
        description="Welcome to Eventoria, Rosh! Your account has been created successfully."
        buttonText="Continue"
      />
    );

    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Created!')).toBeInTheDocument();
    expect(
      screen.getByText('Welcome to Eventoria, Rosh! Your account has been created successfully.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
  });

  it('fires dual confetti bursts aligned with left and right poppers', () => {
    render(<LoginSuccessModal open={true} onContinue={vi.fn()} />);

    // Fast-forward past step 1 (200ms)
    act(() => {
      vi.advanceTimersByTime(210);
    });

    // Should have fired at least twice (left and right origins)
    expect(confetti).toHaveBeenCalled();
    const calls = vi.mocked(confetti).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);

    // Check that angles are directed diagonally upward and inward
    const angles = calls.map((c) => c[0].angle);
    expect(angles).toContain(55);
    expect(angles).toContain(125);

    // Fast-forward past step 2 follow-up burst (420ms)
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(vi.mocked(confetti).mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('triggers onContinue when the Continue button is clicked', () => {
    const handleContinue = vi.fn();
    render(<LoginSuccessModal open={true} onContinue={handleContinue} />);

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(handleContinue).toHaveBeenCalledTimes(1);
  });

  it('triggers onContinue when the close button is clicked', () => {
    const handleContinue = vi.fn();
    render(<LoginSuccessModal open={true} onContinue={handleContinue} />);

    fireEvent.click(screen.getByRole('button', { name: /Close dialog/i }));
    expect(handleContinue).toHaveBeenCalledTimes(1);
  });

  it('triggers onContinue when Escape or Enter key is pressed', () => {
    const handleContinue = vi.fn();
    render(<LoginSuccessModal open={true} onContinue={handleContinue} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleContinue).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(handleContinue).toHaveBeenCalledTimes(2);
  });

  it('resets confetti and cleans up timers on unmount', () => {
    const { unmount } = render(<LoginSuccessModal open={true} onContinue={vi.fn()} />);
    unmount();
    expect(confetti.reset).toHaveBeenCalled();
  });

  it('does not render when open is false', () => {
    render(<LoginSuccessModal open={false} />);
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });
});
