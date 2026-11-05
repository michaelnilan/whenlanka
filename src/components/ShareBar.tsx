import { useState } from 'react';
import { track } from '../lib/analytics';

export default function ShareBar({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      track('share', { method: 'copy' });
    } catch {
      /* clipboard blocked */
    }
  };
  const btn = 'text-sm px-3 py-1.5 rounded-lg border border-line bg-white hover:border-teal';
  return (
    <div className="flex flex-wrap gap-2 no-print">
      <button type="button" className={btn} onClick={copy}>{copied ? 'Link copied ✓' : 'Copy link'}</button>
      <a className={btn + ' text-ink no-underline'} href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener" onClick={() => track('share', { method: 'whatsapp' })}>
        WhatsApp
      </a>
      <button type="button" className={btn} onClick={() => { track('share', { method: 'print' }); window.print(); }}>Print / PDF</button>
      <a className="text-sm px-3 py-1.5 rounded-lg bg-saffron text-white font-medium no-underline hover:brightness-95" href="#driver">Get a driver quote</a>
    </div>
  );
}
