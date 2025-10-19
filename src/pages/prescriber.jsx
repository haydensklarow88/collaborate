import React from 'react';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function PrescriberRedirect() {
  React.useEffect(() => {
  const nav = window.__RTX_NAVIGATE__;
  if (typeof nav === 'function') nav('PrescriberTool'); else window.location.href = createPageUrl('PrescriberTool');
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Prescriber Tool...
    </div>
  );
}