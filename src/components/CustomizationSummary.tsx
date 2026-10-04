import { ExternalLink, ImageIcon } from 'lucide-react';
import { customizationEntries, customizationImageGroups } from '@/lib/customizationDisplay';

interface Props {
  data: unknown;
  compact?: boolean;
  showImages?: boolean;
}

function ImageGroup({ title, urls, compact }: { title: string; urls: string[]; compact: boolean }) {
  if (urls.length === 0) return null;
  const size = compact ? 'h-14 w-14' : 'h-20 w-20';
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <ImageIcon className="h-3.5 w-3.5" /> {title} ({urls.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer"
            className={`group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 ${size}`}>
            <img src={url} alt={`${title} ${index + 1}`} className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <ExternalLink className="h-4 w-4 text-white" />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function CustomizationSummary({ data, compact = false, showImages = true }: Props) {
  const entries = customizationEntries(data);
  const images = customizationImageGroups(data);
  if (entries.length === 0 && (!showImages || images.all.length === 0)) return null;
  return (
    <div className={compact ? 'mt-2 space-y-3' : 'mt-4 space-y-4'}>
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entries.map((entry, index) => (
            <span key={`${entry.label}-${index}`} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
              <span className="font-medium">{entry.label}:</span> {entry.value}
            </span>
          ))}
        </div>
      )}
      {showImages && images.all.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <ImageGroup title={images.originals.length ? 'Design previews' : 'Uploaded / customized photos'} urls={images.previews} compact={compact} />
          <ImageGroup title="Original uploads" urls={images.originals} compact={compact} />
          <ImageGroup title="Print-ready images" urls={images.production} compact={compact} />
        </div>
      )}
    </div>
  );
}