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

// Simple rate limiter for Shopee API (1 req/sec limit)
class RateLimiter {
  private lastCall: number = 0;
  private minInterval: number;

  constructor(callsPerSecond: number = 1) {
    this.minInterval = 1000 / callsPerSecond;
  }

  async wait() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCall = Date.now();
  }
}

const shopeeRateLimiter = new RateLimiter(1); // 1 request per second

function signShopeeRequest(cfg: ShopeeConfig, path: string, timestamp: number): string {
  const shopId = Number(cfg.shopId);
  const base = `${cfg.partnerId}${path}${timestamp}${cfg.accessToken ?? ""}${shopId}`;
  return crypto.createHmac("sha256", cfg.partnerKey).update(base).digest("hex");
}

async function postShopee(cfg: ShopeeConfig, path: string, body: Record<string, unknown>) {
  // Apply rate limiting before making request
  await shopeeRateLimiter.wait();
  
  const baseUrl = cfg.baseUrl ?? "https://partner.shopeemobile.com";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = signShopeeRequest(cfg, path, timestamp);
  const url = `${baseUrl}${path}?partner_id=${cfg.partnerId}&timestamp=${timestamp}&sign=${sign}${
    cfg.accessToken ? `&access_token=${cfg.accessToken}` : ""
  }&shop_id=${cfg.shopId}`;
  
  // Add shop_id to request body as required by Shopee API v2
  const requestBody = {
    shop_id: Number(cfg.shopId),
    ...body
  };
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });
  
  const json: any = await res.json();
  
  // Parse Shopee error response format
  if (!res.ok || json.error) {
    const errorCode = json.error || 'UNKNOWN_ERROR';
    const errorMsg = json.message || json.msg || 'Unknown error';
    const requestId = json.request_id || '';
    throw new Error(`Shopee ${path} failed [${errorCode}]: ${errorMsg} (request_id: ${requestId})`);
  }
  
  return json;
}

export async function getShopInfo(cfg: ShopeeConfig): Promise<Record<string, unknown>> {
  const json: any = await postShopee(cfg, "/api/v2/shop/get_shop_info", {});
  return json.response ?? {};
}

// Poll new orders using Shopee OpenAPI v2 get_order_list.
export async function fetchNewOrders(cfg: ShopeeConfig, lastPolledAt?: Date): Promise<ShopeeOrder[]> {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Use last polled timestamp if available, otherwise use 10 minutes ago as fallback
  const timeFrom = lastPolledAt 
    ? Math.floor(lastPolledAt.getTime() / 1000) 
    : timestamp - 600;
  
  const json: any = await postShopee(cfg, "/api/v2/order/get_order_list", {
    time_from: timeFrom,
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
