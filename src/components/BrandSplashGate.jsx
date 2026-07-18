import { useEffect, useState } from 'react';
import { BRAND_LOGO_256, BRAND_NAME, BRAND_TAGLINE } from '../utils/brandAssets';

const SPLASH_DONE_KEY = 'trader-startup-splash-done';
const MIN_VISIBLE_MS = 2200;

const SLOGANS = [
  'إدارة المنتجات والعروض',
  'متابعة الطلبيات والدردشات',
  'لوحة احترافية لمتجرك',
];

export default function BrandSplashGate({ active, children }) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [sloganIndex, setSloganIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      setFading(false);
      return undefined;
    }

    if (sessionStorage.getItem(SPLASH_DONE_KEY) === '1') {
      return undefined;
    }

    setVisible(true);
    setFading(false);
    setSloganIndex(0);

    const sloganTimer = window.setInterval(() => {
      setSloganIndex((i) => (i + 1) % SLOGANS.length);
    }, 1800);

    let cancelled = false;

    window.setTimeout(() => {
      if (cancelled) return;
      sessionStorage.setItem(SPLASH_DONE_KEY, '1');
      setFading(true);
      window.setTimeout(() => {
        if (!cancelled) setVisible(false);
      }, 420);
    }, MIN_VISIBLE_MS);

    return () => {
      cancelled = true;
      window.clearInterval(sloganTimer);
    };
  }, [active]);

  return (
    <>
      {children}
      {visible && (
        <div className={`brand-splash${fading ? ' brand-splash--fading' : ''}`} dir="rtl" aria-hidden={fading}>
          <div className="brand-splash__logo-wrap">
            <img
              src={BRAND_LOGO_256}
              alt=""
              className="brand-splash__logo"
              width={112}
              height={112}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>
          <h1 className="brand-splash__title">{BRAND_NAME}</h1>
          <p className="brand-splash__tagline">{BRAND_TAGLINE}</p>
          <p key={sloganIndex} className="brand-splash__slogan">{SLOGANS[sloganIndex]}</p>
        </div>
      )}
    </>
  );
}
