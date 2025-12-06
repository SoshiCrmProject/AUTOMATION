import { useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import PageLayout from "../components/PageLayout";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui";
import ShippingProfileForm from "../components/shipping-profiles/ShippingProfileForm";
import api from "../lib/apiClient";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ShippingProfilesPage() {
  const { data: profiles, mutate } = useSWR("/shipping-profiles", fetcher);
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <PageLayout activeHref="/shipping-profiles" title="🏷️ Shipping profiles" description="Manage saved shipping addresses used for manual and automated orders">
      <div className="grid grid-2" style={{ gap: 20 }}>
        <div>
          <Card>
            <CardHeader title="Saved profiles" subtitle={`${(profiles || []).length || 0} profiles`} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(profiles || []).map((p: any) => (
                <div key={p.id} style={{ border: "1px solid var(--color-border)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{p.label}</strong>
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{p.contactName} · {p.phone}</div>
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{p.addressLine1}{p.addressLine2 ? `, ${p.addressLine2}` : ""}, {p.city} {p.postalCode}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                    <Button variant="warning" onClick={async () => { if (!confirm("Delete profile?")) return; await api.delete(`/shipping-profiles/${p.id}`); mutate(); }}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <ShippingProfileForm shopId={(profiles && profiles[0] && profiles[0].shopId) || ""} initial={editing ?? undefined} onSaved={() => { setEditing(null); mutate(); }} />
        </div>
      </div>
    </PageLayout>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return { props: { ...(await serverSideTranslations(locale, ["common"])) } };
}
