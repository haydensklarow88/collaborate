
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';

export default function PrescriberAccess() {
  const [checking, setChecking] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    const run = async () => {
      try {
        const me = await User.me();
        const updates = {};
        if (!me.practice_name) updates.practice_name = 'Medical Office';
        if (me.user_role !== 'prescriber') updates.user_role = 'prescriber';
        if (Object.keys(updates).length > 0) {
          await User.updateMyUserData(updates);
        }
        // Redirect to PrescriberTool instead of EpicSandbox
        navigate(createPageUrl('PrescriberTool'));
      } catch {
        // not authenticated yet, show Continue button
      } finally {
        setChecking(false);
      }
    };
    run();
  }, []);

  const handleContinue = async () => {
  const callbackUrl = window.location.origin + createPageUrl('PrescriberAccess');
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
          <CardTitle>Prescriber Portal Access</CardTitle>
          <CardDescription>Continue to authenticate and open the Prescriber Tool.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleContinue} className="w-full">
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-gray-500">
            You’ll be redirected back here after authentication and then sent to the Prescriber Tool.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
