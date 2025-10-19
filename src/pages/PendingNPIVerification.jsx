import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function PendingNPIVerification() {
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Verification in Progress</CardTitle>
          <CardDescription>Your NPI has been submitted and is awaiting verification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-700">
            We’re verifying your credentials. This may be handled by an administrator or an NPI verification service.
            You’ll be notified once access is granted.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => { const navigate = window.__RTX_NAVIGATE__; if (typeof navigate === 'function') navigate(createPageUrl('Home')); else window.location.href = createPageUrl('Home'); }}>
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}