import React from 'react';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';

export default function PharmacyAccess() {
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    const run = async () => {
      try {
        const me = await User.me();
        const updates = {};
        if (!me.pharmacy_name) updates.pharmacy_name = 'Stone Ridge Pharmacy';
        if (me.user_role !== 'pharmacy_staff') updates.user_role = 'pharmacy_staff';
        if (Object.keys(updates).length > 0) {
          await User.updateMyUserData(updates);
        }
        window.location.href = createPageUrl('PharmacyInterface');
      } catch {
        // not authenticated yet, show Continue button
      } finally {
        setChecking(false);
      }
    };
    run();
  }, []);

  const handleContinue = async () => {
    const callbackUrl = window.location.origin + createPageUrl('PharmacyAccess');
    await User.loginWithRedirect(callbackUrl);
  };

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Pharmacy Portal Access</CardTitle>
          <CardDescription>Continue to authenticate and open the Pharmacy Portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleContinue} className="w-full">
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-gray-500">
            You’ll be redirected back here after authentication and then sent to the Pharmacy Portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}