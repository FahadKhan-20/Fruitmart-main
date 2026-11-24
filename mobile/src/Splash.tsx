import { useEffect, useRef } from 'react';
import { SplashScreen as NativeSplash } from '@capacitor/splash-screen';
import './splash.css';

// Same opening as the website (components/SplashScreen.tsx), played on every launch:
//   1. white screen (the native launch screen is white too, so the hand-off is invisible)
//   2. 3s slow-motion video: water bursts out of the centre with produce on it
//   3. as the last of it leaves the frame, the MD FRESH logo comes in at the centre
//   4. the logo swings into the header badge ([data-brand-logo]) and the white
//      sheet opens outward from there to show the app

const REVEAL_AT_S = 2.25;
const REVEAL_LATEST_MS = 4500;
const HOLD_MS = 900;
const FLY_MS = 900;

export default function Splash({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    NativeSplash.hide().catch(() => {}); // our white sheet is already up
    const root = rootRef.current, sheet = sheetRef.current, logo = logoRef.current, video = videoRef.current;
    if (!root || !sheet || !logo) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    let revealed = false;
    const finish = () => { if (!cancelled) onDone(); };

    const fly = () => {
      if (cancelled) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const to = document.querySelector<HTMLElement>('[data-brand-logo]')?.getBoundingClientRect();
      const from = logo.getBoundingClientRect();
      if (reduce || !to || to.width === 0) {
        root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).onfinish = finish;
        return;
      }
      const tx = to.left + to.width / 2, ty = to.top + to.height / 2;
      const dx = tx - (from.left + from.width / 2), dy = ty - (from.top + from.height / 2);
      const scale = to.width / from.width;
      logo.animate(
        [
          { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
          { offset: 0.14, transform: 'translate(0, 8px) scale(1.04) rotate(2deg)' },
          { offset: 0.55, transform: `translate(${dx * 0.45}px, ${dy * 0.75 - 30}px) scale(${0.25 + scale}) rotate(-8deg)` },
          { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(0deg)` },
        ],
        { duration: FLY_MS, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'forwards' },
      ).onfinish = finish;

      const radius = Math.hypot(Math.max(tx, vw - tx), Math.max(ty, vh - ty));
      sheet.style.setProperty('--hx', `${tx}px`);
      sheet.style.setProperty('--hy', `${ty}px`);
      const supportsHole = typeof CSS !== 'undefined' && 'registerProperty' in CSS;
      sheet.animate(
        supportsHole ? [{ '--hole': '0px' }, { '--hole': `${radius}px` }] : [{ opacity: 1 }, { opacity: 0 }],
        { duration: FLY_MS * 0.75, delay: FLY_MS * 0.4, easing: 'cubic-bezier(0.6, 0, 0.3, 1)', fill: 'forwards' },
      );
    };

    const reveal = () => {
      if (revealed || cancelled) return;
      revealed = true;
      root.classList.add('sp-reveal');
      timers.push(setTimeout(fly, HOLD_MS));
    };
    const onTime = () => { if (video && (video.currentTime >= REVEAL_AT_S || video.ended)) reveal(); };

    if (reduce || !video) {
      video?.pause();
      reveal();
    } else {
      video.addEventListener('timeupdate', onTime);
      video.addEventListener('ended', reveal);
      video.addEventListener('error', reveal);
      if (video.paused && !video.ended) video.play().catch(reveal);
      timers.push(setTimeout(reveal, REVEAL_LATEST_MS));
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      video?.removeEventListener('timeupdate', onTime);
      video?.removeEventListener('ended', reveal);
      video?.removeEventListener('error', reveal);
    };
  }, [onDone]);

  return (
    <div ref={rootRef} className="sp-root" role="status" aria-label="Loading MD FRESH">
      <div ref={sheetRef} className="sp-sheet">
        <video ref={videoRef} src="videos/splash.mp4" poster="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" autoPlay muted playsInline preload="auto" disablePictureInPicture aria-hidden="true" onPlaying={(e) => e.currentTarget.classList.add("on")} />
      </div>
      <div ref={logoRef} className="sp-logo-wrap">
        <img src="images/logo-splash.webp" alt="MD FRESH" className="sp-logo" draggable={false} />
      </div>
    </div>
  );
}
