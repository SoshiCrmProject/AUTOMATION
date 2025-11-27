import { useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import AppNav from "../components/AppNav";
import Toast, { pushToast } from "../components/Toast";
import OnboardingTour, { HelpButton } from "../components/OnboardingTour";
import { inventoryTour } from "../components/tourConfigs";
import { 
  Card, 
  CardHeader, 
  StatCard, 
  Button, 
  Alert, 
  LoadingSpinner,
  Tabs,
  Table,
  Badge,
  Modal,
  Input,
  Select
} from "../components/ui/index";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type ProductInventory = {
  id: string;
  shopId: string;
  shopeeItemId: string;
  sku: string;
  productName: string;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
  lowStockThreshold: number;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  costPrice: number;
  sellingPrice: number;
  supplier: string | null;
  location: string | null;
  status: string;
  updatedAt: Date;
  lowStockAlerts: LowStockAlert[];
};

type LowStockAlert = {
  id: string;
  productId: string;
  currentQty: number;
  threshold: number;
  acknowledged: boolean;
  notifiedAt: Date;
  resolvedAt: Date | null;
};

type InventoryResponse = {
  inventory: ProductInventory[];
  stats: {
    _count: number;
    _sum: {
      currentStock: number | null;
      availableStock: number | null;
      reservedStock: number | null;
    };
  };
};

export default function Inventory() {
  const { t } = useTranslation("common");
  const [shopId, setShopId] = useState<string>("");
  const [showTour, setShowTour] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductInventory | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");
  const [adjustReason, setAdjustReason] = useState("");
  const [loading, setLoading] = useState(false);
  
  // New product form state
  const [newProduct, setNewProduct] = useState({
    shopeeItemId: "",
    sku: "",
    productName: "",
    currentStock: 0,
    costPrice: 0,
    sellingPrice: 0,
    lowStockThreshold: 10,
    supplier: "",
    location: ""
  });

  // Fetch inventory data
  const { data: inventoryData, error: invError, mutate: refreshInventory } = useSWR<InventoryResponse>(
    shopId ? `/api/inventory/${shopId}` : null,
    fetcher
  );
  
  const { data: lowStockAlerts, mutate: refreshAlerts } = useSWR<LowStockAlert[]>(
    shopId ? `/api/inventory/alerts/low-stock?shopId=${shopId}` : null,
    fetcher
  );

  const isLoading = !inventoryData && !invError && shopId;
  
  // Ensure arrays
  const inventory = Array.isArray(inventoryData?.inventory) ? inventoryData.inventory : [];
  const alerts = Array.isArray(lowStockAlerts) ? lowStockAlerts : [];

  // Filter inventory
  const filteredInventory = inventory.filter(item => {
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    const matchesSearch = !searchTerm || 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Stats
  const totalStock = inventoryData?.stats?._sum?.currentStock || 0;
  const totalAvailable = inventoryData?.stats?._sum?.availableStock || 0;
  const totalReserved = inventoryData?.stats?._sum?.reservedStock || 0;
  const totalProducts = inventoryData?.stats?._count || 0;
  const lowStockCount = inventory.filter(i => i.status === "LOW_STOCK").length;
  const outOfStockCount = inventory.filter(i => i.status === "OUT_OF_STOCK").length;

  // Handle stock adjustment
  const handleStockAdjust = async () => {
    if (!selectedProduct || adjustQuantity === 0) return;
    
    setLoading(true);
    try {
      await api.post(`/api/inventory/${selectedProduct.id}/adjust`, {
        quantity: Math.abs(adjustQuantity),
        type: adjustType,
        reason: adjustReason || undefined
      });
      pushToast('Stock adjusted successfully', 'success');
      refreshInventory();
      setShowAdjustModal(false);
      setAdjustQuantity(0);
      setAdjustReason("");
      setSelectedProduct(null);
    } catch (err: any) {
      pushToast(err.response?.data?.error || 'Failed to adjust stock', 'error');
    }
    setLoading(false);
  };

  // Handle add new product
  const handleAddProduct = async () => {
    if (!shopId || !newProduct.shopeeItemId || !newProduct.productName) {
      pushToast('Please fill in required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/inventory', {
        shopId,
        ...newProduct
      });
      pushToast('Product added successfully', 'success');
      refreshInventory();
      setShowAddModal(false);
      setNewProduct({
        shopeeItemId: "",
        sku: "",
        productName: "",
        currentStock: 0,
        costPrice: 0,
        sellingPrice: 0,
        lowStockThreshold: 10,
        supplier: "",
        location: ""
      });
    } catch (err: any) {
      pushToast(err.response?.data?.error || 'Failed to add product', 'error');
    }
    setLoading(false);
  };

  // Handle acknowledge alert
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.post(`/api/inventory/alerts/${alertId}/acknowledge`);
      pushToast('Alert acknowledged', 'success');
      refreshAlerts();
    } catch (err: any) {
      pushToast('Failed to acknowledge alert', 'error');
    }
  };

  // Handle resolve alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.post(`/api/inventory/alerts/${alertId}/resolve`);
      pushToast('Alert resolved', 'success');
      refreshAlerts();
    } catch (err: any) {
      pushToast('Failed to resolve alert', 'error');
    }
  };

  return (
    <div className="shell">
      <AppNav activeHref="/inventory" />
      <Toast />

        <OnboardingTour 
          pageName="inventory" 
          steps={inventoryTour} 
          onComplete={() => setShowTour(false)} 
        />
        {!showTour && <HelpButton onClick={() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem("tour_completed_inventory");
            setShowTour(true);
            window.location.reload();
          }
        }} />}
      <div className="container">
        {/* Enhanced Hero Section */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
          marginBottom: '32px',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: '42px', margin: '0 0 12px 0', fontWeight: 900, background: 'linear-gradient(135deg, #f59e0b, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                📦 {t("navInventory") || "Inventory Management"}
              </h1>
              <p style={{ color: "var(--color-text-muted)", margin: 0, fontSize: '16px' }}>
                Track stock levels, manage products, and monitor alerts
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button onClick={() => setShowAddModal(true)} disabled={!shopId}>
                ➕ Add Product
              </Button>
              <Button onClick={() => refreshInventory()} variant="ghost">
                🔄 Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Shop Selection */}
        {!shopId && (
          <Alert variant="info" title={t("selectShop")}>
            {t("enterShopIDToManageInventory")}
          </Alert>
        )}

        <div style={{ marginBottom: '24px' }}>
          <Input
            label={t("shopID")}
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            placeholder={t("enterYourShopID")}
            hint={t("shopIDHint")}
          />
        </div>

        {/* Alert Messages */}
        {alerts.length > 0 && (
          <Alert variant="warning" title={`${alerts.length} ${t("lowStockAlerts")}`}>
            {t("productsNeedAttention")}
          </Alert>
        )}

        {shopId && (
          <>
            {isLoading ? (
              <LoadingSpinner size="lg" text={t("loadingInventory")} />
            ) : invError ? (
              <Alert variant="error" title={t("failedToLoadInventory")}>
                {invError.message || t("unableToFetchInventoryData")}
              </Alert>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-4" style={{ marginBottom: '32px' }}>
                  <StatCard 
                    label={t("totalProducts")}
                    value={totalProducts}
                    icon="📦"
                    color="primary"
                  />
                  <StatCard 
                    label={t("totalStock")}
                    value={totalStock}
                    icon="📊"
                    color="info"
                  />
                  <StatCard 
                    label={t("lowStock")}
                    value={lowStockCount}
                    icon="⚠️"
                    color="warning"
                  />
                  <StatCard 
                    label={t("outOfStock")}
                    value={outOfStockCount}
                    icon="🚫"
                    color="error"
                  />
                </div>

                {/* Filters */}
                <div style={{ marginBottom: '24px' }}>
                  <Card>
                  <CardHeader title={t("filters")} icon="🔍" />
                  <div className="grid grid-3" style={{ gap: '16px' }}>
                    <Input
                      label={t("search")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={t("searchProductOrSKU")}
                    />
                    <Select
                      label={t("status")}
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      options={[
                        { value: "all", label: t("allStatus") },
                        { value: "IN_STOCK", label: t("inStock") },
                        { value: "LOW_STOCK", label: t("lowStock") },
                        { value: "OUT_OF_STOCK", label: t("outOfStock") },
                        { value: "DISCONTINUED", label: t("discontinued") },
                      ]}
                    />
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                      <Button onClick={() => { setSearchTerm(""); setFilterStatus("all"); }} variant="ghost" fullWidth>
                        {t("clearFilters")}
                      </Button>
                    </div>
                  </div>
                </Card>
                </div>

                {/* Tabbed Content */}
                <div style={{ marginBottom: '32px' }}>
                  <Card>
                  <Tabs
                    tabs={[
                      {
                        id: 'products',
                        label: t("products"),
                        icon: '📦',
                        badge: filteredInventory.length,
                        content: (
                          <div>
                            {filteredInventory.length > 0 ? (
                              <Table
                                columns={[
                                  { key: 'sku', header: t("sku"), width: '120px' },
                                  { key: 'productName', header: t("productName") },
                                  { 
                                    key: 'status', 
                                    header: t("status"),
                                    width: '120px',
                                    render: (row) => (
                                      <Badge variant={
                                        row.status === 'IN_STOCK' ? 'success' :
                                        row.status === 'LOW_STOCK' ? 'warning' :
                                        row.status === 'OUT_OF_STOCK' ? 'error' : 'info'
                                      }>
                                        {row.status.replace('_', ' ')}
                                      </Badge>
                                    )
                                  },
                                  { 
                                    key: 'currentStock', 
                                    header: t("stock"),
                                    width: '100px',
                                    render: (row) => (
                                      <span style={{ 
                                        fontWeight: 600,
                                        color: row.currentStock <= row.lowStockThreshold ? 'var(--color-error)' : 'var(--color-text)'
                                      }}>
                                        {row.currentStock}
                                      </span>
                                    )
                                  },
                                  { 
                                    key: 'available', 
                                    header: t("available"),
                                    width: '100px',
                                    render: (row) => row.availableStock
                                  },
                                  { 
                                    key: 'location', 
                                    header: t("location"),
                                    width: '120px',
                                    render: (row) => row.location || '-'
                                  },
                                  {
                                    key: 'actions',
                                    header: t("actions"),
                                    width: '150px',
                                    render: (row) => (
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <Button 
                                          size="sm" 
                                          variant="primary"
                                          onClick={() => {
                                            setSelectedProduct(row);
                                            setShowAdjustModal(true);
                                          }}
                                        >
                                          {t("adjust")}
                                        </Button>
                                      </div>
                                    )
                                  }
                                ]}
                                data={filteredInventory}
                                emptyMessage={t("noProductsFound")}
                              />
                            ) : (
                              <div style={{ padding: '60px', textAlign: 'center' }}>
                                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
                                <h3 style={{ marginBottom: '8px' }}>{t("noProductsFound")}</h3>
                                <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
                                  {searchTerm || filterStatus !== 'all' 
                                    ? t("tryAdjustingFilters")
                                    : t("addFirstProductToStart")}
                                </p>
                                {!searchTerm && filterStatus === 'all' && (
                                  <Button onClick={() => setShowAddModal(true)}>
                                    ➕ {t("addProduct")}
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ),
                      },
                      {
                        id: 'alerts',
                        label: t("alerts"),
                        icon: '🔔',
                        badge: alerts.filter(a => !a.acknowledged).length,
                        content: (
                          <div>
                            {alerts.length > 0 ? (
                              <Table
                                columns={[
                                  { 
                                    key: 'productId', 
                                    header: t("product"),
                                    render: (row) => {
                                      const product = inventory.find(p => p.id === row.productId);
                                      return product?.productName || row.productId;
                                    }
                                  },
                                  { 
                                    key: 'currentQty', 
                                    header: t("currentStock"),
                                    width: '120px',
                                    render: (row) => (
                                      <Badge variant="error">{row.currentQty}</Badge>
                                    )
                                  },
                                  { 
                                    key: 'threshold', 
                                    header: t("threshold"),
                                    width: '100px'
                                  },
                                  { 
                                    key: 'notifiedAt', 
                                    header: t("date"),
                                    width: '150px',
                                    render: (row) => new Date(row.notifiedAt).toLocaleDateString()
                                  },
                                  { 
                                    key: 'status', 
                                    header: 'Status',
                                    width: '120px',
                                    render: (row) => (
                                      <Badge variant={row.acknowledged ? 'info' : 'warning'}>
                                        {row.acknowledged ? t("acknowledged") : t("new")}
                                      </Badge>
                                    )
                                  },
                                  {
                                    key: 'actions',
                                    header: 'Actions',
                                    width: '180px',
                                    render: (row) => (
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        {!row.acknowledged && (
                                          <Button 
                                            size="sm" 
                                            variant="ghost"
                                            onClick={() => handleAcknowledgeAlert(row.id)}
                                          >
                                            {t("acknowledge")}
                                          </Button>
                                        )}
                                        {!row.resolvedAt && (
                                          <Button 
                                            size="sm" 
                                            variant="success"
                                            onClick={() => handleResolveAlert(row.id)}
                                          >
                                            {t("resolve")}
                                          </Button>
                                        )}
                                      </div>
                                    )
                                  }
                                ]}
                                data={alerts}
                                emptyMessage={t("noAlerts")}
                              />
                            ) : (
                              <div style={{ padding: '60px', textAlign: 'center' }}>
                                <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                                <h3 style={{ marginBottom: '8px' }}>{t("noAlerts")}</h3>
                                <p style={{ color: 'var(--color-text-muted)' }}>
                                  {t("allProductsWellStocked")}
                                </p>
                              </div>
                            )}
                          </div>
                        ),
                      },
                      {
                        id: 'stats',
                        label: t("statistics"),
                        icon: '📊',
                        content: (
                          <div style={{ padding: '24px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '24px' }}>{t("inventoryStatistics")}</h3>
                            
                            <div className="grid grid-2" style={{ marginBottom: '32px' }}>
                              <Card>
                                <CardHeader title={t("stockOverview")} icon="📦" />
                                <div style={{ padding: '16px' }}>
                                  <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                      <span>Total Stock</span>
                                      <strong>{totalStock}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                      <span>Available</span>
                                      <strong style={{ color: 'var(--color-success)' }}>{totalAvailable}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span>Reserved</span>
                                      <strong style={{ color: 'var(--color-warning)' }}>{totalReserved}</strong>
                                    </div>
                                  </div>
                                </div>
                              </Card>

                              <Card>
                                <CardHeader title={t("productStatus")} icon="📋" />
                                <div style={{ padding: '16px' }}>
                                  <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                      <span>{t("inStock")}</span>
                                      <Badge variant="success">
                                        {inventory.filter(i => i.status === 'IN_STOCK').length}
                                      </Badge>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                      <span>{t("lowStock")}</span>
                                      <Badge variant="warning">{lowStockCount}</Badge>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span>{t("outOfStock")}</span>
                                      <Badge variant="error">{outOfStockCount}</Badge>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            </div>

                            <Alert variant="info" title={t("inventoryHealth")}>
                              {outOfStockCount === 0 && lowStockCount === 0 ? (
                                t("inventoryInGoodShape")
                              ) : (
                                <>
                                  {outOfStockCount > 0 && `${outOfStockCount} ${t("productsOutOfStock")} `}
                                  {lowStockCount > 0 && `${lowStockCount} ${t("productsRunningLow")} `}
                                  {t("considerRestocking")}
                                </>
                              )}
                            </Alert>
                          </div>
                        ),
                      },
                    ]}
                  />
                </Card>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustModal && selectedProduct && (
        <Modal
          isOpen={showAdjustModal}
          onClose={() => {
            setShowAdjustModal(false);
            setSelectedProduct(null);
            setAdjustQuantity(0);
            setAdjustReason("");
          }}
          title={t("adjustStock")}
          size="md"
        >
          <div style={{ padding: '24px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '16px' }}>
              {selectedProduct.productName}
            </h4>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
              {t("currentStock")}: <strong>{selectedProduct.currentStock}</strong>
            </p>

            <Select
              label={t("adjustmentType")}
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value as any)}
              options={[
                { value: "IN", label: t("stockIn") },
                { value: "OUT", label: t("stockOut") },
                { value: "ADJUSTMENT", label: t("adjustment") },
              ]}
            />

            <Input
              label={t("quantity")}
              type="number"
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(Number(e.target.value))}
              placeholder={t("enterQuantity")}
              hint={`${t("newStockWillBe")}: ${selectedProduct.currentStock + (adjustType === 'OUT' ? -adjustQuantity : adjustQuantity)}`}
            />

            <Input
              label={t("reasonOptional")}
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <Button onClick={handleStockAdjust} disabled={loading || adjustQuantity === 0} fullWidth>
                {loading ? t("adjusting") : t("confirmAdjustment")}
              </Button>
              <Button 
                onClick={() => {
                  setShowAdjustModal(false);
                  setSelectedProduct(null);
                }} 
                variant="ghost"
                fullWidth
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title={t("addNewProduct")}
          size="lg"
        >
          <div style={{ padding: '24px' }}>
            <div className="grid grid-2" style={{ gap: '16px' }}>
              <Input
                label={`${t("shopeeItemID")} *`}
                value={newProduct.shopeeItemId}
                onChange={(e) => setNewProduct({...newProduct, shopeeItemId: e.target.value})}
                placeholder="e.g., 123456789"
              />
              <Input
                label={`${t("sku")} *`}
                value={newProduct.sku}
                onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                placeholder="e.g., PROD-001"
              />
              <Input
                label={`${t("productName")} *`}
                value={newProduct.productName}
                onChange={(e) => setNewProduct({...newProduct, productName: e.target.value})}
                placeholder={t("productNamePlaceholder")}
                style={{ gridColumn: '1 / -1' }}
              />
              <Input
                label={t("initialStock")}
                type="number"
                value={newProduct.currentStock}
                onChange={(e) => setNewProduct({...newProduct, currentStock: Number(e.target.value)})}
              />
              <Input
                label={t("lowStockThreshold")}
                type="number"
                value={newProduct.lowStockThreshold}
                onChange={(e) => setNewProduct({...newProduct, lowStockThreshold: Number(e.target.value)})}
              />
              <Input
                label={t("costPrice")}
                type="number"
                value={newProduct.costPrice}
                onChange={(e) => setNewProduct({...newProduct, costPrice: Number(e.target.value)})}
              />
              <Input
                label={t("sellingPrice")}
                type="number"
                value={newProduct.sellingPrice}
                onChange={(e) => setNewProduct({...newProduct, sellingPrice: Number(e.target.value)})}
              />
              <Input
                label={t("supplier")}
                value={newProduct.supplier}
                onChange={(e) => setNewProduct({...newProduct, supplier: e.target.value})}
                placeholder={t("supplierName")}
              />
              <Input
                label={t("location")}
                value={newProduct.location}
                onChange={(e) => setNewProduct({...newProduct, location: e.target.value})}
                placeholder={t("locationPlaceholder")}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <Button onClick={handleAddProduct} disabled={loading} fullWidth>
                {loading ? t("adding") : t("addProduct")}
              </Button>
              <Button onClick={() => setShowAddModal(false)} variant="ghost" fullWidth>
                {t("cancel")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}
