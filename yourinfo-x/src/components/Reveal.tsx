import { useEffect, useRef, useState, type ReactNode } from 'react';

// Wraps a value in a redaction bar that wipes away to reveal it. The signature
// motif of the dossier: data starts blacked out, then declassifies on view.
export function Redact({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShow(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          window.setTimeout(() => setShow(true), delay);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <span ref={ref} className={`redact${show ? ' show' : ''}`}>
      <span>{children}</span>
    </span>
  );
}
