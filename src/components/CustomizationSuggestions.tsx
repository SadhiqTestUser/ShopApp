import { useId } from 'react';
import { MessageSquare } from 'lucide-react';
import { limitSuggestions, MAX_CUSTOMIZATION_SUGGESTIONS, readSuggestions } from '@/lib/orderSuggestions';

export function CustomizationSuggestionsField({ value, onChange, disabled = false, productName, className = '' }: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  productName?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`min-w-0 rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
        <MessageSquare className="h-4 w-4 text-teal-600" aria-hidden="true" />
        Customization suggestions <span className="text-xs font-normal text-slate-500">(optional)</span>
      </label>
      <p id={`${id}-help`} className="mt-1 text-xs leading-relaxed text-slate-500">Share any details you want us to follow while making this product. Your suggestions will be attached to this item in your order.</p>
      <textarea
        id={id} value={value} onChange={(event) => onChange(limitSuggestions(event.target.value))}
        disabled={disabled} maxLength={MAX_CUSTOMIZATION_SUGGESTIONS} rows={3}
        aria-label={productName ? `Customization suggestions for ${productName}` : undefined}
        aria-describedby={`${id}-help ${id}-count`}
        placeholder="For example: keep the name below the photo, use the exact spelling provided, or leave extra space around the design."
        className="mt-3 block w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50 disabled:opacity-70"
      />
      <p id={`${id}-count`} className="mt-1 text-right text-xs tabular-nums text-slate-400">{value.length}/{MAX_CUSTOMIZATION_SUGGESTIONS}</p>
    </div>
  );
}

export function CustomizationSuggestionsNote({ data }: { data: Record<string, unknown> | null | undefined }) {
  const text = readSuggestions(data);
  if (!text) return null;
  return (
    <div className="mt-3 min-w-0 rounded-xl border border-teal-200 bg-teal-50/60 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-teal-800"><MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />Customer customization suggestions</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 [overflow-wrap:anywhere]">{text}</p>
    </div>
  );
}