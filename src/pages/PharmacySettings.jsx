import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { User } from "@/api/entities";

export default function PharmacySettings() {
  const [me, setMe] = React.useState(null);
  const [couponUrl, setCouponUrl] = React.useState("");
  const [discountInfo, setDiscountInfo] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState("");

  React.useEffect(() => {
    (async () => {
      const u = await User.me().catch(() => null);
      setMe(u);
      setCouponUrl(u?.pharmacy_coupon_url || "");
      setDiscountInfo(u?.pharmacy_discount_info || "");
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    await User.updateMyUserData({
      pharmacy_coupon_url: couponUrl || "",
      pharmacy_discount_info: discountInfo || ""
    });
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Pharmacy Settings</CardTitle>
          <CardDescription>Customize the patient-facing coupon link and discount info shown after your pharmacy is selected.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Coupon page URL</label>
            <Input
              placeholder="https://yourpharmacy.example/coupons"
              value={couponUrl}
              onChange={(e) => setCouponUrl(e.target.value)}
              inputMode="url"
            />
            <p className="text-xs text-gray-500">Public link to your pharmacy’s coupon or discount page.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Discount info (short blurb)</label>
            <Textarea
              placeholder="e.g., 10% off generics with our savings card. Prices vary. See website for details."
              value={discountInfo}
              onChange={(e) => setDiscountInfo(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-gray-500">Displayed on the patient link after your pharmacy is chosen.</p>
          </div>

          <div className="flex items-center justify-end gap-3">
            {savedAt ? <span className="text-xs text-gray-500">Saved {savedAt}</span> : null}
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}