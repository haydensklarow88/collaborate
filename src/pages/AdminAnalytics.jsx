import React from "react";
import { PharmacyStats } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminAnalytics() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);

  React.useEffect(() => {
    const run = async () => {
      try {
        const list = await PharmacyStats.filter({}, "-accuracy_score", 200);
        setRows(list);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading analytics...
    </div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Pharmacy Ranking
          </CardTitle>
          <CardDescription>Accuracy is fulfilled_count / yes_responses.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-gray-600">No analytics yet.</div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{r.pharmacy_name || r.pharmacy_email}</div>
                    <div className="text-xs text-gray-600">
                      Yes: {r.yes_responses || 0} • Accepted: {r.accepted_responses || 0} • Ready: {r.ready_count || 0} • Fulfilled: {r.fulfilled_count || 0}
                    </div>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-800">
                    {(Number(r.accuracy_score || 0) * 100).toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}