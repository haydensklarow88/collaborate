import React from "react";
import { useAuth } from "react-oidc-context";
import { saveRoleAndProceed } from "./RoleSelectionLogic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, UserPlus, Building2 } from "lucide-react";

function Option({ icon: Icon, title, desc, onClick }) {
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
        <Button onClick={onClick} className="w-full">Continue</Button>
      </CardContent>
    </Card>
  );
}

export default function RoleSelection() {
  const [saving, setSaving] = React.useState(false);
  const auth = useAuth();

  // OIDC: skip local user fetch, assume user is authenticated and needs to select role

  const handleSelect = async (role) => {
    if (saving) return;
    setSaving(true);
    try {
      await saveRoleAndProceed(auth, role);
    } catch (e) {
      // If update fails, fallback to dashboard
    } finally {
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
          />
          <Option
            icon={UserPlus}
            title="Prescriber Staff"
            desc="For team members assisting prescribers"
            onClick={() => handleSelect("prescriber_staff")}
          />
          <Option
            icon={Building2}
            title="Pharmacy Staff"
            desc="For pharmacy users responding to requests"
            onClick={() => handleSelect("pharmacy_staff")}
          />
        </div>

        {saving && (
          <div className="flex items-center justify-center text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving your choice…
          </div>
        )}
      </div>
    </div>
  );
}