"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNewOrders = fetchNewOrders;
exports.fetchOrderDetail = fetchOrderDetail;
const node_fetch_1 = __importDefault(require("node-fetch"));
const crypto_1 = __importDefault(require("crypto"));
function signShopeeRequest(cfg, path, timestamp) {
    const shopId = Number(cfg.shopId);
    const base = `${cfg.partnerId}${path}${timestamp}${cfg.accessToken ?? ""}${shopId}`;
    return crypto_1.default.createHmac("sha256", cfg.partnerKey).update(base).digest("hex");
}
async function postShopee(cfg, path, body) {
    const baseUrl = cfg.baseUrl ?? "https://partner.shopeemobile.com";
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = signShopeeRequest(cfg, path, timestamp);
    const url = `${baseUrl}${path}?partner_id=${cfg.partnerId}&timestamp=${timestamp}&sign=${sign}${cfg.accessToken ? `&access_token=${cfg.accessToken}` : ""}&shop_id=${cfg.shopId}`;
    const res = await (0, node_fetch_1.default)(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Shopee ${path} failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    return json;
}
// Poll new orders using Shopee OpenAPI v2 get_order_list.
async function fetchNewOrders(cfg) {
    const timestamp = Math.floor(Date.now() / 1000);
    const json = await postShopee(cfg, "/api/v2/order/get_order_list", {
        time_from: timestamp - 600,
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
