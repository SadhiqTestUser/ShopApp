import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Gift,
  ToyBrick,
  Sparkles,
  Trophy,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Navigation,
  Heart,
} from 'lucide-react';
import { fadeInUp, staggerContainer } from '@/lib/motion';

const MAPS_URL =
  'https://www.google.com/maps?rlz=1C1GCEU_enIN1227IN1227&um=1&ie=UTF-8&fb=1&gl=in&sa=X&geocode=KfebNCHF2zQ6MfxE7G46xWa4&daddr=Heritage+lane%2C+Idgah+Rd%2C+beside+Vanijya+Bhavan+Road%2C+Shankar+Villas+Center%2C+Vidyanagar%2C+Suryapet%2C+Telangana+508213';
const INSTAGRAM_URL = 'https://www.instagram.com/ayyappashoppinghub/';

const CATEGORIES = [
  { label: 'Custom Gifts', Icon: Gift },
  { label: 'Toys', Icon: ToyBrick },
  { label: 'Divine Idols', Icon: Sparkles },
  { label: 'Sports Items', Icon: Trophy },
];

// A tiny cartoon "runner": the given emoji jogs across the ground band while
// gently bobbing. `delay`/`duration`/`bottom` vary per runner so the parade
// feels lively rather than uniform.
function Runner({
  emoji,
  duration,
  delay,
  bottom,
}: {
  emoji: string;
  duration: number;
  delay: number;
  bottom: number;
}) {
  return (
    <motion.div
      className="absolute select-none text-2xl sm:text-3xl will-change-transform"
      style={{ bottom }}
      initial={{ x: '-16vw' }}
      animate={{ x: '116vw' }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
      aria-hidden
    >
      <motion.span
        className="inline-block"
        animate={{ y: [0, -9, 0], rotate: [-3, 3, -3] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {emoji}
      </motion.span>
    </motion.div>
  );
}

// Decorative band of little characters running across a dashed "ground" line.
function RunningCharacters() {
  const reduce = useReducedMotion();
  if (reduce) return <div className="h-8" aria-hidden />;
  return (
    <div className="relative h-16 sm:h-20 overflow-hidden" aria-hidden>
      <div className="absolute bottom-3 left-0 right-0 border-t-2 border-dashed border-slate-700/60" />
      <Runner emoji="🎁" duration={16} delay={0} bottom={14} />
      <Runner emoji="🧸" duration={21} delay={5} bottom={16} />
      <Runner emoji="🏏" duration={26} delay={10} bottom={14} />
      <Runner emoji="🪁" duration={29} delay={14} bottom={20} />
      <Runner emoji="🎈" duration={32} delay={18} bottom={24} />
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative bg-slate-900 text-slate-300 overflow-hidden">
      <RunningCharacters />

      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-14"
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <motion.div variants={fadeInUp}>
            <div className="flex items-center gap-3 text-white font-bold text-xl mb-4">
              <motion.div
                whileHover={{ scale: 1.08, rotate: 6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-900/40"
              >
                <Gift className="w-5 h-5 text-white" />
              </motion.div>
              <span className="leading-tight">
                Ayyappa
                <span className="block text-sm font-medium text-slate-400">Shopping Centre</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-300 font-semibold italic">
              “Destination for perfect gifts”
            </p>
            <p className="text-sm leading-relaxed text-slate-400 mt-3">
              Your one-stop shop in Suryapet for custom gifts, toys, divine idols, and sports items.
            </p>
          </motion.div>

          {/* Categories */}
          <motion.div variants={fadeInUp}>
            <h4 className="text-white font-semibold mb-4">What We Offer</h4>
            <ul className="space-y-3 text-sm">
              {CATEGORIES.map(({ label, Icon }) => (
                <li key={label}>
                  <Link
                    to="/products"
                    className="group inline-flex items-center gap-2.5 hover:text-teal-400 transition-colors"
                  >
                    <span className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-teal-600 flex items-center justify-center transition-colors">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="transition-transform group-hover:translate-x-1">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div variants={fadeInUp}>
            <h4 className="text-white font-semibold mb-4">Get In Touch</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                <span>Suryapet, Telangana</span>
              </li>
              <li>
                <a
                  href="tel:9290606319"
                  className="flex items-center gap-2.5 hover:text-teal-400 transition-colors"
                >
                  <Phone className="w-4 h-4 text-teal-400 shrink-0" /> 92906 06319
                </a>
              </li>
              <li>
                <a
                  href="mailto:sathvika422@gmail.com"
                  className="flex items-center gap-2.5 hover:text-teal-400 transition-colors break-all"
                >
                  <Mail className="w-4 h-4 text-teal-400 shrink-0" /> sathvika422@gmail.com
                </a>
              </li>
            </ul>
          </motion.div>

          {/* Find us */}
          <motion.div variants={fadeInUp}>
            <h4 className="text-white font-semibold mb-4">Find Us</h4>
            <motion.a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm font-medium shadow-lg shadow-teal-900/40 hover:shadow-teal-900/60 transition-shadow"
            >
              <Navigation className="w-4 h-4" /> View on Google Maps
            </motion.a>
            <div className="flex gap-3 mt-5">
              <motion.a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                whileHover={{ scale: 1.12, rotate: -6 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-gradient-to-br hover:from-pink-500 hover:to-orange-500 flex items-center justify-center transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </motion.a>
            </div>
          </motion.div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Ayyappa Shopping Centre. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Made with
            <motion.span
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex"
            >
              <Heart className="w-4 h-4 text-teal-400 fill-teal-400" />
            </motion.span>
            in Suryapet
          </p>
        </div>
      </motion.div>
    </footer>
  );
}
