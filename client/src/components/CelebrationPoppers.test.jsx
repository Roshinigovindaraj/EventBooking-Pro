import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import confetti from 'canvas-confetti';
import CelebrationPoppers, { fireConfettiCelebration, fireButtonPopper } from './CelebrationPoppers.jsx';
import { RealisticPartyPopper } from './LoginSuccessModal.jsx';

vi.mock('canvas-confetti', () => {
  const mockConfetti = vi.fn();
  mockConfetti.reset = vi.fn();
  return { default: mockConfetti };
});

describe('CelebrationPoppers component and utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('renders realistic party popper cones for left and right orientations', () => {
    const { container: leftContainer } = render(<RealisticPartyPopper isRight={false} fired={false} />);
    const leftSvg = leftContainer.querySelector('svg');
    expect(leftSvg).toBeInTheDocument();
    expect(leftSvg).toHaveClass('popper-horn-svg');

    const { container: rightContainer } = render(<RealisticPartyPopper isRight={true} fired={true} />);
    const rightSvg = rightContainer.querySelector('svg');
    expect(rightSvg).toBeInTheDocument();
    expect(rightSvg?.style.transform).toContain('scaleX(-1)');
  });

  it('renders CelebrationPoppers with both party poppers and fires confetti bursts', () => {
    const { container } = render(
      <div style={{ position: 'relative', width: 400, height: 300 }}>
        <CelebrationPoppers top="10px" left="-15px" right="-15px" />
      </div>
    );

    const overlay = container.querySelector('.celebration-poppers-overlay');
    expect(overlay).toBeInTheDocument();

    const leftHorn = container.querySelector('.popper-horn-left');
    const rightHorn = container.querySelector('.popper-horn-right');
    expect(leftHorn).toBeInTheDocument();
    expect(rightHorn).toBeInTheDocument();

    // Fast-forward past the 180ms firing timer
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(confetti).toHaveBeenCalled();
    const calls = vi.mocked(confetti).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);

    const angles = calls.map((c) => c[0].angle);
    expect(angles).toContain(55);
    expect(angles).toContain(125);

    // Fast-forward past the 220ms secondary cascade burst
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(vi.mocked(confetti).mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('fireConfettiCelebration triggers confetti with custom options', () => {
    fireConfettiCelebration({
      particleCount: 50,
      originLeft: { x: 0.1, y: 0.5 },
      originRight: { x: 0.9, y: 0.5 },
    });

    expect(confetti).toHaveBeenCalled();
    const calls = vi.mocked(confetti).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0][0].origin).toEqual({ x: 0.1, y: 0.5 });
    expect(calls[1][0].origin).toEqual({ x: 0.9, y: 0.5 });
  });

  it('fireButtonPopper triggers confetti burst centered around clicked element', () => {
    const dummyBtn = document.createElement('button');
    dummyBtn.getBoundingClientRect = () => ({
      left: 100,
      top: 200,
      width: 120,
      height: 40,
      right: 220,
      bottom: 240,
    });

    fireButtonPopper(dummyBtn);

    expect(confetti).toHaveBeenCalled();
    const calls = vi.mocked(confetti).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });
});
