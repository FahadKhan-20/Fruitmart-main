'use client';

import { useEffect, useRef } from 'react';
import './splash.css';

// Opening animation, shown once per browser session:
//   1. blank white page
//   2. a slow-motion video: water bursts sideways from the centre and fresh produce
//      flies out on it (public/videos/splash.mp4, 3s, background graded to pure white)
//   3. as the last of it leaves the frame, the MD FRESH logo comes in at the centre
//   4. once the page has loaded, the logo swings into the navbar corner and the white
//      sheet opens outward from that corner to show the page

const REVEAL_AT_S = 2.25; // video time when the frame is nearly clear
const REVEAL_LATEST_MS = 4500; // reveal by then even if the video stalls or cannot autoplay
const HOLD_MS = 900; // how long the logo sits in the centre before it flies
const FLY_MS = 900;

// React does not render the `muted` attribute on the server, and browsers only
// autoplay muted video, so the tag is written as HTML. It then starts playing
// at first paint, before React hydrates.
const VIDEO_HTML =
  '<video src="/videos/splash.mp4" autoplay muted playsinline preload="auto" ' +
  'disablepictureinpicture aria-hidden="true"></video>';

export default function SplashScreen() {
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    // The inline script in layout.tsx marks a repeat visit in this session;
    // splash.css then hides the splash (display: none), so nothing to do here.
    if (html.dataset.splash === 'seen') return;
    html.dataset.splash = 'playing';

    const root = rootRef.current;
    const sheet = sheetRef.current;
    const logo = logoRef.current;
    const video = sheet?.querySelector('video');
    if (!root || !sheet || !logo) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    let revealed = false;
    let holdDone = false;
    let pageLoaded = document.readyState === 'complete';

    const finish = () => {
      if (!cancelled) html.dataset.splash = 'seen'; // splash.css hides the splash from here on
    };

    const fly = () => {
      if (cancelled) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const target = document.querySelector<HTMLElement>('[data-brand-logo]');
      const to = target?.getBoundingClientRect();
      const from = logo.getBoundingClientRect();
      const onScreen = !!to && to.width > 0 && to.bottom > 0 && to.top < vh;

      if (reduce || !onScreen) {
        root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).onfinish = finish;
        return;
      }

      const tx = to.left + to.width / 2;
      const ty = to.top + to.height / 2;
      const dx = tx - (from.left + from.width / 2);
      const dy = ty - (from.top + from.height / 2);
      const scale = to.width / from.width;

      // A small wind-up, then up and over into the corner.
      logo.animate(
        [
          { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
          { offset: 0.14, transform: 'translate(0, 8px) scale(1.04) rotate(2deg)' },
          { offset: 0.55, transform: `translate(${dx * 0.45}px, ${dy * 0.75 - 30}px) scale(${0.25 + scale}) rotate(-8deg)` },
          { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(0deg)` },
        ],
        { duration: FLY_MS, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'forwards' }
      ).onfinish = finish;

      // The white sheet opens outward from the navbar logo.
      const radius = Math.hypot(Math.max(tx, vw - tx), Math.max(ty, vh - ty));
      sheet.style.setProperty('--hx', `${tx}px`);
      sheet.style.setProperty('--hy', `${ty}px`);
      const supportsHole = typeof CSS !== 'undefined' && 'registerProperty' in CSS;
      sheet.animate(
        supportsHole ? [{ '--hole': '0px' }, { '--hole': `${radius}px` }] : [{ opacity: 1 }, { opacity: 0 }],
        { duration: FLY_MS * 0.75, delay: FLY_MS * 0.4, easing: 'cubic-bezier(0.6, 0, 0.3, 1)', fill: 'forwards' }
      );
    };

    const maybeFly = () => {
      if (holdDone && pageLoaded) fly();
    };

    const reveal = () => {
      if (revealed || cancelled) return;
      revealed = true;
      root.classList.add('sp-reveal');
      timers.push(setTimeout(() => { holdDone = true; maybeFly(); }, HOLD_MS));
    };

    const onLoad = () => { pageLoaded = true; maybeFly(); };
    if (!pageLoaded) window.addEventListener('load', onLoad, { once: true });

    const onTime = () => {
      if (video && (video.currentTime >= REVEAL_AT_S || video.ended)) reveal();
    };

    if (reduce || !video) {
      video?.pause();
      reveal();
    } else {
      video.addEventListener('timeupdate', onTime);
      video.addEventListener('ended', reveal);
      video.addEventListener('error', reveal);
      onTime(); // the video may already be past the reveal point by the time React hydrates
      if (video.paused && !video.ended) video.play().catch(reveal); // autoplay blocked (for example, low power mode)
      timers.push(setTimeout(reveal, Math.max(0, REVEAL_LATEST_MS - performance.now())));
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      window.removeEventListener('load', onLoad);
      video?.removeEventListener('timeupdate', onTime);
      video?.removeEventListener('ended', reveal);
      video?.removeEventListener('error', reveal);
    };
  }, []);

  return (
    <div id="md-splash" ref={rootRef} role="status" aria-label="Loading MD FRESH" className="sp-root">
      <div ref={sheetRef} className="sp-sheet" dangerouslySetInnerHTML={{ __html: VIDEO_HTML }} />
      <div ref={logoRef} className="sp-logo-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element -- must be ready before hydration */}
        <img src="/images/logo-splash.webp" alt="MD FRESH" className="sp-logo" draggable={false} />
      </div>
    </div>
  );
}
