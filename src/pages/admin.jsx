
import React from 'react';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';
import { User } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';

export default function AdminRedirect() {
  const { toast } = useToast();

  React.useEffect(() => {
    const run = async () => {
      try {
        const me = await User.me();
        if (me?.user_role === 'admin') {
          const nav = window.__RTX_NAVIGATE__;
          if (typeof nav === 'function') nav('AdminSettings'); else window.location.href = createPageUrl('AdminSettings');
          return;
        }
      } catch (error) {
        // Not authenticated or an error occurred during fetching user data
        console.error("Failed to fetch user data or user not authenticated:", error);
      }
  toast({ title: "You don’t have access to that area.", variant: "destructive" });
  const nav = window.__RTX_NAVIGATE__;
  if (typeof nav === 'function') nav('signin'); else window.location.href = createPageUrl('signin');
    };
    run();
  }, [toast]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Checking access...
    </div>
  );
}
