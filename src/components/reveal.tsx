import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

// Masked word-by-word rise. Each word sits inside an overflow-hidden mask and
// slides up into view, staggered for a cascading editorial reveal.
export function RevealText({
  text,
  className,
  delay = 0,
  stagger = 0.06,
  mode = 'view',
  as = 'span',
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  mode?: 'view' | 'mount';
  as?: 'span' | 'h1' | 'h2' | 'p';
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const active = mode === 'mount' ? true : inView;
  const words = text.split(' ');
  const Tag = motion[as];

  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{text}</Plain>;
  }

  return (
    <Tag ref={ref as never} className={className} style={{ display: 'inline-block' }}>
      {words.map((word, i) => (
        <span
          key={i}
          style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }}
        >
          <motion.span
            style={{ display: 'inline-block' }}
            initial={{ y: '110%' }}
            animate={active ? { y: 0 } : { y: '110%' }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
              delay: delay + i * stagger,
            }}
          >
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

// Infinite horizontal ticker. Children are duplicated so the loop is seamless.
export function Marquee({
  children,
  speed = 30,
  reverse = false,
  className,
}: {
  children: ReactNode;
  speed?: number;
  reverse?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={`overflow-hidden ${className ?? ''}`}>
      <motion.div
        className="flex w-max"
        animate={reduce ? undefined : { x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
        transition={{ duration: speed, ease: 'linear', repeat: Infinity }}
      >
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

// Counts up to `value` once scrolled into view. Supports prefix/suffix and
// locale-formatted thousands.
export function CountUp({
  value,
  duration = 1.8,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}
