import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import * as Entities from "@/api/entities";

const ENTITY_NAMES = [
  "Medication", "Pharmacy", "ChatMessage", "Thread", "Message",
  "Notification", "AppSettings", "MedicationRequest", "Practice",
  "PharmacyStats", "User"
];

const SAFE_STRING_FIELDS = new Set([
  // whitelisted non-PHI string fields commonly used
  "name","brand_name","generic_name","dosage","form","ndc","manufacturer",
  "chain","address","city","state","zip","phone","pharmacist_on_duty","npi",
  "prescriber_email","rxcui","reference_number","status","pharmacy_email",
  "pharmacy_name","author","author_name","title","recipient_role","user_email",
  "helpdesk_phone_number","prescriber_practice_name","initiated_by","owner_email",
  "practice_name","specialty","user_role","admin_editable_name","delegated_by",
  "hours_of_operation","point_of_contact","auth_id","pharmacy_id","practice_id",
  "wickr_id"
]);

export default function SecurityCheck() {
  const [report, setReport] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      const findings = [];
      for (const eName of ENTITY_NAMES) {
        try {
          const ent = Entities[eName];
          if (!ent || typeof ent.schema !== "function") continue;
          const schema = await ent.schema();
          const risky = [];

          const props = schema?.properties || {};
          Object.entries(props).forEach(([key, def]) => {
            if (def?.type === "string" && !SAFE_STRING_FIELDS.has(key)) {
              risky.push({ field: key, description: def.description || "" });
            }
            if (def?.type === "array" && def?.items?.type === "string" && !SAFE_STRING_FIELDS.has(key)) {
              risky.push({ field: key, description: def.description || "" });
            }
          });

          if (risky.length > 0) {
            findings.push({ entity: eName, risky });
          }
        } catch (_) {
          // ignore
        }
      }
      setReport(findings);
    })();
  }, []);

  const hasIssues = report.length > 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${hasIssues ? "text-amber-600" : "text-emerald-600"}`} />
            <CardTitle>Security Check (PHI Risk Scan)</CardTitle>
          </div>
          <CardDescription>
            Automatically scans entity schemas for potentially risky free-text string fields.
            Only trusted, structured fields should exist. This tool is advisory and cannot guarantee compliance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasIssues ? (
            <div className="text-sm text-emerald-700">No risky string fields detected in known entities.</div>
          ) : (
            <div className="space-y-4">
              {report.map(item => (
                <div key={item.entity} className="border rounded-md p-3 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{item.entity}</Badge>
                    <span className="text-sm text-amber-700">{item.risky.length} potential risk{item.risky.length > 1 ? "s" : ""}</span>
                  </div>
                  <ul className="list-disc pl-6 text-sm text-gray-700">
                    {item.risky.map((r, idx) => (
                      <li key={idx}>
                        <span className="font-medium">{r.field}</span>
                        {r.description ? <span className="text-gray-500"> — {r.description}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 text-xs text-gray-500">
            Reminder: This platform is only for general medication inventory and pharmacy lookup. Never use for patient-specific data or PHI.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}