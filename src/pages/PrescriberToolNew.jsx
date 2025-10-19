
import React from 'react';
import MedicationLocator from '@/components/agent/MedicationLocator';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';

export default function PrescriberToolNew() {
  // Compute once; do NOT early-return before hooks
  const params = new URLSearchParams(window.location.search);
  const hideBadge = params.has('hide_badge');

  const [allowControlled, setAllowControlled] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const me = await User.me();
        const isVerifiedPrescriber = me?.user_role === 'prescriber' && me?.npi_status === 'verified';
        const isPrescriberStaff = me?.user_role === 'prescriber_staff';
        setAllowControlled(!!(isVerifiedPrescriber || isPrescriberStaff));
      } catch (_) {
        // No specific error handling needed for this case,
        // as the default `allowControlled` state of `false` is acceptable.
        setAllowControlled(false);
      }
    })();
  }, []);

  return (
    <div className="page">
      {/* Conditionally render preview inside return to keep hooks order valid */}
      {hideBadge ? (
        <>
          <h1 style={{ fontWeight: 700, fontSize: 18, margin: '8px 12px 4px' }}>Start New</h1>
          <div className="form-card p-2" id="formCard" style={{ maxHeight: 'none', overflow: 'visible' }}>
             <div className="text-sm text-gray-600">Preview mode: data calls disabled.</div>
           </div>
        </>
      ) : (
        <>
          <h1 style={{ fontWeight: 700, fontSize: 18, margin: '8px 12px 4px' }}>Start New</h1>
          {/* MedicationLocator shows the PHI note */}
          <div className="form-card p-2" id="formCard" style={{ maxHeight: 'none', overflow: 'visible' }}>
            <MedicationLocator
              allowControlledSubstances={allowControlled}
              onBroadcastComplete={({ requestId, referenceNumber }) => {
                const navigate = window.__RTX_NAVIGATE__;
                // Fallback to window.location if navigate helper unavailable (safe guard)
                if (requestId) {
                  const nav = window.__RTX_NAVIGATE__;
                  const path = `/PrescriberRequest?requestId=${encodeURIComponent(requestId)}`;
                  if (typeof nav === 'function') nav(path); else window.location.href = path;
                } else {
                  const nav = window.__RTX_NAVIGATE__;
                  if (typeof nav === 'function') nav('/PrescriberTool'); else window.location.href = '/PrescriberTool';
                }
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
