import React from "react";

// No-op NotificationBell to fully disable notifications polling and API calls.
// Keeps imports elsewhere from breaking while eliminating 429s and delays.
export default function NotificationBell() {
  return null;
}