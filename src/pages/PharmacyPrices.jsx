import React from "react";
import { PharmacyMedicationPrice } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

export default function PharmacyPrices() {
  const [me, setMe] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    medication_key: "",
    medication_name: "",
    dosage: "",
    form: "",
    ndc: "",
    cash_price: ""
  });

  React.useEffect(() => {
    (async () => {
      try {
        const u = await User.me();
        setMe(u || null);
        if (u?.email) {
          const list = await PharmacyMedicationPrice.filter({ pharmacy_email: u.email }, "-updated_date", 200);
          setItems(Array.isArray(list) ? list : []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resetForm = () => setForm({
    medication_key: "",
    medication_name: "",
    dosage: "",
    form: "",
    ndc: "",
    cash_price: ""
  });

  const addPrice = async () => {
    if (!me?.email) return;
    if (!form.medication_key.trim() || !String(form.cash_price).trim()) return;
    setSaving(true);
    const payload = {
      pharmacy_email: me.email,
      medication_key: form.medication_key.trim(),
      medication_name: form.medication_name || form.medication_key.trim(),
      dosage: form.dosage || undefined,
      form: form.form || undefined,
      ndc: form.ndc || undefined,
      cash_price: Number(form.cash_price)
    };
    const created = await PharmacyMedicationPrice.create(payload);
    setItems(prev => [created, ...prev]);
    resetForm();
    setSaving(false);
  };

  const updateItem = async (id, patch) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x));
    await PharmacyMedicationPrice.update(id, patch);
  };

  const removeItem = async (id) => {
    setItems(prev => prev.filter(x => x.id !== id));
    await PharmacyMedicationPrice.delete(id);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!me?.email) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>My Prices</CardTitle>
            <CardDescription>Sign in to manage your pharmacy&apos;s price presets.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>My Prices</CardTitle>
            <CardDescription>Preset cash prices per medication for quick quoting.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <Input
              placeholder="Medication key (RxCUI or name)"
              value={form.medication_key}
              onChange={(e) => setForm({ ...form, medication_key: e.target.value })}
              className="md:col-span-2"
            />
            <Input
              placeholder="Display name (optional)"
              value={form.medication_name}
              onChange={(e) => setForm({ ...form, medication_name: e.target.value })}
            />
            <Input
              placeholder="Dosage (e.g., 10mg)"
              value={form.dosage}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })}
            />
            <Input
              placeholder="Form (e.g., tablet)"
              value={form.form}
              onChange={(e) => setForm({ ...form, form: e.target.value })}
            />
            <Input
              placeholder="NDC (optional)"
              value={form.ndc}
              onChange={(e) => setForm({ ...form, ndc: e.target.value })}
            />
            <Input
              placeholder="Price"
              inputMode="decimal"
              value={form.cash_price}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, '').slice(0, 8);
                setForm({ ...form, cash_price: v });
              }}
            />
            <div className="flex items-center">
              <Button onClick={addPrice} disabled={saving || !form.medication_key || !form.cash_price} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-sm text-gray-600">No presets yet. Add your most common medications and prices above.</div>
            ) : items.map(row => (
              <div key={row.id} className="rounded-md border bg-white p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">{row.medication_name || row.medication_key}</div>
                  <div className="text-xs text-gray-600 truncate">
                    Key: {row.medication_key}
                    {row.dosage ? ` • ${row.dosage}` : ""}
                    {row.form ? ` • ${row.form}` : ""}
                    {row.ndc ? ` • NDC: ${row.ndc}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-28 h-8"
                    inputMode="decimal"
                    value={String(row.cash_price ?? "")}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, '').slice(0, 8);
                      updateItem(row.id, { cash_price: v ? Number(v) : null });
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => removeItem(row.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}