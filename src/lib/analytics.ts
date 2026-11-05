type Props = Record<string, string | number | boolean>;
declare global {
  interface Window { plausible?: (event: string, opts?: { props?: Props }) => void }
}
/** Fire a Plausible custom event; a no-op when analytics is disabled or blocked. */
export function track(event: 'affiliate_click' | 'lead_submit' | 'share', props: Props = {}) {
  try {
    window.plausible?.(event, { props });
  } catch {
    /* ignore */
  }
}
