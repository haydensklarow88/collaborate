import React from "react";
import { User } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

export default function AdminNPIVerification() {
  const [me, setMe] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const run = async () => {
      try {
        const u = await User.me();
        setMe(u);
        if (u?.user_role === "admin") {
          const list = await User.filter({ npi_status: "pending" }, "-created_date", 200);
          setItems(list);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const verify = async (u, role) => {
    const updated = await User.update(u.id, { npi_status: "verified", user_role: role || u.user_role || "prescriber" });
    setItems(prev => prev.filter(x => x.id !== u.id));
  };

  const reject = async (u) => {
    const updated = await User.update(u.id, { npi_status: "rejected" });
    setItems(prev => prev.filter(x => x.id !== u.id));
  };

  const filtered = items.filter(u => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (u.email || "").toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q) || (u.practice_name || "").toLowerCase().includes(q) || (u.pharmacy_name || "").toLowerCase().includes(q);
  });

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading pending NPIs...
    </div>;
  }

  if (!me || me.user_role !== "admin") {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>NPI Verification</CardTitle>
            <CardDescription>Admins only.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <CardTitle>NPI Verification</CardTitle>
              <CardDescription>Approve or reject users awaiting verification.</CardDescription>
            </div>
          </div>
          <Input
            placeholder="Search by email or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-80"
          />
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-600 py-10 text-center">No pending users.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((u) => (
                <div key={u.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.full_name || u.admin_editable_name || "Unnamed"}</p>
                      <p className="text-xs text-gray-600 truncate">{u.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{u.user_role || "prescriber"}</Badge>
                        <Badge className="bg-amber-500 text-white">pending</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Select defaultValue={u.user_role || "prescriber"} onValueChange={(r) => { u.__selectedRole = r; }}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prescriber">Prescriber</SelectItem>
                          <SelectItem value="pharmacy_staff">Pharmacy</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="w-full" onClick={() => verify(u, u.__selectedRole)}><ShieldCheck className="w-4 h-4 mr-1" /> Verify</Button>
                      <Button size="sm" variant="destructive" className="w-full" onClick={() => reject(u)}><ShieldAlert className="w-4 h-4 mr-1" /> Reject</Button>
                    </div>
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