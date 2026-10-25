import { useEffect } from 'react';

// Marks a not-found screen as a real 404 for crawlers while it is shown.
export default function useNotFoundMeta(active) {
  useEffect(() => {
    if (!active) return undefined;
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [active]);
}