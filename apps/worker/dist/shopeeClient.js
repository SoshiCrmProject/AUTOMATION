"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNewOrders = fetchNewOrders;
exports.fetchOrderDetail = fetchOrderDetail;
const node_fetch_1 = __importDefault(require("node-fetch"));
const crypto_1 = __importDefault(require("crypto"));
// Simple rate limiter for Shopee API (1 req/sec limit)
class RateLimiter {
    constructor(callsPerSecond = 1) {
        this.lastCall = 0;
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
function signShopeeRequest(cfg, path, timestamp) {
    const shopId = Number(cfg.shopId);
    const base = `${cfg.partnerId}${path}${timestamp}${cfg.accessToken ?? ""}${shopId}`;
    return crypto_1.default.createHmac("sha256", cfg.partnerKey).update(base).digest("hex");
}
async function postShopee(cfg, path, body) {
    // Apply rate limiting before making request
    await shopeeRateLimiter.wait();
    const baseUrl = cfg.baseUrl ?? "https://partner.shopeemobile.com";
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = signShopeeRequest(cfg, path, timestamp);
    const url = `${baseUrl}${path}?partner_id=${cfg.partnerId}&timestamp=${timestamp}&sign=${sign}${cfg.accessToken ? `&access_token=${cfg.accessToken}` : ""}&shop_id=${cfg.shopId}`;
    // Add shop_id to request body as required by Shopee API v2
    const requestBody = {
        shop_id: Number(cfg.shopId),
        ...body
    };
    const res = await (0, node_fetch_1.default)(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
    });
    const json = await res.json();
    // Parse Shopee error response format
    if (!res.ok || json.error) {
        const errorCode = json.error || 'UNKNOWN_ERROR';
        const errorMsg = json.message || json.msg || 'Unknown error';
        const requestId = json.request_id || '';
        throw new Error(`Shopee ${path} failed [${errorCode}]: ${errorMsg} (request_id: ${requestId})`);
    }
    return json;
}
// Poll new orders using Shopee OpenAPI v2 get_order_list.
async function fetchNewOrders(cfg, lastPolledAt) {
    const timestamp = Math.floor(Date.now() / 1000);
    // Use last polled timestamp if available, otherwise use 10 minutes ago as fallback
    const timeFrom = lastPolledAt
        ? Math.floor(lastPolledAt.getTime() / 1000)
        : timestamp - 600;
    const json = await postShopee(cfg, "/api/v2/order/get_order_list", {
        time_from: timeFrom,
        time_to: timestamp,
        page_size: 50
    });
    return json.response?.order_list ?? [];
}
async function fetchOrderDetail(cfg, orderSn) {
    const json = await postShopee(cfg, "/api/v2/order/get_order_detail", {
        order_sn_list: [orderSn],
        response_optional_fields: "recipient_address,item_list"
    });
    return json.response?.order_list?.[0] ?? null;
}
