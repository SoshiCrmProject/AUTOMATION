import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import api from "../../lib/apiClient";
import { useTranslation } from "next-i18next";
import { Input, Textarea, Select } from "../ui/Input";
import { Button, Badge } from "../ui";
import { Card, CardHeader } from "../ui/Card";

export type ManualOrderInput = {
  shopId?: string;
  productUrl: string;
  asin?: string;
  quantity: number;
  notes?: string;
  buyerName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  shippingAddressLabel?: string;
  shippingProfileId?: string;
  purchasePrice?: number;
};

type ShopOption = {
  id: string;
  name: string;
};

type ManualOrderFormProps = {
  shops: ShopOption[];
  isSubmitting: boolean;
  onSubmit: (payload: ManualOrderInput) => Promise<void>;
};

type FormErrors = Partial<Record<keyof ManualOrderInput, string>>;

const requiredFields: Array<keyof ManualOrderInput> = [
  "productUrl",
  "buyerName",
  "phone",
  "addressLine1",
  "city",
  "postalCode"
];

export default function ManualOrderForm({ shops, isSubmitting, onSubmit }: ManualOrderFormProps) {
  const { t } = useTranslation("common");
  const [shippingTouched, setShippingTouched] = useState(false);
  const [form, setForm] = useState<ManualOrderInput>({
    shopId: undefined,
    productUrl: "",
    asin: "",
    quantity: 1,
    notes: "",
    buyerName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "JP",
    shippingAddressLabel: "",
    shippingProfileId: undefined,
    purchasePrice: undefined
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const shopOptions = useMemo(() => {
    return shops.map((shop) => ({ value: shop.id, label: shop.name }));
  }, [shops]);

  const { data: shippingProfiles } = useSWR(() => (form.shopId ? `/shipping-profiles` : null), (url: string) => api.get(url).then((r) => r.data));

  useEffect(() => {
    if (!form.shopId && shops.length > 0) {
      setForm((prev) => ({ ...prev, shopId: shops[0].id }));
    }
  }, [shops, form.shopId]);

  useEffect(() => {
    if (!shippingTouched && form.buyerName) {
      setForm((prev) => ({ ...prev, shippingAddressLabel: prev.buyerName }));
    }
  }, [form.buyerName, shippingTouched]);

  useEffect(() => {
    // if shippingProfiles are available and one is default, preselect it for the same shop
    if (form.shopId && Array.isArray(shippingProfiles) && shippingProfiles.length) {
      const candidate = shippingProfiles.find((p: any) => p.isDefault && p.shopId === form.shopId);
      if (candidate && !form.shippingAddressLabel) {
        setForm((prev) => ({ ...prev, shippingProfileId: candidate.id, shippingAddressLabel: prev.shippingAddressLabel || candidate.amazonAddressLabel }));
      }
    }
  }, [shippingProfiles, form.shopId]);

  const handleChange = <K extends keyof ManualOrderInput>(field: K, value: ManualOrderInput[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    requiredFields.forEach((field) => {
      if (!String(form[field] ?? "").trim()) {
        nextErrors[field] = t("fieldRequired") || "Required";
      }
    });
    if (!form.shippingAddressLabel?.trim()) {
      nextErrors.shippingAddressLabel = t("fieldRequired") || "Required";
    }
    if (form.productUrl && !/^https?:\/\//i.test(form.productUrl)) {
      nextErrors.productUrl = t("invalidUrl") || "Invalid URL";
    }
    if (form.quantity < 1 || form.quantity > 10) {
      nextErrors.quantity = t("quantityRangeError") || "Quantity must be between 1 and 10";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    const payload: ManualOrderInput = {
      ...form,
      productUrl: form.productUrl.trim(),
      asin: form.asin?.trim() ? form.asin.trim().toUpperCase() : undefined,
      notes: form.notes?.trim() || undefined,
      addressLine2: form.addressLine2?.trim() || undefined,
      state: form.state?.trim() || undefined,
      shippingAddressLabel: form.shippingAddressLabel?.trim() || form.buyerName,
      country: form.country?.trim().toUpperCase() || "JP",
      shippingProfileId: form.shippingProfileId || undefined,
      purchasePrice:
        typeof form.purchasePrice === "number" && !Number.isNaN(form.purchasePrice)
          ? Number(form.purchasePrice)
          : undefined
    };
    await onSubmit(payload);
    setForm((prev) => ({
      ...prev,
      productUrl: "",
      asin: "",
      quantity: 1,
      notes: "",
      buyerName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "JP",
      shippingAddressLabel: "",
      shippingProfileId: undefined,
      purchasePrice: undefined
    }));
    setShippingTouched(false);
    setErrors({});
  };

  return (
    <Card>
      <CardHeader
        title={t("manualOrderFormTitle") || "Create manual Amazon order"}
        subtitle={t("manualOrderFormSubtitle") || "Submit addresses that should be purchased immediately via Amazon"}
        icon="📝"
      />
      <form onSubmit={handleSubmit} className="stack-lg">
        <div className="grid grid-2" style={{ gap: 16 }}>
          <Select
            label={t("shop") || "Shop"}
            value={form.shopId || ""}
            onChange={(event) => handleChange("shopId", event.target.value || undefined)}
            options={shopOptions.length ? shopOptions : [{ value: "", label: t("noShopsAvailable") || "No shop" }]}
            disabled={!shopOptions.length}
            error={!shopOptions.length ? t("connectShopFirst") || "Connect a shop" : undefined}
          />
          <Input
            label={t("productUrl") || "Product URL"}
            value={form.productUrl}
            onChange={(event) => handleChange("productUrl", event.target.value)}
            placeholder="https://www.amazon.co.jp/dp/..."
            required
            error={errors.productUrl}
          />
        </div>

        <div className="grid grid-3" style={{ gap: 16 }}>
          <Input
            label="ASIN"
            value={form.asin}
            onChange={(event) => handleChange("asin", event.target.value.toUpperCase())}
            placeholder="B00EXAMPLE"
            maxLength={10}
          />
          <Input
            label={t("quantity") || "Quantity"}
            type="number"
            min={1}
            max={10}
            value={form.quantity}
            onChange={(event) => handleChange("quantity", Number(event.target.value))}
            error={errors.quantity}
          />
          <Input
            label={t("targetPriceOptional") || "Target price (optional)"}
            type="number"
            min={0}
            step="0.01"
            value={form.purchasePrice ?? ""}
            onChange={(event) => handleChange("purchasePrice", event.target.value ? Number(event.target.value) : undefined)}
          />
        </div>

        <Textarea
          label={t("notesOptional") || "Notes (optional)"}
          value={form.notes}
          onChange={(event) => handleChange("notes", event.target.value)}
          placeholder={t("notesHelperManualOrder") || "Add packing instructions, local PO number, etc."}
        />

        <div className="grid grid-2" style={{ gap: 16 }}>
          <Input
            label={t("buyerName") || "Buyer name"}
            value={form.buyerName}
            onChange={(event) => handleChange("buyerName", event.target.value)}
            required
            error={errors.buyerName}
          />
          <Input
            label={t("phone") || "Phone"}
            value={form.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
            required
            error={errors.phone}
          />
        </div>

        <div className="grid grid-2" style={{ gap: 12 }}>
          <Select
            label={t("shippingProfileSelect") || "Shipping profile (optional)"}
            value={form.shippingProfileId || ""}
            onChange={(e) => {
              const val = e.target.value || undefined;
              handleChange("shippingProfileId", val as any);
              if (val && shippingProfiles) {
                const p = shippingProfiles.find((pp: any) => pp.id === val);
                if (p) {
                  setShippingTouched(true);
                  handleChange("shippingAddressLabel", p.amazonAddressLabel);
                }
              }
            }}
            options={Array.isArray(shippingProfiles) && shippingProfiles.length ? shippingProfiles.map((p: any) => ({ value: p.id, label: `${p.label} — ${p.addressLine1}` })) : [{ value: "", label: t("noProfiles") || "No profiles" }]}
          />

          <Input
            label={t("shippingLabel") || "Shipping label"}
            value={form.shippingAddressLabel}
            onChange={(event) => {
              setShippingTouched(true);
              handleChange("shippingAddressLabel", event.target.value);
            }}
            placeholder={t("shippingLabelPlaceholder") || "Displayed name inside Amazon address book"}
            error={errors.shippingAddressLabel}
          />
        </div>

        <div className="grid grid-2" style={{ gap: 16 }}>
          <Input
            label={t("addressLine1") || "Address line 1"}
            value={form.addressLine1}
            onChange={(event) => handleChange("addressLine1", event.target.value)}
            required
            error={errors.addressLine1}
          />
          <Input
            label={t("addressLine2") || "Address line 2"}
            value={form.addressLine2}
            onChange={(event) => handleChange("addressLine2", event.target.value)}
            placeholder={t("addressLine2Optional") || "Apartment, building, etc."}
          />
        </div>

        <div className="grid grid-3" style={{ gap: 16 }}>
          <Input
            label={t("city") || "City"}
            value={form.city}
            onChange={(event) => handleChange("city", event.target.value)}
            required
            error={errors.city}
          />
          <Input
            label={t("stateProvince") || "State / Prefecture"}
            value={form.state}
            onChange={(event) => handleChange("state", event.target.value)}
          />
          <Input
            label={t("postalCode") || "Postal code"}
            value={form.postalCode}
            onChange={(event) => handleChange("postalCode", event.target.value)}
            required
            error={errors.postalCode}
          />
        </div>

        <div className="grid grid-2" style={{ gap: 16 }}>
          <Input
            label={t("country") || "Country"}
            value={form.country}
            onChange={(event) => handleChange("country", event.target.value.toUpperCase())}
            placeholder="JP"
          />
          <div>
            <label className="label" style={{ marginBottom: 8 }}>{t("autoFillTips") || "Tips"}</label>
            <div className="stack-sm" style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              <div>• {t("autoFillShippingLabelHint") || "Keep shipping label identical to Amazon address book."}</div>
              <div>• {t("quantityHintManualOrder") || "Quantity >1 will loop purchases sequentially"}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <Badge variant="info">{t("manualOrderEncrypted") || "Credentials stay encrypted"}</Badge>
          <Button type="submit" disabled={isSubmitting || !shopOptions.length}>
            {isSubmitting ? t("creating") || "Creating" : t("createManualOrder") || "Create order"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
