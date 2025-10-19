import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Plus, X } from "lucide-react";
import { User } from "@/api/entities";
import { manageStaff } from "@/api/functions";

export default function TeamAccess() {
  const [me, setMe] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [staff, setStaff] = React.useState([]);
  const [practice, setPractice] = React.useState(null);
  const [email, setEmail] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  React.useEffect(() => {
    const init = async () => {
      try {
        const u = await User.me();
        setMe(u);
        if (u.user_role !== "prescriber" && u.user_role !== "admin") {
          setLoading(false);
          return;
        }
        const { data } = await manageStaff({ action: "list" });
        setStaff(data.staff || []);
        setPractice(data.practice || null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const refresh = async () => {
    const { data } = await manageStaff({ action: "list" });
    setStaff(data.staff || []);
    setPractice(data.practice || null);
  };

  const onAdd = async () => {
    if (!email.trim()) return;
    setAdding(true);
    try {
      await manageStaff({ action: "add", email: email.trim() });
      setEmail("");
      await refresh();
    } finally {
      setAdding(false);
    }
  };

  const onRemove = async (e) => {
    setRemoving(true);
    try {
      await manageStaff({ action: "remove", email: e });
      await refresh();
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh] text-gray-700">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading team...
      </div>
    );
  }

  if (!me || (me.user_role !== "prescriber" && me.user_role !== "admin")) {
    return (
      <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Team Access</CardTitle>
            <CardDescription>Only prescribers or admins can manage staff.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Please log in as a prescriber to view and manage staff access.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remaining = Math.max(0, 5 - staff.length);

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle>Team Access</CardTitle>
              <CardDescription>
                Add up to 5 staff by email. They’ll use your practice info (no PHI).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {practice && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="font-medium">Practice:</span>
              <Badge variant="outline">{practice.name}</Badge>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="staff@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              inputMode="email"
            />
            <Button onClick={onAdd} disabled={!email.trim() || adding || remaining <= 0} className="gap-2">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Staff
            </Button>
          </div>
          <p className="text-xs text-gray-500">Remaining slots: {remaining}</p>

          <div className="space-y-2">
            {staff.length === 0 ? (
              <div className="text-sm text-gray-600">No staff yet.</div>
            ) : (
              staff.map((s) => (
                <div key={s.id} className="flex items-center justify-between border rounded-md p-2 bg-white">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.email}</p>
                    {s.full_name ? <p className="text-xs text-gray-500 truncate">{s.full_name}</p> : null}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemove(s.email)}
                    disabled={removing}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" /> Remove
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="text-xs text-gray-500">
            Staff access is limited to non-PHI workflows (requests and messaging snapshots).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}