import React from "react";
import { MedicationRequest } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, ListChecks } from "lucide-react";
import { formatESTDate } from "@/components/utils/datetime";

const StatusBadge = ({ status }) => {
  const map = {
    pending: "bg-amber-100 text-amber-800",
    has_in_stock: "bg-emerald-100 text-emerald-800",
    no_stock: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
};

export default function AdminMedicationRequests() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [status, setStatus] = React.useState("all");
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    const run = async () => {
      try {
        const list = await MedicationRequest.filter({}, "-created_date", 200);
        setItems(list);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = items.filter((r) => {
    const statusOk = status === "all" || r.status === status;
    const query = q.trim().toLowerCase();
    const text = `${r.medication_name || ""} ${r.prescriber_email || ""}`.toLowerCase();
    return statusOk && (query ? text.includes(query) : true);
  });

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading requests...
    </div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <Card className="max-w-7xl mx-auto">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle>Medication Requests</CardTitle>
              <CardDescription>Non-PHI overview of broadcast requests and statuses.</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="has_in_stock">Has In Stock</SelectItem>
                <SelectItem value="no_stock">No Stock</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Search med or prescriber email…" value={q} onChange={(e)=>setQ(e.target.value)} className="w-64" />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-600 py-10 text-center">No requests found.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{r.medication_name}</p>
                    <p className="text-xs text-gray-500">Prescriber: {r.prescriber_email || "—"}</p>
                    <p className="text-xs text-gray-400">Created: {formatESTDate(r.created_date)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={r.status} />
                    <Badge variant="outline">{r.radius || 0} mi</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}