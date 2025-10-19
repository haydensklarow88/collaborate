import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function RouterBridge() {
  const navigate = useNavigate();
  React.useEffect(() => {
    try {
      // Accept either a path (starting with '/') or a page name (e.g., 'Home')
      window.__RTX_NAVIGATE__ = (to) => {
        try {
          if (typeof to !== 'string') return;
          // If it's an absolute URL, navigate via location
          if (to.startsWith('http://') || to.startsWith('https://')) {
            window.location.href = to;
            return;
          }
          // If it looks like a route path, use navigate directly
          if (to.startsWith('/')) {
            navigate(to);
            return;
          }
          // Otherwise assume it's a page name and convert via createPageUrl
          const path = createPageUrl(to);
          navigate(path);
        } catch (_) {
          // swallow — navigation should be best-effort
        }
      };
    } catch (_) {}
    return () => { try { delete window.__RTX_NAVIGATE__; } catch (_) {} };
  }, [navigate]);
  return null;
}
