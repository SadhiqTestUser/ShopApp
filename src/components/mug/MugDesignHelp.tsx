import { ArrowUpRight, MessageCircle } from 'lucide-react';

// Public shop contact shown in the footer, with India's country code.
const WHATSAPP_NUMBER = '919290606319';
const MESSAGE = "Hi Printcraft! I'd like a custom design for a white mug instead of the available templates. Can we discuss my idea?";

export default function MugDesignHelp() {
  return (
    <aside aria-label="Custom mug design help" className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-white p-2 text-emerald-700 shadow-sm"><MessageCircle className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">Can't find a template you love?</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">Contact us on WhatsApp to discuss a custom mug design before ordering.</p>
        </div>
      </div>
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`}
        target="_blank" rel="noopener noreferrer"
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        Chat on WhatsApp <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </a>
      <p className="mt-3 text-xs leading-relaxed text-slate-600"><strong className="font-semibold text-slate-800">No template or agreed custom design?</strong> If you order without selecting a template or agreeing a custom design with us on WhatsApp, the final design will be chosen by our team, not the customer.</p>
    </aside>
  );
}