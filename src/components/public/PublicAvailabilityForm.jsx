
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Pill, Phone, Clock, MapPin } from "lucide-react";
import { rxnormSearch } from "@/api/functions";
import { getMedicationStrengths } from "@/api/functions";

const samplePharmacies = [
  { id: "s1", name: "Stone Ridge Pharmacy", city: "Stone Ridge, NY", phone: "(845) 555-0142", hours: "Mon–Fri 9am–6pm" },
  { id: "s2", name: "City Center Pharmacy", city: "Kingston, NY", phone: "(845) 555-0176", hours: "Mon–Sat 9am–7pm" },
  { id: "s3", name: "Downtown CVS", city: "New Paltz, NY", phone: "(845) 555-0134", hours: "Daily 8am–8pm" }
];

export default function PublicAvailabilityForm() {
  const [medQuery, setMedQuery] = React.useState("");
  const [loadingSug, setLoadingSug] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState([]);
  const [suggestOpen, setSuggestOpen] = React.useState(false);
  const [selectedMed, setSelectedMed] = React.useState(null);

  const [strengthOptions, setStrengthOptions] = React.useState([]);
  const [loadingStrengths, setLoadingStrengths] = React.useState(false);
  const [selectedStrength, setSelectedStrength] = React.useState("");

  const [quantity, setQuantity] = React.useState("");
  const [zip, setZip] = React.useState("");
  const [genericOk, setGenericOk] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [results, setResults] = React.useState([]);

  const boxRef = React.useRef(null);
  const debounceRef = React.useRef(null);

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setSuggestOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const fetchSuggestions = async (q) => {
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    setLoadingSug(true);
    try {
      const { data } = await rxnormSearch({ query: q.trim(), includeControlled: false });
      const allowed = new Set(["IN", "MIN", "PIN", "BN"]);
      const items = (data?.suggestions || []).filter((s) => allowed.has(s.tty)).slice(0, 10);
      setSuggestions(items);
      setSuggestOpen(items.length > 0);
    } finally {
      setLoadingSug(false);
    }
  };

  const onChangeMed = (v) => {
    setMedQuery(v);
    setSelectedMed(null);
    setStrengthOptions([]);
    setSelectedStrength("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 250);
  };

  const selectSuggestion = async (s) => {
    setSelectedMed(s);
    setMedQuery(s?.name || "");
    setSuggestOpen(false);
    // fetch strengths (exclude controlled)
    setLoadingStrengths(true);
    try {
      const params = s?.rxcui ? { rxcui: s.rxcui } : { name: s?.name || "" };
      const { data } = await getMedicationStrengths({ ...params, includeControlled: false });
      const list = Array.isArray(data?.strengths) ? data.strengths : [];
      const strengths = Array.from(new Set(list.map((o) => (o.strength || "").trim()).filter(Boolean)));
      setStrengthOptions(strengths);
      setSelectedStrength("");
    } finally {
      setLoadingStrengths(false);
    }
  };

  const valid = () => {
    return !!selectedMed && !!selectedStrength && /^\d+$/.test(quantity) && /^\d{5}$/.test(zip);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valid()) return;
    setSubmitting(true);
    // Informational only: show sample pharmacies, do not store or broadcast
    setTimeout(() => {
      setResults(samplePharmacies);
      setSubmitting(false);
    }, 400);
  };

  return (
    <Card className="border rounded-xl">
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div ref={boxRef} className="relative">
            <Label className="text-xs font-semibold text-gray-700">Medication Name</Label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  value={medQuery}
                  onChange={(e) => onChangeMed(e.target.value)}
                  onFocus={() => setSuggestOpen(suggestions.length > 0)}
                  placeholder="Start typing (e.g., Amoxicillin, Lexapro)…"
                  className="h-11"
                />
                {loadingSug && <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" />}
              </div>
              <Button type="button" variant="secondary" className="h-11" onClick={() => fetchSuggestions(medQuery)}>
                <Search className="w-4 h-4 mr-2" /> Search
              </Button>
            </div>
            {suggestOpen && suggestions.length > 0 && (
              <Card className="absolute z-20 mt-2 w-full overflow-hidden border shadow-md">
                <div className="max-h-64 overflow-auto">
                  {suggestions.map((s) => (
                    <button
                      key={`${s.rxcui || s.name}`}
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                      {s.tty && <div className="text-xs text-gray-500">{s.tty}</div>}
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Strength / Dose</Label>
              {loadingStrengths ? (
                <div className="flex items-center h-11 px-3 border rounded-md text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading strengths…
                </div>
              ) : strengthOptions.length > 0 ? (
                <select
                  className="mt-1 w-full h-11 border rounded-md px-3"
                  value={selectedStrength}
                  onChange={(e) => setSelectedStrength(e.target.value)}
                >
                  <option value="">Select strength</option>
                  {strengthOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <Input
                  className="h-11 mt-1"
                  placeholder="e.g., 500 mg"
                  value={selectedStrength}
                  onChange={(e) => setSelectedStrength(e.target.value)}
                />
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Quantity</Label>
              <Input
                className="h-11 mt-1"
                placeholder="e.g., 30"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">ZIP Code</Label>
              <Input
                className="h-11 mt-1"
                placeholder="e.g., 10001"
                inputMode="numeric"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="genericOk" checked={genericOk} onCheckedChange={(v) => setGenericOk(!!v)} />
            <Label htmlFor="genericOk" className="text-sm text-gray-700">Generic acceptable</Label>
          </div>

          <div className="flex">
            <Button type="submit" disabled={!valid() || submitting} className="h-11 px-6">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Pill className="w-4 h-4 mr-2" />}
              Locate Medication Availability
            </Button>
          </div>
        </form>

        {results.length > 0 && (
          <div className="mt-6">
            {/* Clear note that results are examples only */}
            <p className="text-xs text-gray-500 mb-2">
              These are sample results to demonstrate the experience — not live availability.
            </p>
            <h3 className="font-semibold text-gray-900 mb-3">Nearby pharmacies (example)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {results.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" /> {p.city}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {p.phone}
                    </div>
                    {p.hours && (
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {p.hours}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-700">
              Ask your doctor to use RealTimeRx so they can send your prescription directly to a pharmacy with stock.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
