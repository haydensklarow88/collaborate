
import React from "react";
import { User } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Settings, Search, KeyRound } from "lucide-react";
import { UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations";
import { base44 } from "@/api/base44Client";

// Helper
async function sha256Hex(text) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Helper: prefer backend function; fallback to direct entity ops if function fails
async function createOrUpdateUserViaApiOrDirect(payload) {
  // 1) Try backend function first
  try {
    const { data } = await base44.functions.invoke("adminCreateUser", payload);
    if (data && data.user) return data.user;
    // if no user returned, throw to fallback
    throw new Error(data?.error || "Function returned no user");
  } catch (_) {
    // 2) Fallback: use direct entity operations (requires admin privileges)
    // Attempt to find existing user by email
    const existing = await User.filter({ email: payload.email }, undefined, 1).catch(() => []);
    if (existing && existing[0]) {
      // If found, update it
      return await User.update(existing[0].id, payload);
    }
    // If not found, create a new one
    return await User.create(payload);
  }
}

export default function AdminUsers() {
  const [me, setMe] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [current, setCurrent] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newUser, setNewUser] = React.useState({
    email: "",
    admin_editable_name: "",
    user_role: "prescriber",
    npi_status: "unverified",
    practice_name: "",
    pharmacy_name: "",
    phone: "",
    address: "",
    zip: "",
    point_of_contact: "",
    npi: "",
    status: "active", // New field
    auth_id: "",     // New field
    pharmacy_id: ""  // New field
  });
  const [importing, setImporting] = React.useState(false);
  const fileInputRef = React.useRef(null);
  const [pwdOpen, setPwdOpen] = React.useState(false);
  const [pwdUser, setPwdUser] = React.useState(null);
  const [tempPwd, setTempPwd] = React.useState("");
  const [ttlDays, setTtlDays] = React.useState(7);

  React.useEffect(() => {
    const run = async () => {
      try {
        const u = await User.me();
        setMe(u);
        if (u?.user_role === "admin") {
          const list = await User.list();
          setItems(list);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = items.filter(u => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.email || "").toLowerCase().includes(q) ||
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.admin_editable_name || "").toLowerCase().includes(q) ||
      (u.practice_name || "").toLowerCase().includes(q) ||
      (u.pharmacy_name || "").toLowerCase().includes(q)
    );
  });

  const startEdit = (u) => {
    setCurrent({
      id: u.id,
      email: u.email || "",
      admin_editable_name: u.admin_editable_name || "",
      user_role: u.user_role || "prescriber",
      npi_status: u.npi_status || "unverified",
      practice_name: u.practice_name || "",
      pharmacy_name: u.pharmacy_name || "",
      phone: u.phone || "",
      address: u.address || "",
      zip: u.zip || "",
      point_of_contact: u.point_of_contact || "",
      npi: u.npi || "",
      status: u.status || "active", // New field
      auth_id: u.auth_id || "",     // New field
      pharmacy_id: u.pharmacy_id || ""  // New field
    });
    setOpen(true);
  };

  const save = async () => {
    if (!current) return;
    setSaving(true);
    try {
      const { id, ...payload } = current;
      const updated = await User.update(id, payload);
      setItems(prev => prev.map(x => (x.id === id ? { ...x, ...updated } : x)));
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (id) => {
    if (!id) return;
    const ok = window.confirm("Are you sure you want to delete this user? This action cannot be undone.");
    if (!ok) return;
    try {
      await User.delete(id);
      setItems(prev => prev.filter(u => u.id !== id));
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user. Please try again.");
    }
  };

  const createUser = async () => {
    if (!newUser.email.trim()) {
      alert("Email is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        email: newUser.email.trim(),
        admin_editable_name: newUser.admin_editable_name || undefined,
        user_role: newUser.user_role || "prescriber",
        npi_status: newUser.npi_status || "unverified",
        practice_name: newUser.practice_name || undefined,
        pharmacy_name: newUser.pharmacy_name || undefined,
        phone: newUser.phone || undefined,
        address: newUser.address || undefined,
        zip: newUser.zip || undefined,
        point_of_contact: newUser.point_of_contact || undefined,
        npi: newUser.npi || undefined,
        status: newUser.status || "active", // New field
        auth_id: newUser.auth_id || undefined, // New field
        pharmacy_id: newUser.pharmacy_id || undefined // New field
      };

      // UPDATED: use function with graceful fallback to direct entity ops
      const created = await createOrUpdateUserViaApiOrDirect(payload);

      setItems(prev => [created, ...prev]);
      setCreateOpen(false);
      setNewUser({
        email: "",
        admin_editable_name: "",
        user_role: "prescriber",
        npi_status: "unverified",
        practice_name: "",
        pharmacy_name: "",
        phone: "",
        address: "",
        zip: "",
        point_of_contact: "",
        npi: "",
        status: "active", // New field
        auth_id: "",     // New field
        pharmacy_id: ""  // New field
      });
    } catch (e) {
      const server = e?.response?.data?.error;
      console.error("Failed to create user:", e);
      alert(server || e?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleClickImport = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { file_url } = await UploadFile({ file });
      const schema = {
        type: "object",
        properties: {
          email: { type: "string" },
          admin_editable_name: { type: "string" },
          user_role: { type: "string", enum: ["prescriber", "pharmacy_staff", "admin", "prescriber_staff"] },
          npi_status: { type: "string", enum: ["unverified", "pending", "verified", "rejected"] },
          practice_name: { type: "string" },
          pharmacy_name: { type: "string" },
          phone: { type: "string" },
          address: { type: "string" },
          zip: { type: "string" },
          point_of_contact: { type: "string" },
          npi: { type: "string" },
          status: { type: "string", enum: ["active", "invited", "suspended"] }, // New field
          auth_id: { type: "string" },     // New field
          pharmacy_id: { type: "string" }  // New field
        },
        required: ["email"]
      };
      const res = await ExtractDataFromUploadedFile({ file_url, json_schema: schema });
      if (res.status !== "success" || !res.output) {
        alert("Failed to parse CSV");
        return;
      }
      const rows = Array.isArray(res.output) ? res.output : [res.output];

      // UPDATED: sequential creation via function with fallback
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r?.email) continue;
        const payload = {
          email: String(r.email).trim(),
          admin_editable_name: r.admin_editable_name || undefined,
          user_role: ["prescriber", "pharmacy_staff", "admin", "prescriber_staff"].includes(r.user_role) ? r.user_role : "prescriber",
          npi_status: ["unverified", "pending", "verified", "rejected"].includes(r.npi_status) ? r.npi_status : "unverified",
          practice_name: r.practice_name || undefined,
          pharmacy_name: r.pharmacy_name || undefined,
          phone: r.phone || undefined,
          address: r.address || undefined,
          zip: r.zip || undefined,
          point_of_contact: r.point_of_contact || undefined,
          npi: r.npi || undefined,
          status: ["active", "invited", "suspended"].includes(r.status) ? r.status : "active", // New field
          auth_id: r.auth_id || undefined, // New field
          pharmacy_id: r.pharmacy_id || undefined // New field
        };
        try {
          await createOrUpdateUserViaApiOrDirect(payload);
        } catch (err) {
          console.warn("Import row failed:", err?.message || err);
        }
      }
      const refreshed = await User.list();
      setItems(refreshed);
      alert("Import completed");
    } catch (err) {
      console.error("Import failed:", err);
      alert("Import failed. Please check your CSV format.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openTempPwd = (u) => {
    setPwdUser(u);
    setTempPwd("");
    setTtlDays(7);
    setPwdOpen(true);
  };

  const saveTempPwd = async () => {
    if (!pwdUser || !tempPwd) {
      alert("Enter a temporary password.");
      return;
    }
    const hash = await sha256Hex(tempPwd);
    const expiresAt = new Date(Date.now() + Number(ttlDays || 0) * 24 * 60 * 60 * 1000).toISOString();
    try {
      const updated = await User.update(pwdUser.id, {
        temp_password_hash: hash,
        temp_password_expires: expiresAt,
        requires_password_reset: true
      });
      setItems(prev => prev.map(x => (x.id === pwdUser.id ? { ...x, ...updated } : x)));
      setPwdOpen(false);
    } catch (e) {
      console.error("Failed setting temp password:", e);
      alert("Failed to set temp password.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading users...
      </div>
    );
  }

  if (!me || me.user_role !== "admin") {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Admin Users</CardTitle>
            <CardDescription>Only admins can view and manage users.</CardDescription>
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
            <Settings className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle>Admin Users</CardTitle>
              <CardDescription>Manage roles and profile details for app users.</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto"> {/* UPDATED: allow wrapping */}
            <div className="relative flex-1 min-w-[160px]"> {/* UPDATED: flexible search width */}
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              {/* UPDATED: full width on mobile */}
              <Input
                className="pl-8 w-full sm:w-64"
                placeholder="Search by email, name, org..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => setInviteOpen(true)} className="w-full sm:w-auto">Invite User</Button> {/* UPDATED: wrap-friendly */}
            <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">Add User</Button> {/* UPDATED */}
            <Button variant="secondary" onClick={handleClickImport} disabled={importing} className="w-full sm:w-auto">
              {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Import CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((u) => (
              <div key={u.id} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3"> {/* UPDATED: wrap content */}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{u.admin_editable_name || u.full_name || "Unnamed"}</p>
                    <p className="text-xs text-gray-600 truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline">{u.user_role || "prescriber"}</Badge>
                      <Badge className={u.npi_status === "verified" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"}>
                        {u.npi_status || "unverified"}
                      </Badge>
                      {u.status && (
                        <Badge
                          className={
                            u.status === "active" ? "bg-blue-600 text-white" :
                            u.status === "invited" ? "bg-yellow-500 text-black" :
                            u.status === "suspended" ? "bg-red-600 text-white" :
                            "bg-gray-200 text-gray-700"
                          }
                        >
                          {u.status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-2 space-y-1">
                      {u.practice_name && <p>Practice: {u.practice_name}</p>}
                      {u.pharmacy_name && <p>Pharmacy: {u.pharmacy_name}</p>}
                      {(u.address || u.zip) && <p>{u.address} {u.zip ? `(${u.zip})` : ""}</p>}
                      {u.phone && <p>Phone: {u.phone}</p>}
                      {u.npi && <p>NPI: {u.npi}</p>}
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col flex-wrap gap-2 w-full sm:w-auto"> {/* UPDATED: responsive buttons layout */}
                    <Button variant="outline" size="sm" onClick={() => startEdit(u)} className="flex-1 sm:flex-none min-w-[120px]">
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openTempPwd(u)} className="gap-1 flex-1 sm:flex-none min-w-[150px]">
                      <KeyRound className="w-4 h-4" /> Temp Password
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => removeUser(u.id)} className="flex-1 sm:flex-none min-w-[120px]">
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-sm text-gray-600 py-8 text-center">
                No users match your search.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Temp Password Dialog */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Temporary Password</DialogTitle>
            <DialogDescription>Provide a temporary password the user will replace at first login.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">User</label>
              <Input value={pwdUser?.email || ""} disabled />
            </div>
            <div>
              <label className="text-sm text-gray-600">Temporary Password</label>
              <Input value={tempPwd} onChange={(e) => setTempPwd(e.target.value)} placeholder="e.g., Spring#2025!" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Expires (days)</label>
              <Input type="number" min="1" step="1" value={String(ttlDays)} onChange={(e) => setTtlDays(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setPwdOpen(false)}>Cancel</Button>
            <Button onClick={saveTempPwd}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {current && (
            <div
              className="space-y-3 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <Input value={current.email} disabled />
              </div>
              <div>
                <label className="text-sm text-gray-600">Display Name</label>
                <Input
                  value={current.admin_editable_name}
                  onChange={(e) => setCurrent({ ...current, admin_editable_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Role</label>
                  <Select
                    value={current.user_role}
                    onValueChange={(v) => setCurrent({ ...current, user_role: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="prescriber">Prescriber</SelectItem>
                      <SelectItem value="pharmacy_staff">Pharmacy</SelectItem>
                      <SelectItem value="prescriber_staff">Prescriber Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">NPI Status</label>
                  <Select
                    value={current.npi_status}
                    onValueChange={(v) => setCurrent({ ...current, npi_status: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="NPI status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unverified">Unverified</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Practice Name</label>
                  <Input
                    value={current.practice_name}
                    onChange={(e) => setCurrent({ ...current, practice_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Pharmacy Name</label>
                  <Input
                    value={current.pharmacy_name}
                    onChange={(e) => setCurrent({ ...current, pharmacy_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Phone</label>
                  <Input
                    value={current.phone}
                    onChange={(e) => setCurrent({ ...current, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">ZIP</label>
                  <Input
                    value={current.zip}
                    onChange={(e) => setCurrent({ ...current, zip: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Address</label>
                <Input
                  value={current.address}
                  onChange={(e) => setCurrent({ ...current, address: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Point of Contact</label>
                <Input
                  value={current.point_of_contact}
                  onChange={(e) => setCurrent({ ...current, point_of_contact: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">NPI</label>
                <Input
                  value={current.npi || ""}
                  onChange={(e) => setCurrent({ ...current, npi: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Status</label>
                  <Select
                    value={current.status || "active"}
                    onValueChange={(v) => setCurrent({ ...current, status: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="invited">Invited</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Auth ID</label>
                  <Input
                    value={current.auth_id || ""}
                    onChange={(e) => setCurrent({ ...current, auth_id: e.target.value })}
                    placeholder="External auth provider ID (optional)"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Pharmacy ID</label>
                <Input
                  value={current.pharmacy_id || ""}
                  onChange={(e) => setCurrent({ ...current, pharmacy_id: e.target.value })}
                  placeholder="Link to Pharmacy.id (optional)"
                />
              </div>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <div
            className="space-y-3 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <Input
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Display Name</label>
              <Input
                value={newUser.admin_editable_name}
                onChange={(e) => setNewUser({ ...newUser, admin_editable_name: e.target.value })}
                placeholder="Shown name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Role</label>
                <Select
                  value={newUser.user_role}
                  onValueChange={(v) => setNewUser({ ...newUser, user_role: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="prescriber">Prescriber</SelectItem>
                    <SelectItem value="pharmacy_staff">Pharmacy</SelectItem>
                    <SelectItem value="prescriber_staff">Prescriber Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600">NPI Status</label>
                <Select
                  value={newUser.npi_status}
                  onValueChange={(v) => setNewUser({ ...newUser, npi_status: v })}
                >
                  <SelectTrigger><SelectValue placeholder="NPI status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unverified">Unverified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Practice Name</label>
                <Input
                  value={newUser.practice_name}
                  onChange={(e) => setNewUser({ ...newUser, practice_name: e.target.value })}
                  placeholder="If prescriber"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Pharmacy Name</label>
                <Input
                  value={newUser.pharmacy_name}
                  onChange={(e) => setNewUser({ ...newUser, pharmacy_name: e.target.value })}
                  placeholder="If pharmacy"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <Input
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">ZIP</label>
                <Input
                  value={newUser.zip}
                  onChange={(e) => setNewUser({ ...newUser, zip: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Address</label>
              <Input
                value={newUser.address}
                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Point of Contact</label>
              <Input
                value={newUser.point_of_contact}
                onChange={(e) => setNewUser({ ...newUser, point_of_contact: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">NPI</label>
              <Input
                value={newUser.npi}
                onChange={(e) => setNewUser({ ...newUser, npi: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Status</label>
                <Select
                  value={newUser.status}
                  onValueChange={(v) => setNewUser({ ...newUser, status: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Auth ID</label>
                <Input
                  value={newUser.auth_id}
                  onChange={(e) => setNewUser({ ...newUser, auth_id: e.target.value })}
                  placeholder="External auth provider ID (optional)"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Pharmacy ID</label>
              <Input
                value={newUser.pharmacy_id}
                onChange={(e) => setNewUser({ ...newUser, pharmacy_id: e.target.value })}
                placeholder="Link to Pharmacy.id (optional)"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createUser} disabled={saving || !newUser.email.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a User</DialogTitle>
            <DialogDescription>How to add new users</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-700">
            <p>To add a new user via the platform invite flow:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Go to your Base44 dashboard.</li>
              <li>Open the app’s Users section.</li>
              <li>Click Invite User and enter their email.</li>
            </ol>
            <p className="text-gray-500">Alternatively, use the Add User button above to pre-provision a user record, or Import CSV for bulk provisioning.</p>
          </div>
          <DialogFooter className="pt-4">
            <Button onClick={() => setInviteOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
