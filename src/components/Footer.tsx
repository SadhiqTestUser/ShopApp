import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Printer,
  Sparkles,
} from 'lucide-react';

const MAPS_URL =
  'https://www.google.com/maps?rlz=1C1GCEU_enIN1227IN1227&um=1&ie=UTF-8&fb=1&gl=in&sa=X&geocode=KfebNCHF2zQ6MfxE7G46xWa4&daddr=Heritage+lane%2C+Idgah+Rd%2C+beside+Vanijya+Bhavan+Road%2C+Shankar+Villas+Center%2C+Vidyanagar%2C+Suryapet%2C+Telangana+508213';
const INSTAGRAM_URL = 'https://www.instagram.com/ayyappashoppinghub/';

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Products', to: '/products' },
  { label: 'Cart', to: '/cart' },
  { label: 'Dashboard', to: '/dashboard' },
];

function FooterGlow() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl"
        animate={reduce ? undefined : { x: [0, 35, 0], y: [0, -18, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-20 bottom-28 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl"
        animate={reduce ? undefined : { x: [0, -28, 0], y: [0, 24, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]" />
    </div>
  );
}

export default function Footer() {
  const reduce = useReducedMotion();

  return (
    <footer className="relative overflow-hidden bg-slate-950 text-slate-300">
      <FooterGlow />
      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_0.7fr_0.9fr_1fr]">
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 18 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link to="/" className="group inline-flex items-center gap-3 text-white">
              <motion.span
                whileHover={reduce ? undefined : { rotate: 6, scale: 1.06 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg shadow-teal-950/50"
              >
                <Printer className="h-5 w-5" />
              </motion.span>
              <span className="text-xl font-bold tracking-tight">Printcraft</span>
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-6 text-slate-400">
              Turn your favourite moments into beautifully made products that last.
            </p>
            <Link
              to="/products"
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2.5 text-sm font-semibold text-teal-200 transition-colors hover:border-teal-300/60 hover:bg-teal-400/20 hover:text-white"
            >
              Start creating <ArrowUpRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 18 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">Explore</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {footerLinks.map((link) => (
                <li key={link.to}>
                  <Link className="group inline-flex items-center gap-1 text-slate-400 transition-colors hover:text-teal-300" to={link.to}>
                    {link.label}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 18 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">Contact</h2>
            <ul className="mt-5 space-y-4 text-sm text-slate-400">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                <span>Suryapet, Telangana</span>
              </li>
              <li>
                <a href="tel:9290606319" className="flex items-center gap-3 transition-colors hover:text-teal-300">
                  <Phone className="h-4 w-4 shrink-0 text-teal-400" /> 92906 06319
                </a>
              </li>
              <li>
                <a href="mailto:sathvika422@gmail.com" className="flex items-center gap-3 break-all transition-colors hover:text-teal-300">
                  <Mail className="h-4 w-4 shrink-0 text-teal-400" /> sathvika422@gmail.com
                </a>
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 18 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">Find us</h2>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-transform hover:-translate-y-0.5"
            >
              View on Google Maps <ArrowUpRight className="h-4 w-4" />
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="mt-5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 text-slate-300 transition-colors hover:border-teal-400 hover:bg-teal-400/10 hover:text-teal-300"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </motion.div>
        </div>

        <motion.div
          className="mt-20 overflow-hidden border-y border-slate-800/80 py-6"
          initial={reduce ? undefined : { opacity: 0 }}
          whileInView={reduce ? undefined : { opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="flex w-max items-center gap-8 whitespace-nowrap text-[clamp(3.5rem,10vw,9rem)] font-black uppercase leading-none tracking-[-0.08em] text-white/[0.07]"
            animate={reduce ? undefined : { x: ['0%', '-18%'] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          >
            <span>Printcraft</span>
            <Sparkles className="h-12 w-12 text-teal-400/40 sm:h-20 sm:w-20" />
            <span>Printcraft</span>
            <Sparkles className="h-12 w-12 text-teal-400/40 sm:h-20 sm:w-20" />
            <span>Printcraft</span>
          </motion.div>
        </motion.div>

        <div className="flex flex-col items-center justify-between gap-3 pt-7 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Printcraft. All rights reserved.</p>
          <p>Made for memories.</p>
        </div>
      </div>
    </footer>
  );
}
