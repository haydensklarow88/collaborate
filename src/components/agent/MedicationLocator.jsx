
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, Send, MapPin } from "lucide-react";
import { rxnormSearch } from "@/api/functions";
import { getMedicationStrengths } from "@/api/functions";
import { broadcastStockCheck } from "@/api/functions";

export default function MedicationLocator({ allowControlledSubstances = false, onBroadcastComplete }) {
  // Search state
  const [q, setQ] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState([]);

  // Selection state
  const [selectedDrug, setSelectedDrug] = React.useState(null);
  const [strengths, setStrengths] = React.useState([]);
  const [selectedStrengthIdx, setSelectedStrengthIdx] = React.useState(-1);
  const [loadingStrengths, setLoadingStrengths] = React.useState(false);
  // Add state to hold preselected strength hint from search
  const [preselectStrength, setPreselectStrength] = React.useState(null);

  // Form fields
  const [quantity, setQuantity] = React.useState(""); // default to blank
  const [zip, setZip] = React.useState("");
  const [radius, setRadius] = React.useState(10);
  const [genericOk, setGenericOk] = React.useState(true);

  // Insurance and compliance
  // medicare_medicaid | commercial_private | no_insurance | unsure
  const [insuranceType, setInsuranceType] = React.useState(""); // CHANGED: no default
  const [cashPricing, setCashPricing] = React.useState(false);
  const [complianceMessage, setComplianceMessage] = React.useState("");

  // Submit state
  const [broadcasting, setBroadcasting] = React.useState(false);

  const canSubmit =
    !!selectedDrug &&
    selectedStrengthIdx >= 0 &&
    zip.trim().length >= 5 &&
    Number(radius) > 0 &&
    Number(quantity) > 0 &&
    insuranceType !== ""; // Make insurance type selection required for submission

  // Debounced search
  const debounceRef = React.useRef(null);
  React.useEffect(() => {
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await rxnormSearch({
        query: q.trim(),
        includeControlled: !!allowControlledSubstances
      });
      setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      setSearching(false);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, allowControlledSubstances]);

  // Select a suggestion and load strengths
  const selectSuggestion = async (sug) => {
    setSelectedDrug(sug);
    setSelectedStrengthIdx(-1);
    setStrengths([]);
    // Store desired strength hint if present
    const hint = sug?.desired_strength && sug?.desired_strength.value && sug?.desired_strength.unit
      ? { value: Number(sug.desired_strength.value), unit: String(sug.desired_strength.unit).toLowerCase().replace(/s$/, "") }
      : null;
    setPreselectStrength(hint);

    if (!sug) return;
    setLoadingStrengths(true);
    const { data } = await getMedicationStrengths({
      name: sug.name,
      rxcui: sug.rxcui,
      includeControlled: !!allowControlledSubstances
    });
    const list = Array.isArray(data?.strengths) ? data.strengths : [];
    setStrengths(list);
    setLoadingStrengths(false);

    // Try to auto-select matching strength
    if (hint && Array.isArray(list) && list.length > 0) {
      const norm = (txt) => {
        const p = normalizeStrengthString(txt);
        return p ? { value: Number(p.value), unit: String(p.unit) } : null;
      };
      let idx = -1;
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        const parsed = norm(s?.strength || s?.label || s?.name);
        if (parsed && parsed.unit === hint.unit && Math.abs(parsed.value - hint.value) < 0.0001) {
          idx = i; break;
        }
      }
      if (idx >= 0) setSelectedStrengthIdx(idx);
    }
  };

  // Local parser mirroring backend for strength strings
  function normalizeStrengthString(str) {
    const s = String(str || "").toLowerCase();
    const m = s.match(/(\d+(?:\.\d+)?)\s*(mg|g|mcg|ml|units?)/i);
    if (!m) return null;
    return { value: Number(m[1]), unit: m[2].toLowerCase().replace(/s$/, "") };
  }

  const strengthLabel = (s) => {
    if (!s) return "";
    if (s.label) return s.label;
    if (s.strength && s.form) return `${s.strength} — ${s.form}`;
    return s.name || "Option";
  };

  // Compliance messaging logic
  React.useEffect(() => {
    if (!insuranceType) {
      setComplianceMessage("");
      return;
    }
    let msg = "";
    if (insuranceType === "medicare_medicaid" || insuranceType === "unsure") {
      msg = "Pricing information for Medicare or Medicaid covered prescriptions is not available in this app. Please advise your patient to contact their pharmacy directly for coverage and cost details.";
    } else if (insuranceType === "commercial_private") {
      msg = cashPricing
        ? "You are viewing cash pricing only. Insurance benefits are not applied through this app."
        : "Insurance pricing is not displayed in this app. Please advise your patient to contact their pharmacy for insurance coverage and cost information.";
    } else if (insuranceType === "no_insurance") {
      msg = "You are viewing cash pricing only. Insurance is not billed or processed in this app.";
    }
    setComplianceMessage(msg);
  }, [insuranceType, cashPricing]);

  // Submit broadcast request
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const sel = strengths[selectedStrengthIdx];

    // UPDATED: include rxcui and display_name to satisfy MedicationRequest schema
    const med = {
      id: String(sel?.rxcui || selectedDrug?.rxcui || selectedDrug?.name || "med"),
      rxcui: String(sel?.rxcui || selectedDrug?.rxcui || ""),
      name: selectedDrug?.name || sel?.label || "Medication",
      display_name: selectedDrug?.display_name || selectedDrug?.name || (sel ? strengthLabel(sel) : "Medication"),
      dosage: sel?.strength || null,
      form: sel?.form || null,
      quantity: Number(quantity) || null
    };

    setBroadcasting(true);
    const { data } = await broadcastStockCheck({
      zip: zip.trim(),
      radius: Number(radius),
      generic_acceptable: !!genericOk,
      medications: [med],
      insurance_coverage_type: insuranceType,
      cash_pricing_requested: !!cashPricing
    });
    setBroadcasting(false);

    if (typeof onBroadcastComplete === "function") {
      onBroadcastComplete({
        requestId: data?.medication_request_id || null,
        referenceNumber: data?.reference_number || null
      });
    }
  };

  // Limit suggestions to avoid internal scroll; keep compact
  const limitedSuggestions = Array.isArray(suggestions) ? suggestions.slice(0, 4) : [];

  return (
    <div className="space-y-2 sm:space-y-3 overflow-x-hidden">
      <Card className="border-amber-200">
        <CardContent className="p-2 sm:p-3">
          <div className="text-[10px] sm:text-[11px] text-amber-700 leading-snug">
            Do not enter any patient PHI. This tool only checks pharmacy stock availability.
          </div>
        </CardContent>
      </Card>

      <form onSubmit={onSubmit} className="space-y-2 sm:space-y-3">
        {/* Medication search */}
        <div className="grid gap-2">
          <label className="label">Medication search</label>
          <div className="relative">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search generic or brand name…"
              className="pr-10 h-9"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>

          {searching && (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Searching…
            </div>
          )}

          {limitedSuggestions.length > 0 && (
            <div className="border rounded-md overflow-hidden max-h-28 sm:max-h-40 overflow-y-hidden">
              {limitedSuggestions.map((sug, idx) => (
                <button
                  key={`${sug.rxcui || sug.name}-${idx}`}
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${selectedDrug?.rxcui === sug.rxcui ? "bg-gray-50" : ""}`}
                  onClick={() => selectSuggestion(sug)}
                  title={sug.display_name || sug.name}
                >
                  <div className="text-sm font-medium truncate">{sug.display_name || sug.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Strength selection */}
        {selectedDrug && (
          <div className="grid gap-2">
            <label className="label">Strength &amp; form</label>
            {loadingStrengths ? (
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading strengths…
              </div>
            ) : strengths.length > 0 ? (
              <select
                className="select h-9"
                value={String(selectedStrengthIdx)}
                onChange={(e) => setSelectedStrengthIdx(Number(e.target.value))}
              >
                <option value={-1} disabled>
                  Select a strength/form…
                </option>
                {strengths.map((s, i) => (
                  <option key={`${s.rxcui || i}`} value={i}>
                    {strengthLabel(s)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs text-gray-500">No strength/form options found for this drug name.</div>
            )}
          </div>
        )}

        {/* Quantity + ZIP aligned row */}
        <div className="grid grid-cols-2 gap-2 items-end">
          <div className="grid gap-2">
            <label className="label">Quantity</label>
            <Input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="e.g., 30"
              className="h-10"
            />
          </div>
          <div className="grid gap-2">
            <label className="label">ZIP</label>
            <Input
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
              inputMode="numeric"
              placeholder="ZIP"
              maxLength={5}
              className="h-10"
            />
          </div>
        </div>

        {/* Radius + Insurance aligned row */}
        <div className="grid grid-cols-2 gap-2 items-end">
          <div className="grid gap-2">
            <label className="label">Search radius</label>
            <select
              className="select h-10"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            >
              <option value={5}>5 miles</option>
              <option value={10}>10 miles</option>
              <option value={25}>25 miles</option>
              <option value={50}>50 miles</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="label">Patient’s Insurance Coverage Type</label>
            <select
              className="select h-10"
              value={insuranceType}
              onChange={(e) => {
                const v = e.target.value;
                setInsuranceType(v);
                if (v !== "commercial_private") setCashPricing(false);
              }}
              required
            >
              <option value="" disabled>Select insurance type…</option>
              <option value="medicare_medicaid">Medicare or Medicaid</option>
              <option value="commercial_private">Commercial/Private Insurance</option>
              <option value="no_insurance">No Insurance Coverage</option>
              <option value="unsure">Unsure</option>
            </select>
          </div>
        </div>

        {/* Checkboxes row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="genericOk"
              checked={genericOk}
              onCheckedChange={(v) => setGenericOk(!!v)}
            />
            <label htmlFor="genericOk" className="text-sm">Generic acceptable</label>
          </div>

          {insuranceType === "commercial_private" && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="cashPrice"
                checked={cashPricing}
                onCheckedChange={(v) => setCashPricing(!!v)}
              />
              <label htmlFor="cashPrice" className="text-sm">Show cash price</label>
            </div>
          )}
        </div>

        {/* Compliance message card */}
        {complianceMessage && (
          <Card className="border-blue-200">
            <CardContent className="p-2 sm:p-3">
              <div className="text-[10px] sm:text-[11px] text-blue-700 leading-snug">
                {complianceMessage}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="sticky-actions">
          <div className="actions" style={{ margin: '8px 8px calc(8px + env(safe-area-inset-bottom))' }}>
            <Button
              type="submit"
              className="flex-1"
              disabled={!canSubmit || broadcasting}
            >
              {broadcasting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Broadcasting…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to pharmacies
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
