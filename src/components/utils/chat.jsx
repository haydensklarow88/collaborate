
import { createPageUrl } from "@/utils";

export const DEFAULT_CHAT_VENDOR_BASE_URL = "https://your-chat-vendor.example/start";

let cachedBaseUrl = null;
let lastFetchTs = 0;

export async function resolveChatVendorBaseUrl(force = false) {
  const now = Date.now();
  if (!force && cachedBaseUrl && now - lastFetchTs < 60_000) {
    return cachedBaseUrl;
  }
  try {
    // Lazy import to avoid loading entities before auth/layout conditions
    const { AppSettings } = await import("@/api/entities");
    const list = await AppSettings.list();
    const url = list?.[0]?.chat_vendor_base_url;
    cachedBaseUrl = (typeof url === "string" && url.trim()) ? url.trim() : DEFAULT_CHAT_VENDOR_BASE_URL;
  } catch {
    cachedBaseUrl = DEFAULT_CHAT_VENDOR_BASE_URL;
  } finally {
    lastFetchTs = now;
  }
  return cachedBaseUrl;
}

export function getChatUrl({ pharmacyName, pharmacyEmail, prescriberEmail, requestId, medicationName, ready, price, address, patientName, patientId }) {
  const base = cachedBaseUrl || DEFAULT_CHAT_VENDOR_BASE_URL;
  const params = new URLSearchParams();
  if (pharmacyName) params.set("pharmacy", pharmacyName);
  if (pharmacyEmail) params.set("pharmacy_email", pharmacyEmail);
  if (prescriberEmail) params.set("prescriber_email", prescriberEmail);
  if (requestId) params.set("request_id", String(requestId));
  if (medicationName) params.set("med", medicationName);
  if (ready) params.set("ready", "1");
  if (typeof price === "number") params.set("price", String(price));
  if (address) params.set("address", address);
  if (patientName) params.set("patient_name", patientName);
  if (patientId) params.set("patient_id", String(patientId));
  return `${base}?${params.toString()}`;
}
