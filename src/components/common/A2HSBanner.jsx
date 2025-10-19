import React from "react";
import { Button } from "@/components/ui/button";
import { X, Smartphone, Share, MoreVertical } from "lucide-react";

function isStandalone() {
  if (window.navigator.standalone) return true;
  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
  return false;
}
function isMobile() {
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod|Android/i.test(ua);
}

export default function A2HSBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const dismissed = localStorage.getItem("a2hsPromptDismissed") === "1";
    if (!dismissed && isMobile() && !isStandalone()) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem("a2hsPromptDismissed", "1");
    setVisible(false);
  };

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || "");

  return (
    <div className="bg-indigo-50 border-y border-indigo-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-indigo-900 text-xs sm:text-sm">
          <Smartphone className="w-4 h-4 flex-shrink-0" />
          {isIOS ? (
            <span className="flex items-center gap-1">
              Add to Home: tap Share <Share className="w-3.5 h-3.5 inline" /> then “Add to Home Screen”.
            </span>
          ) : (
            <span className="flex items-center gap-1">
              Add to Home: tap menu <MoreVertical className="w-3.5 h-3.5 inline" /> then “Add to Home screen”.
            </span>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={dismiss} className="h-6 w-6 text-indigo-900">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}