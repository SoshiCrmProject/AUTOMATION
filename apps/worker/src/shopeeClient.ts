import fetch from "node-fetch";
import crypto from "crypto";

type ShopeeConfig = {
  partnerId: string;
  partnerKey: string;
  shopId: string;
  accessToken?: string;
  baseUrl?: string;
};

export type ShopeeOrder = {
  order_sn: string;
  status: string;
  item_list?: { item_id: number; item_name: string }[];
  product_url?: string;
  total_amount: number;
  buyer_username: string;
  recipient_address: Record<string, unknown>;
};

function signShopeeRequest(cfg: ShopeeConfig, path: string, timestamp: number): string {
  const shopId = Number(cfg.shopId);
  const base = `${cfg.partnerId}${path}${timestamp}${cfg.accessToken ?? ""}${shopId}`;
  return crypto.createHmac("sha256", cfg.partnerKey).update(base).digest("hex");
}

async function postShopee(cfg: ShopeeConfig, path: string, body: Record<string, unknown>) {
  const baseUrl = cfg.baseUrl ?? "https://partner.shopeemobile.com";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(cfg, path, timestamp);
  const url = `${baseUrl}${path}?partner_id=${cfg.partnerId}&timestamp=${timestamp}&sign=${sign}${
    cfg.accessToken ? `&access_token=${cfg.accessToken}` : ""
  }&shop_id=${cfg.shopId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopee ${path} failed: ${res.status} ${text}`);
  }
  const json: any = await res.json();
  return json;
}

// Poll new orders using Shopee OpenAPI v2 get_order_list.
export async function fetchNewOrders(cfg: ShopeeConfig): Promise<ShopeeOrder[]> {
  const timestamp = Math.floor(Date.now() / 1000);
  const json: any = await postShopee(cfg, "/api/v2/order/get_order_list", {
    time_from: timestamp - 600,
    time_to: timestamp,
    page_size: 50
  });
  return json.response?.order_list ?? [];
}

export async function fetchOrderDetail(cfg: ShopeeConfig, orderSn: string): Promise<ShopeeOrder | null> {
  const json: any = await postShopee(cfg, "/api/v2/order/get_order_detail", {
    order_sn_list: [orderSn],
    response_optional_fields: "recipient_address,item_list"
  });
  return json.response?.order_list?.[0] ?? null;
}
