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
    item_list?: {
        item_id: number;
        item_name: string;
    }[];
    product_url?: string;
    total_amount: number;
    buyer_username: string;
    recipient_address: Record<string, unknown>;
};
export declare function fetchNewOrders(cfg: ShopeeConfig): Promise<ShopeeOrder[]>;
export declare function fetchOrderDetail(cfg: ShopeeConfig, orderSn: string): Promise<ShopeeOrder | null>;
export {};
