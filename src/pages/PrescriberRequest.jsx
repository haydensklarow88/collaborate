
import React from 'react';
import PrescriberRequestDetail from '@/components/agent/PrescriberRequestDetail';
import { createPageUrl } from '@/utils';

export default function PrescriberRequest() {
  const [requestId, setRequestId] = React.useState(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('requestId');
    setRequestId(id || null);
  }, []);

  if (!requestId) {
    return (
      <div className="page">
        <h1 style={{ fontWeight: 700, fontSize: 18, margin: '8px 12px 4px' }}>Request</h1>
        <div className="form-card">
          <div className="text-sm text-gray-600">No request ID provided.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 style={{ fontWeight: 700, fontSize: 18, margin: '8px 12px 4px' }}>Request</h1>
      <div style={{ margin: '0 12px' }}>
        <PrescriberRequestDetail
          requestId={requestId}
          onBack={() => { const nav = window.__RTX_NAVIGATE__; if (typeof nav === 'function') nav('PrescriberTool'); else window.location.href = createPageUrl('PrescriberTool'); }}
        />
      </div>
    </div>
  );
}
