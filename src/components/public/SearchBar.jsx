import React from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { rxnormSearch } from "@/api/functions";
import { createPageUrl } from "@/utils";

export default function SearchBar() {
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef(null);
  const debounceRef = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const runSearch = async (q) => {
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await rxnormSearch({ query: q.trim(), includeControlled: false });
      const items = Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 12) : [];
      setSuggestions(items);
      setOpen(items.length > 0);
    } finally {
      setLoading(false);
    }
  };

  const onChange = (v) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(v), 250);
  };

  const goToDetail = (s) => {
    const rxcui = s?.rxcui || "";
    const name = s?.name || "";
    const navigate = window.__RTX_NAVIGATE__;
    if (rxcui) {
      const path = createPageUrl(`MedicationPublic?rxcui=${encodeURIComponent(rxcui)}`);
      if (typeof navigate === 'function') navigate(path); else window.location.href = path;
    } else if (name) {
      const path = createPageUrl(`MedicationPublic?name=${encodeURIComponent(name)}`);
      if (typeof navigate === 'function') navigate(path); else window.location.href = path;
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      goToDetail(suggestions[0]);
    } else if (query.trim().length >= 2) {
      const path = createPageUrl(`MedicationPublic?name=${encodeURIComponent(query.trim())}`);
      const navigate = window.__RTX_NAVIGATE__;
      if (typeof navigate === 'function') navigate(path); else window.location.href = path;
    }
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={onSubmit}>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setOpen(suggestions.length > 0)}
            placeholder="Search medications (e.g., Amoxicillin, Lexapro)…"
            className="h-12 text-base"
            inputMode="search"
          />
          <Button type="submit" className="h-12 px-5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
            Search
          </Button>
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <Card className="absolute mt-2 w-full z-30 overflow-hidden border shadow-lg">
          <div className="max-h-80 overflow-auto">
            {suggestions.map((s) => (
              <button
                key={`${s.rxcui || s.name}`}
                onClick={() => goToDetail(s)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50"
              >
                <div className="font-medium text-sm text-gray-900 truncate">{s.name}</div>
                {s.tty && <div className="text-xs text-gray-500 mt-0.5">{s.tty}</div>}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}