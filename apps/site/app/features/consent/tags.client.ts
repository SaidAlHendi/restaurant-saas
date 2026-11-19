import { gtagIds, gtagScriptUrl, type TrackingIds } from './tracking.js';

type FbqFunction = ((...args: unknown[]) => void) & {
  queue: unknown[][];
  loaded: boolean;
  callMethod?: (...args: unknown[]) => void;
};

type TrackingWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: FbqFunction;
  _fbq?: FbqFunction;
};

function trackingWindow(): TrackingWindow {
  return window;
}

function addScript(src: string): void {
  if (document.querySelector(`script[src="${src}"]`)) {
    return;
  }
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function loadGtag(ids: TrackingIds): void {
  const idList = gtagIds(ids);
  const first = idList[0];
  const w = trackingWindow();
  if (first === undefined || w.gtag !== undefined) {
    return;
  }
  w.dataLayer = w.dataLayer ?? [];
  const layer = w.dataLayer;
  // gtag.js requires the `arguments` object itself on the data layer, not an array of them.
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    layer.push(arguments);
  };
  w.gtag('js', new Date());
  for (const id of idList) {
    w.gtag('config', id);
  }
  addScript(gtagScriptUrl(first));
}

function loadMetaPixel(pixelId: string | null): void {
  const w = trackingWindow();
  if (pixelId === null || w.fbq !== undefined) {
    return;
  }
  const fbq: FbqFunction = Object.assign(
    (...args: unknown[]) => {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue.push(args);
      }
    },
    { queue: [] as unknown[][], loaded: true },
  );
  w.fbq = fbq;
  w._fbq = fbq;
  addScript('https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', pixelId);
  fbq('track', 'PageView');
}

/** Load analytics and ad scripts. Call this only after the visitor accepted; it is safe to repeat. */
export function loadTags(ids: TrackingIds): void {
  loadGtag(ids);
  loadMetaPixel(ids.metaPixel);
}

/** Conversion event for the thank-you page: GA4/Ads `generate_lead` and Meta `Lead`. */
export function trackLead(ids: TrackingIds): void {
  const w = trackingWindow();
  if (gtagIds(ids).length > 0) {
    w.gtag?.('event', 'generate_lead');
  }
  if (ids.metaPixel !== null) {
    w.fbq?.('track', 'Lead');
  }
}
