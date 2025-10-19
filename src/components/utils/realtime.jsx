
import { base44 } from "@/api/base44Client";

// Tiny helper to publish realtime events through the backend events function.
// Usage: await notifyEvent({ channel: "user@email.com", event: "request_update", payload: {...} })
function normChannel(ch) {
  return String(ch || "").trim().toLowerCase();
}

export async function notifyEvent({ channel, event, payload }) {
  const ch = normChannel(channel);
  if (!ch || !event) return;
  const body = { channel: ch, event, payload: payload || {} };

  try {
    const res = await base44.functions.invoke("events", body);
    const delivered = Number(res?.data?.delivered ?? 0);
    if (delivered > 0) return;

    // Retry with small backoff if no listeners were delivered to (possible race)
    let delay = 400;
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, delay));
      const retry = await base44.functions.invoke("events", body);
      const d2 = Number(retry?.data?.delivered ?? 0);
      if (d2 > 0) return;
      delay = Math.min(delay * 2, 1600);
    }
    // Non-fatal; UI should continue even if best-effort notify fails
    // eslint-disable-next-line no-console
    console.warn("[realtime] notifyEvent delivered=0 after retries for", { ch, event });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[realtime] notifyEvent failed:", e?.message || e);
  }
}
