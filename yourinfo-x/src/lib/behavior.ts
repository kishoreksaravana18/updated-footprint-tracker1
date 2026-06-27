// Real time behavioral tracking. Returns a live snapshot that updates as the
// visitor moves, scrolls, types, and switches tabs.

import type { BehaviorData } from '../types';

export function createBehaviorTracker(onUpdate: (data: BehaviorData) => void) {
  let mouseDistance = 0;
  let mouseSamples = 0;
  let mouseSpeedSum = 0;
  let lastX = 0;
  let lastY = 0;
  let lastMoveTime = 0;

  let clicks = 0;
  let rageClicks = 0;
  let lastClickTime = 0;
  let rapidClicks = 0;

  let scrollDepth = 0;
  let scrollChanges = 0;
  let lastScrollDir = 0;
  let lastScrollY = 0;

  let keyPresses = 0;
  let keyTimes: number[] = [];

  let tabSwitches = 0;
  let focusStart = Date.now();
  let focusTimeMs = 0;

  function snapshot(): BehaviorData {
    const avgSpeed = mouseSamples ? Math.round(mouseSpeedSum / mouseSamples) : 0;
    let typingSpeed = 0;
    if (keyTimes.length > 2) {
      const span = keyTimes[keyTimes.length - 1] - keyTimes[0];
      if (span > 0) typingSpeed = Math.round((keyPresses / span) * 60000);
    }

    // Human score heuristic: real people produce varied, imperfect signals
    let human = 50;
    if (mouseSamples > 10) human += 15;
    if (avgSpeed > 30 && avgSpeed < 4000) human += 10;
    if (scrollChanges > 1) human += 8;
    if (clicks > 0) human += 7;
    if (rageClicks > 0) human += 3;
    if (focusTimeMs > 3000) human += 7;
    if (mouseSamples === 0 && clicks > 2) human -= 30; // clicks with no movement looks automated
    human = Math.max(1, Math.min(100, human));

    return {
      mouseSpeed: avgSpeed,
      mouseDistance: Math.round(mouseDistance),
      clicks,
      rageClicks,
      scrollDepth: Math.round(scrollDepth),
      scrollChanges,
      keyPresses,
      typingSpeed,
      tabSwitches,
      focusTimeMs: Math.round(focusTimeMs + (Date.now() - focusStart)),
      humanScore: human,
    };
  }

  function onMove(e: MouseEvent) {
    const now = performance.now();
    if (lastMoveTime) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dt = now - lastMoveTime;
      mouseDistance += dist;
      if (dt > 0) {
        mouseSpeedSum += (dist / dt) * 1000;
        mouseSamples++;
      }
    }
    lastX = e.clientX;
    lastY = e.clientY;
    lastMoveTime = now;
  }

  function onClick() {
    clicks++;
    const now = Date.now();
    if (now - lastClickTime < 400) {
      rapidClicks++;
      if (rapidClicks >= 2) rageClicks++;
    } else {
      rapidClicks = 0;
    }
    lastClickTime = now;
  }

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max > 0) scrollDepth = Math.max(scrollDepth, (y / max) * 100);
    const dir = y > lastScrollY ? 1 : -1;
    if (dir !== lastScrollDir && lastScrollDir !== 0) scrollChanges++;
    lastScrollDir = dir;
    lastScrollY = y;
  }

  function onKey() {
    keyPresses++;
    keyTimes.push(performance.now());
    if (keyTimes.length > 50) keyTimes = keyTimes.slice(-50);
  }

  function onVisibility() {
    if (document.hidden) {
      tabSwitches++;
      focusTimeMs += Date.now() - focusStart;
    } else {
      focusStart = Date.now();
    }
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('click', onClick, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('keydown', onKey, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  const interval = window.setInterval(() => onUpdate(snapshot()), 500);

  return () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('click', onClick);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    window.clearInterval(interval);
  };
}
