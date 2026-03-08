'use client';

import { useEffect, useState, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  // Scroll to top on route change — use useLayoutEffect for immediate execution
  // before the browser paints, and also a setTimeout fallback for Next.js soft nav
  useEffect(() => {
    // Immediate scroll
    window.scrollTo(0, 0);
    // Fallback for Next.js client-side navigation timing
    const timeout = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 0);
    return () => clearTimeout(timeout);
  }, [pathname]);

  // Show/hide floating button
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      className={`scroll-to-top ${visible ? 'visible' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
    >
      ↑
    </button>
  );
}
