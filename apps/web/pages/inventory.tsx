import { useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import AppNav from "../components/AppNav";
import FormModal from "../components/FormModal";
import Modal from "../components/Modal";
import Toast, { pushToast } from "../components/Toast";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type InventoryItem = {
  id: string;
  productId: string;
  sku: string;
  quantity: number;
  location: string;
  status: string;
  lowStockThreshold: number;
  updatedAt: string;
};

type LowStockAlert = {
  id: string;
  productId: string;
  currentStock: number;
  threshold: number;
  acknowledged: boolean;
  createdAt: string;
};

export default function Inventory() {
  const { t } = useTranslation("common");
  const [shopId, setShopId] = useState<string>("");
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showUpdateThresholdModal, setShowUpdateThresholdModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  const { data: inventory, mutate: refreshInventory } = useSWR<InventoryItem[]>(
    shopId ? `/api/inventory/${shopId}` : null,
    fetcher
  );
  
  const { data: alerts, mutate: refreshAlerts } = useSWR<LowStockAlert[]>(
    shopId ? `/api/inventory/alerts/low-stock?shopId=${shopId}` : null,
    fetcher
  );

  const { data: movements } = useSWR(
    selectedItem ? `/api/inventory/movements?productId=${selectedItem.productId}` : null,
    fetcher
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_STOCK": return "success";
      case "LOW_STOCK": return "warning";
      case "OUT_OF_STOCK": return "error";
      default: return "info";
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await api.post(`/api/inventory/alerts/${alertId}/acknowledge`);
      pushToast(t('acknowledged'), 'success');
      refreshAlerts();
    } catch (err) {
      pushToast('Failed to acknowledge alert', 'error');
    }
  };

  const handleAddStock = async (data: any) => {
    try {
      await api.post('/api/inventory/stock/adjust', {
        shopId,
        productId: data.productId,
        quantityChange: Number(data.quantity),
        reason: data.reason,
        location: data.location,
      });
      pushToast('Stock added successfully', 'success');
      refreshInventory();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to add stock');
    }
  };

  const handleUpdateThreshold = async (data: any) => {
    try {
      await api.put(`/api/inventory/${selectedItem?.id}/threshold`, {
        threshold: Number(data.threshold),
      });
      pushToast('Threshold updated successfully', 'success');
      refreshInventory();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to update threshold');
    }
  };

  return (
    <div className="shell">
      <AppNav activeHref="/inventory" />
      <div className="container">
        <div className="hero" style={{ marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 36, margin: 0 }}>📦 {t('inventoryTitle')}</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>
              {t('inventoryDesc')}
            </p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddStockModal(true)}
            disabled={!shopId}
          >
            + {t('addStock')}
          </button>
        </div>

        {/* Filter */}
        <div className="card" style={{ marginBottom: 24 }}>
          <label className="form-label">{t('shopId')}</label>
          <input
            className="form-input"
            type="text"
            placeholder={t('enterShopId')}
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
          />
        </div>

        {!shopId && (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>{t('getStarted')}</h3>
            <p>{t('enterShopIdDesc')}</p>
          </div>
        )}

        {shopId && (
          <>
            {/* Low Stock Alerts */}
            {alerts && alerts.length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 12 }}>
                  <span>⚠️</span> {t('lowStockAlerts')}
                  <span className="badge badge-error">{alerts.length}</span>
                </h3>
                <div style={{ display: "grid", gap: 16 }}>
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="alert alert-warning"
                      style={{ justifyContent: "space-between" }}
                    >
                      <div>
                        <strong>{t('productId')}: {alert.productId}</strong>
                        <div style={{ fontSize: "0.875rem", marginTop: 4 }}>
                          {t('currentStock')}: {alert.currentStock} / {t('threshold')}: {alert.threshold}
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          {t('acknowledge')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inventory Table */}
            {inventory && inventory.length > 0 && (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>{t('inventoryOverview')}</h3>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t('sku')}</th>
                        <th>{t('productId')}</th>
                        <th>{t('quantity')}</th>
                        <th>{t('location')}</th>
                        <th>{t('status')}</th>
                        <th>{t('threshold')}</th>
                        <th>{t('lastUpdated')}</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => (
                        <tr key={item.id}>
                          <td><code>{item.sku}</code></td>
                          <td>{item.productId}</td>
                          <td><strong>{item.quantity}</strong></td>
                          <td>{item.location}</td>
                          <td>
                            <span className={`badge badge-${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td>{item.lowStockThreshold}</td>
                          <td>{new Date(item.updatedAt).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowUpdateThresholdModal(true);
                                }}
                              >
                                {t('updateThreshold')}
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowHistoryModal(true);
                                }}
                              >
                                {t('stockHistory')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Stock Modal */}
      <FormModal
        isOpen={showAddStockModal}
        onClose={() => setShowAddStockModal(false)}
        onSubmit={handleAddStock}
        title={t('addStock')}
        submitLabel={t('add')}
        fields={[
          { name: 'productId', label: t('productId'), type: 'text', required: true },
          { name: 'quantity', label: t('quantity'), type: 'number', required: true },
          { name: 'location', label: t('location'), type: 'text', required: true },
          { name: 'reason', label: 'Reason', type: 'textarea', placeholder: 'Restock, return, etc.' },
        ]}
      />

      {/* Update Threshold Modal */}
      <FormModal
        isOpen={showUpdateThresholdModal}
        onClose={() => {
          setShowUpdateThresholdModal(false);
          setSelectedItem(null);
        }}
        onSubmit={handleUpdateThreshold}
        title={t('updateThreshold')}
        submitLabel={t('update')}
        fields={[
          { 
            name: 'threshold', 
            label: t('threshold'), 
            type: 'number', 
            required: true,
            placeholder: String(selectedItem?.lowStockThreshold || 10)
          },
        ]}
      />

      {/* Stock History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedItem(null);
        }}
        title={t('stockHistory')}
        size="lg"
      >
        {movements && movements.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>Type</th>
                <th>Change</th>
                <th>Reason</th>
                <th>{t('location')}</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement: any) => (
                <tr key={movement.id}>
                  <td>{new Date(movement.createdAt).toLocaleString()}</td>
                  <td>
                    <span className={`badge badge-${movement.movementType === 'IN' ? 'success' : 'warning'}`}>
                      {movement.movementType}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: movement.quantityChange > 0 ? 'var(--success)' : 'var(--warning)' }}>
                      {movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}
                    </strong>
                  </td>
                  <td>{movement.reason || 'N/A'}</td>
                  <td>{movement.location || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
            No history available
          </p>
        )}
      </Modal>

      {/* Toast Notifications */}
      <Toast />
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
