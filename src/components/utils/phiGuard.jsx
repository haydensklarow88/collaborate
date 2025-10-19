export function containsPHIPatterns(value) {
  if (!value || typeof value !== "string") return false;
  const v = value.trim();

  // Basic PHI-like patterns:
  const patterns = [
    // Emails
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    // Phone numbers (various formats)
    /(\+?\d{1,2}[\s.-]?)?(\(?\d{3}\)?[\s.-]?){1}\d{3}[\s.-]?\d{4}\b/,
    // SSN format
    /\b\d{3}-\d{2}-\d{4}\b/,
    // DOB-like dates (MM/DD/YYYY or YYYY-MM-DD)
    /\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])[/-](19|20)\d{2}\b/,
    /\b(19|20)\d{2}[/-](0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])\b/,
    // MRN/prescription-like long numeric tokens (7+ digits)
    /\b\d{7,}\b/,
    // Obvious address with number + street (helps avoid pasting addresses in generic fields)
    /\b\d{1,5}\s+[A-Za-z0-9.'-]+\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive)\b/i,
    // Names with comma format e.g., "Doe, John" (heuristic)
    /\b[A-Za-z][A-Za-z'-]+\s*,\s*[A-Za-z][A-Za-z'-]+\b/
  ];

  return patterns.some((re) => re.test(v));
}

export function phiErrorMessage() {
  return "This field cannot contain emails, phone numbers, dates, IDs, or anything resembling PHI.";
}