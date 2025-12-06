import { useEffect, useState } from "react";
import { useTranslation } from "next-i18next";
import { Card, CardHeader } from "../ui/Card";
import { Input, Textarea, Select } from "../ui/Input";
import { Button } from "../ui";
import api from "../../lib/apiClient";

type Props = {
  shopId: string;
  onSaved?: () => void;
  initial?: any;
};

export default function ShippingProfileForm({ shopId, onSaved, initial }: Props) {
  const { t } = useTranslation("common");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(
    initial || {
      shopId,
      label: "",
      contactName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "JP",
      amazonAddressLabel: "",
      instructions: "",
      isDefault: false,
      isActive: true
    }
  );

  useEffect(() => {
    if (shopId && !form.shopId) setForm((s: any) => ({ ...s, shopId }));
  }, [shopId]);

  const handleChange = (field: string, value: any) => setForm((s: any) => ({ ...s, [field]: value }));

  const handleSave = async () => {
    if (!shopId) return;
    setSaving(true);
    try {
      if (initial && initial.id) {
        await api.put(`/shipping-profiles/${initial.id}`, form);
      } else {
        await api.post("/shipping-profiles", form);
      }
      if (onSaved) onSaved();
    } catch (err: any) {
      // simple toast fallback
      alert(err?.response?.data?.error || err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title={t("shippingProfileFormTitle") || "Shipping profile"} icon="🏷️" />
      <div className="stack-md">
        <Input label={t("label") || "Label"} value={form.label} onChange={(e) => handleChange("label", e.target.value)} />
        <Input label={t("contactName") || "Contact name"} value={form.contactName} onChange={(e) => handleChange("contactName", e.target.value)} />
        <Input label={t("phone") || "Phone"} value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
        <Input label={t("addressLine1") || "Address line 1"} value={form.addressLine1} onChange={(e) => handleChange("addressLine1", e.target.value)} />
        <Input label={t("addressLine2") || "Address line 2"} value={form.addressLine2} onChange={(e) => handleChange("addressLine2", e.target.value)} />
        <div className="grid grid-3" style={{ gap: 12 }}>
          <Input label={t("city") || "City"} value={form.city} onChange={(e) => handleChange("city", e.target.value)} />
          <Input label={t("stateProvince") || "State"} value={form.state} onChange={(e) => handleChange("state", e.target.value)} />
          <Input label={t("postalCode") || "Postal code"} value={form.postalCode} onChange={(e) => handleChange("postalCode", e.target.value)} />
        </div>
        <Input label={t("amazonAddressLabel") || "Amazon address label"} value={form.amazonAddressLabel} onChange={(e) => handleChange("amazonAddressLabel", e.target.value)} />
        <Textarea label={t("instructionsOptional") || "Instructions (optional)"} value={form.instructions} onChange={(e) => handleChange("instructions", e.target.value)} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={() => setForm(initial || { ...form, label: "" })}>Reset</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : t("save") || "Save"}</Button>
        </div>
      </div>
    </Card>
  );
}
