import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@/api/entities";

const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const keys = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

function pad(n) { return String(n).padStart(2, "0"); }
function toLabel(h, m) {
  const hour = h % 24;
  const am = hour < 12;
  const hr12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hr12}:${pad(m)} ${am ? "AM" : "PM"}`;
}
function generateTimes(step = 30) {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      const val = `${pad(h)}:${pad(m)}`;
      out.push({ value: val, label: toLabel(h, m) });
    }
  }
  return out;
}
const TIME_OPTIONS = generateTimes(30);

const defaultHours = () => ({
  sunday: { status: "closed", open: "09:00", close: "17:00" },
  monday: { status: "open", open: "09:00", close: "17:00" },
  tuesday: { status: "open", open: "09:00", close: "17:00" },
  wednesday: { status: "open", open: "09:00", close: "17:00" },
  thursday: { status: "open", open: "09:00", close: "17:00" },
  friday: { status: "open", open: "09:00", close: "17:00" },
  saturday: { status: "closed", open: "09:00", close: "13:00" }
});

export default function PharmacyHoursConfig() {
  const [hours, setHours] = React.useState(defaultHours());
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const me = await User.me();
        const h = me?.hours_of_operation;
        if (h && typeof h === "object") {
          setHours(prev => ({ ...prev, ...h }));
        }
      } catch (_) {}
    })();
  }, []);

  const setDay = (key, data) => {
    setHours(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...data } }));
  };

  const onOpenChange = (key, val) => {
    if (val === "closed") {
      setDay(key, { status: "closed" });
    } else {
      setDay(key, { status: "open", open: val, close: hours[key]?.close || val });
    }
  };
  const onCloseChange = (key, val) => setDay(key, { close: val });

  const save = async () => {
    setSaving(true);
    await User.updateMyUserData({ hours_of_operation: hours });
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
    window.dispatchEvent(new CustomEvent("hoursUpdated", { detail: { hours } }));
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Operating Hours</CardTitle>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {savedAt ? <span>Saved {savedAt}</span> : null}
          <Button onClick={save} disabled={saving} className="h-8 px-3">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Header row: days */}
            <div className="grid grid-cols-8 text-xs font-semibold text-gray-700">
              <div className="py-2 px-2" />
              {days.map((d, i) => (
                <div key={d} className="py-2 px-2 text-center">{d}</div>
              ))}
            </div>

            {/* Open row */}
            <div className="grid grid-cols-8 items-center border-t text-sm">
              <div className="py-2 px-2 font-medium text-gray-700">Open</div>
              {keys.map((k, idx) => {
                const closed = (hours[k]?.status || "closed") === "closed";
                return (
                  <div key={k} className={`py-2 px-2 ${closed ? "bg-gray-50" : ""}`}>
                    <Select
                      value={closed ? "closed" : (hours[k]?.open || "")}
                      onValueChange={(v) => onOpenChange(k, v)}
                    >
                      <SelectTrigger className={`h-9 ${closed ? "opacity-70" : ""}`}>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="closed">Closed</SelectItem>
                        {TIME_OPTIONS.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            {/* Close row */}
            <div className="grid grid-cols-8 items-center border-t text-sm">
              <div className="py-2 px-2 font-medium text-gray-700">Close</div>
              {keys.map((k) => {
                const closed = (hours[k]?.status || "closed") === "closed";
                return (
                  <div key={k} className={`py-2 px-2 ${closed ? "bg-gray-50" : ""}`}>
                    <Select
                      value={hours[k]?.close || ""}
                      onValueChange={(v) => onCloseChange(k, v)}
                      disabled={closed}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={closed ? "Closed" : "Select time"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {TIME_OPTIONS.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}