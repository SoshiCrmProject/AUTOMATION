import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
});
const defaultAdapter = api.defaults.adapter;

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  // Strip /api prefix for routes that are NOT mounted under /api on backend
  // Backend has these routes at ROOT level: /settings, /credentials/*, /shops, /orders/*, /admin/*, /ops/*, /auth/*
  // Backend has these routes under /api: /api/inventory, /api/analytics, /api/pricing, /api/notifications, /api/crm, /api/returns
  const url = config.url || '';
  const routesWithoutApiPrefix = [
    '/api/settings',
    '/api/credentials/',
    '/api/shops',
    '/api/admin/',
    '/api/ops/',
    '/api/auth/',
    '/api/mappings',
    '/api/products/',
    '/api/profit/'
  ];
  
  // Special handling for /orders - some are at root, some might be elsewhere
  // /orders/errors/export, /orders/processed/export, /orders/recent, /orders/[id], /orders/poll-now, /orders/retry/*, /orders/manual/*
  if (url.startsWith('/api/orders/')) {
    config.url = url.replace('/api', '');
  } else {
    for (const route of routesWithoutApiPrefix) {
      if (url.startsWith(route)) {
        config.url = url.replace('/api', '');
        break;
      }
    }
  }
  
  return config;
});

// Lightweight mock adapter for local UI testing without APIs.
if (process.env.NEXT_PUBLIC_MOCK_API === "1") {
  type Shop = { id: string; name: string };
  type Order = {
    id: string;
    orderNumber: string;
    shop: Shop;
    status: string;
    totalAmount: number;
    currency: string;
    productUrl: string;
    amazonOrder: any;
    errorItems: any[];
  };

  const mockState = {
    shops: [
      { id: "shop1", name: "Tokyo Shop" },
      { id: "shop2", name: "Osaka Shop" }
    ] as Shop[],
    shopeeCred: {
      partnerId: "demo-partner-id",
      partnerKey: "",
      accessToken: "",
      baseUrl: "https://partner.shopeemobile.com",
      shopId: "shop1",
      shopName: "Tokyo Shop"
    },
    amazonCred: { email: "demo@example.com" },
    settings: {
      includeAmazonPoints: false,
      includeDomesticShipping: false,
      domesticShippingCost: 0,
      maxShippingDays: 5,
      minExpectedProfit: 0,
      shopSelections: [] as any[],
      isActive: true,
      isDryRun: false,
      reviewBandPercent: 0,
      shopOverrides: [] as any[]
    },
    orders: [] as Order[],
    mappings: [
      {
        id: "map1",
        priority: 1,
        isActive: true,
        shopeeProduct: { id: "sp1", title: "Shopee Widget", sku: "SKU-1", shopeeItemId: "111", shop: { name: "Tokyo Shop" } },
        amazonProduct: { id: "ap1", title: "Amazon Widget", asin: "B00TEST", url: "https://amazon.co.jp/dp/B00TEST" }
      }
    ],
    audit: [
      { id: "a1", action: "login", detail: { ip: "127.0.0.1" }, createdAt: new Date().toISOString(), user: { email: "admin@example.com" } }
    ],
    adminUsers: [
      { id: "u1", email: "admin@example.com", role: "admin", isActive: true, createdAt: new Date().toISOString() },
      { id: "u2", email: "user@example.com", role: "user", isActive: false, createdAt: new Date().toISOString() }
    ]
  };

  // seed mock orders
  const now = new Date().toISOString();
  mockState.orders = [
    {
      id: "ord1",
      orderNumber: "SP-001",
      shop: mockState.shops[0],
      status: "pending",
      totalAmount: 5000,
      currency: "JPY",
      productUrl: "https://amazon.co.jp/dp/B00TEST",
      amazonOrder: null,
      errorItems: [
        { id: "err1", reason: "Out of stock", createdAt: now, amazonProductUrl: "https://amazon.co.jp/dp/B00TEST", productName: "Widget", shopeeOrderId: "SP-001" }
      ]
    },
    {
      id: "ord2",
      orderNumber: "SP-002",
      shop: mockState.shops[1],
      status: "processed",
      totalAmount: 12000,
      currency: "JPY",
      productUrl: "https://amazon.co.jp/dp/B00TEST2",
      amazonOrder: { amazonOrderId: "AMZ-123", status: "Shipped", createdAt: now },
      errorItems: []
    }
  ];
  mockState.settings.shopSelections = mockState.shops.map((s) => ({ shopId: s.id, isSelected: true }));

  api.defaults.adapter = async (config) => {
    const url = (config.url || "").replace(/^https?:\/\/[^/]+/, "");
    const method = (config.method || "get").toLowerCase();

    const ok = (data: any, status = 200) =>
      Promise.resolve({
        data,
        status,
        statusText: "OK",
        headers: {},
        config
      });

    // Auth mocks
    if (url === "/api/auth/login" && method === "post") return ok({ token: "mock-token" });
    if (url === "/api/auth/signup" && method === "post") return ok({ token: "mock-token" });

    // Shops
    if (url === "/api/shops" && method === "get") return ok(mockState.shops);

    // Shopee credentials
    if (url === "/api/credentials/shopee" && method === "get") return ok(mockState.shopeeCred);
    if (url === "/api/credentials/shopee" && method === "post") {
      mockState.shopeeCred = { ...(config.data as any) };
      return ok({ success: true });
    }

    // Amazon credentials
    if (url === "/api/credentials/amazon" && method === "get") return ok(mockState.amazonCred);
    if (url === "/api/credentials/amazon" && method === "post") {
      mockState.amazonCred = { ...(config.data as any) };
      return ok({ success: true });
    }

    // Settings
    if (url === "/api/settings" && method === "get") return ok(mockState.settings);
    if (url === "/api/settings" && method === "post") {
      mockState.settings = { ...(config.data as any), shopSelections: mockState.settings.shopSelections };
      return ok({ success: true });
    }

    // Orders
    if (url === "/api/orders/recent" && method === "get") return ok(mockState.orders);
    if (url === "/api/orders/errors" && method === "get") {
      const errors = mockState.orders.flatMap((o) =>
        o.errorItems.map((e) => ({
          ...e,
          shopeeOrderId: o.orderNumber,
          productName: e.productName || "Product",
          createdAt: e.createdAt
        }))
      );
      return ok(errors);
    }
    if (url.startsWith("/api/orders/") && url.endsWith("/retry") && method === "post") return ok({ success: true });
    if (url.startsWith("/api/orders/retry/") && method === "post") return ok({ success: true });
    if (url.startsWith("/api/orders/manual/") && method === "post") return ok({ success: true });
    if (url === "/api/orders/poll-now" && method === "post") return ok({ success: true });
    if (url === "/api/orders/errors/export" && method === "get") return ok("product,reason\nWidget,Out of stock", 200);
    if (url === "/api/orders/processed/export" && method === "get") return ok("orderNumber,status\nSP-002,Processed", 200);
    if (url.startsWith("/api/orders/") && method === "get") {
      const id = url.split("/").pop();
      const order = mockState.orders.find((o) => o.id === id);
      return ok(order || mockState.orders[0]);
    }

    // Ops
    if (url === "/api/ops/queue" && method === "get") return ok({ waiting: 0, active: 0, failed: 0, delayed: 0 });
    if (url === "/api/ops/amazon-test" && method === "post") return ok({ success: true });
    if (url === "/api/ops/status" && method === "get")
      return ok({
        lastOrder: now,
        lastAmazon: { createdAt: now, status: "ok" },
        lastError: { createdAt: now, reason: "Mock error" }
      });

    // Mappings
    if (url === "/api/mappings" && method === "get") return ok(mockState.mappings);
    if (url === "/api/mappings" && method === "post") {
      mockState.mappings.push({ id: `map-${Date.now()}`, ...((config.data as any) || {}) });
      return ok({ success: true });
    }
    if (url === "/api/mappings/import" && method === "post") return ok({ success: true });
    if (url === "/api/products/shopee" && method === "post") return ok({ success: true });
    if (url === "/api/products/amazon" && method === "post") return ok({ success: true });
    if (url === "/api/products/shopee" && method === "get") {
      const items = mockState.mappings.map((m) => m.shopeeProduct);
      return ok(items);
    }
    if (url === "/api/products/amazon" && method === "get") {
      const items = mockState.mappings.map((m) => m.amazonProduct);
      return ok(items);
    }

    // Admin
    if (url === "/api/admin/users" && method === "get") return ok(mockState.adminUsers);
    if (url.includes("/api/admin/users/") && url.endsWith("/toggle") && method === "post") return ok({ success: true });
    if (url.includes("/api/admin/users/") && url.endsWith("/reset-password") && method === "post") return ok({ success: true });
    if (url === "/api/admin/audit" && method === "get") return ok(mockState.audit);

    // Fallback to real adapter if configured
    if (defaultAdapter && typeof defaultAdapter === "function") {
      return defaultAdapter(config);
    }
    return ok({}, 404);
  };
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
