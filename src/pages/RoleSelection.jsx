import React from "react";
import { useAuth } from "react-oidc-context";
import { saveRoleAndProceed } from "./RoleSelectionLogic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, UserPlus, Building2 } from "lucide-react";

function Option({ icon: Icon, title, desc, onClick, disabled }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="p-2 rounded-md bg-blue-50 text-blue-700">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button onClick={onClick} className="w-full" disabled={disabled}>Continue</Button>
      </CardContent>
    </Card>
  );
}

export default function RoleSelection() {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const auth = useAuth();

  // OIDC: skip local user fetch, assume user is authenticated and needs to select role

  const handleSelect = (role) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      saveRoleAndProceed(auth, role);
      // Navigation happens immediately via window.location.href, so no need to wait
    } catch (e) {
      console.error("Failed to save role:", e);
      setError("Failed to save your selection. Please try again.");
      setSaving(false);
    }
  };

  // OIDC: always show role selection UI

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Choose your role</h1>
          <p className="text-gray-600 mt-1">Select how you’ll use RealTimeRx. You can update this later in your profile.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Option
            icon={Stethoscope}
            title="Prescriber"
            desc="For clinicians initiating requests"
            onClick={() => handleSelect("prescriber")}
            disabled={saving}
          />
          <Option
            icon={UserPlus}
            title="Prescriber Staff"
            desc="For team members assisting prescribers"
            onClick={() => handleSelect("prescriber_staff")}
            disabled={saving}
          />
          <Option
            icon={Building2}
            title="Pharmacy Staff"
            desc="For pharmacy users responding to requests"
            onClick={() => handleSelect("pharmacy_staff")}
            disabled={saving}
          />
        </div>

        {saving && (
          <div className="flex items-center justify-center text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving your choice…
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}