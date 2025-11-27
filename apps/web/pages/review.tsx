import { useState } from "react";
import useSWR from "swr";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import api from "../lib/apiClient";
import AppNav from "../components/AppNav";
import { 
  Card, CardHeader, StatCard, Button, Badge, Input, Table, 
  Alert, LoadingSpinner, EmptyState, Modal, Select, Tabs
} from "../components/ui/index";
import Toast, { pushToast } from "../components/Toast";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type ReturnRequest = {
  id: string;
  shopOrderId: string;
  customerEmail: string;
  customerName: string;
  reason: string;
  status: string;
  refundAmount: number;
  rmaNumber: string;
  requestedAt: string;
  approvedAt?: string;
  completedAt?: string;
  notes?: string;
};

type ManualReviewItem = {
  id: string;
  shopeeOrderId: string;
  reason: string;
  status: string;
  createdAt: string;
};

export default function ReviewPage() {
  const { t } = useTranslation("common");
  const [shopId, setShopId] = useState<string>("");
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Process form state
  const [processAction, setProcessAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [processNotes, setProcessNotes] = useState<string>("");
  
  const { data: manualReviewData, error: reviewError, mutate: refreshReview } = useSWR<ManualReviewItem[]>(
    "/orders/errors",
    fetcher,
    { revalidateOnFocus: false }
  );
  
  const { data: returnsData, mutate: refreshReturns } = useSWR<ReturnRequest[]>(
    shopId ? `/api/returns?shopId=${shopId}` : null,
    fetcher
  );

  const manualReviewItems = Array.isArray(manualReviewData) 
    ? manualReviewData.filter((item: any) => 
        item.reason?.toLowerCase().includes("manual review") || 
        item.reason?.toLowerCase().includes("review")
      )
    : [];
    
  const returns = Array.isArray(returnsData) ? returnsData : [];

  const retry = async (orderId: string) => {
    setLoadingId(orderId);
    try {
      await api.post(`/orders/retry/${orderId}`);
      pushToast("Order retry successful", "success");
      refreshReview();
    } catch (e: any) {
      pushToast(e?.response?.data?.error || "Retry failed", "error");
    } finally {
      setLoadingId(null);
    }
  };

  const handleProcessReturn = async () => {
    if (!selectedReturn) return;
    
    setLoading(true);
    try {
      const endpoint = processAction === 'APPROVE' 
        ? `/api/returns/${selectedReturn.id}/approve`
        : `/api/returns/${selectedReturn.id}/reject`;
      
      await api.post(endpoint, {
        refundAmount: processAction === 'APPROVE' ? refundAmount : undefined,
        notes: processNotes
      });
      
      pushToast(`Return ${processAction.toLowerCase()}d successfully`, "success");
      setShowProcessModal(false);
      setSelectedReturn(null);
      setProcessNotes("");
      refreshReturns();
    } catch (err: any) {
      pushToast(err.response?.data?.error || "Failed to process return", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReturn = async (returnId: string) => {
    setLoading(true);
    try {
      await api.post(`/api/returns/${returnId}/complete`);
      pushToast("Return completed successfully", "success");
      refreshReturns();
    } catch (err: any) {
      pushToast(err.response?.data?.error || "Failed to complete return", "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'APPROVED': return 'info';
      case 'REJECTED': return 'error';
      case 'REFUNDED': return 'success';
      case 'COMPLETED': return 'success';
      default: return 'info';
    }
  };

  const stats = {
    pending: returns.filter(r => r.status === 'PENDING').length,
    approved: returns.filter(r => r.status === 'APPROVED').length,
    refunded: returns.filter(r => r.status === 'REFUNDED').length,
    total: returns.length,
    totalRefundAmount: returns
      .filter(r => r.status === 'REFUNDED' || r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.refundAmount, 0)
  };

  return (
    <div className="shell">
      <AppNav activeHref="/review" />
      <Toast />
      
      <div className="container">
        {/* Hero Section */}
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          padding: '48px 32px',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 32,
          boxShadow: 'var(--shadow-lg)'
        }}>
          <h1 style={{ fontSize: 36, margin: 0, color: '#fff' }}>
            🔄 Returns & Manual Review Center
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8, fontSize: 16 }}>
            Process returns, manage refunds, and handle manual review items
          </p>
        </div>

        {/* Manual Review Section */}
        <div style={{ marginBottom: 32 }}>
        <Card>
          <CardHeader 
            title="⚠️ Manual Review Queue" 
            subtitle={t("ordersRequiringAttention")}
            icon="👁️"
          />
          {reviewError && (
            <Alert variant="error" title={t("errorLoadingReviewItems")}>
              {reviewError.message}
            </Alert>
          )}
          {manualReviewItems.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
              <h3 style={{ marginBottom: '8px' }}>No Items Need Review</h3>
              <p style={{ color: 'var(--color-text-muted)' }}>
                All orders are processing normally
              </p>
            </div>
          ) : (
            <Table
              columns={[
                { key: 'orderId', header: 'Order ID' },
                { key: 'reason', header: 'Reason' },
                { 
                  key: 'date', 
                  header: 'Date',
                  width: '150px',
                  render: (row: any) => (
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      {new Date(row.createdAt).toLocaleString()}
                    </span>
                  )
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  width: '140px',
                  render: (row: any) => (
                    <Button
                      size="sm"
                      onClick={() => retry(row.shopeeOrderId)}
                      disabled={loadingId === row.shopeeOrderId}
                    >
                      {loadingId === row.shopeeOrderId ? 'Retrying...' : 'Retry'}
                    </Button>
                  )
                }
              ]}
              data={manualReviewItems.map(item => ({
                orderId: item.shopeeOrderId || '-',
                reason: item.reason,
                createdAt: item.createdAt,
                shopeeOrderId: item.shopeeOrderId
              }))}
            />
          )}
        </Card>
        </div>

        {/* Returns Management */}
        <Card>
          <CardHeader 
            title="🔄 Returns Management" 
            subtitle={t("manageReturns")}
            icon="💰"
          />
          
          {/* Shop ID Input */}
          <div style={{ padding: '0 24px 24px' }}>
            <Input
              label="Shop ID"
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              placeholder={t("enterShopIDReturns")}
            />
          </div>

          {!shopId && (
            <div style={{ margin: '0 24px 24px' }}>
            <Alert variant="info">
              Enter your Shop ID above to manage returns and refunds
            </Alert>
            </div>
          )}

          {shopId && (
            <>
              {/* Stats */}
              <div className="grid grid-4" style={{ gap: '16px', padding: '0 24px 24px' }}>
                <StatCard
                  icon="📋"
                  label="Total Returns"
                  value={stats.total.toString()}
                  color="primary"
                />
                <StatCard
                  icon="⏳"
                  label="Pending"
                  value={stats.pending.toString()}
                  color="warning"
                />
                <StatCard
                  icon="✅"
                  label="Approved"
                  value={stats.approved.toString()}
                  color="info"
                />
                <StatCard
                  icon="💰"
                  label="Total Refunded"
                  value={`¥${stats.totalRefundAmount.toLocaleString()}`}
                  color="success"
                />
              </div>

              {/* Returns Table */}
              {returns.length > 0 ? (
                <Tabs
                  tabs={[
                    {
                      id: 'pending',
                      label: 'Pending',
                      icon: '⏳',
                      badge: stats.pending,
                      content: (
                        <div style={{ padding: '24px' }}>
                          <Table
                            columns={[
                              { 
                                key: 'rma', 
                                header: 'RMA#',
                                width: '120px'
                              },
                              { 
                                key: 'customer', 
                                header: 'Customer',
                                render: (row: any) => (
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{row.customerName}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                                      {row.customerEmail}
                                    </div>
                                  </div>
                                )
                              },
                              { key: 'reason', header: 'Reason' },
                              { 
                                key: 'amount', 
                                header: 'Amount',
                                width: '120px',
                                render: (row: any) => (
                                  <span style={{ fontWeight: 600, color: 'var(--color-error)' }}>
                                    ¥{row.refundAmount.toLocaleString()}
                                  </span>
                                )
                              },
                              { 
                                key: 'date', 
                                header: 'Requested',
                                width: '150px',
                                render: (row: any) => (
                                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                                    {new Date(row.requestedAt).toLocaleDateString()}
                                  </span>
                                )
                              },
                              {
                                key: 'actions',
                                header: 'Actions',
                                width: '180px',
                                render: (row: any) => (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedReturn(row);
                                        setShowDetailModal(true);
                                      }}
                                    >
                                      Details
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="success"
                                      onClick={() => {
                                        setSelectedReturn(row);
                                        setRefundAmount(row.refundAmount);
                                        setShowProcessModal(true);
                                      }}
                                    >
                                      Process
                                    </Button>
                                  </div>
                                )
                              }
                            ]}
                            data={returns.filter(r => r.status === 'PENDING')}
                          />
                        </div>
                      )
                    },
                    {
                      id: 'approved',
                      label: 'Approved',
                      icon: '✅',
                      badge: stats.approved,
                      content: (
                        <div style={{ padding: '24px' }}>
                          <Table
                            columns={[
                              { key: 'rma', header: 'RMA#', width: '120px', render: (row: any) => row.rmaNumber },
                              { 
                                key: 'customer', 
                                header: 'Customer',
                                render: (row: any) => row.customerName
                              },
                              { 
                                key: 'amount', 
                                header: 'Refund Amount',
                                width: '120px',
                                render: (row: any) => `¥${row.refundAmount.toLocaleString()}`
                              },
                              { 
                                key: 'approved', 
                                header: 'Approved',
                                width: '150px',
                                render: (row: any) => new Date(row.approvedAt).toLocaleDateString()
                              },
                              {
                                key: 'actions',
                                header: 'Actions',
                                width: '140px',
                                render: (row: any) => (
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => handleCompleteReturn(row.id)}
                                    disabled={loading}
                                  >
                                    Complete
                                  </Button>
                                )
                              }
                            ]}
                            data={returns.filter(r => r.status === 'APPROVED')}
                          />
                        </div>
                      )
                    },
                    {
                      id: 'all',
                      label: 'All Returns',
                      icon: '📋',
                      badge: returns.length,
                      content: (
                        <div style={{ padding: '24px' }}>
                          <Table
                            columns={[
                              { key: 'rma', header: 'RMA#', width: '120px', render: (row: any) => row.rmaNumber },
                              { key: 'customer', header: 'Customer', render: (row: any) => row.customerName },
                              { key: 'reason', header: 'Reason' },
                              { 
                                key: 'status', 
                                header: 'Status',
                                width: '120px',
                                render: (row: any) => (
                                  <Badge variant={getStatusColor(row.status) as any}>
                                    {row.status}
                                  </Badge>
                                )
                              },
                              { 
                                key: 'amount', 
                                header: 'Amount',
                                width: '120px',
                                render: (row: any) => `¥${row.refundAmount.toLocaleString()}`
                              },
                              { 
                                key: 'date', 
                                header: 'Requested',
                                width: '130px',
                                render: (row: any) => new Date(row.requestedAt).toLocaleDateString()
                              }
                            ]}
                            data={returns}
                          />
                        </div>
                      )
                    }
                  ]}
                />
              ) : (
                <EmptyState
                  icon="🔄"
                  title={t("noReturnsFound")}
                  description={t("descriptionReturnRequests")}
                />
              )}
            </>
          )}
        </Card>
      </div>

      {/* Return Detail Modal */}
      {selectedReturn && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedReturn(null);
          }}
          title={`Return Details - ${selectedReturn.rmaNumber}`}
        >
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label">Customer</label>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{selectedReturn.customerName}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {selectedReturn.customerEmail}
                </div>
              </div>
              
              <div>
                <label className="label">Order ID</label>
                <div style={{ fontSize: '15px' }}>{selectedReturn.shopOrderId}</div>
              </div>
              
              <div>
                <label className="label">Return Reason</label>
                <div style={{ fontSize: '15px' }}>{selectedReturn.reason}</div>
              </div>
              
              <div>
                <label className="label">Refund Amount</label>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-error)' }}>
                  ¥{selectedReturn.refundAmount.toLocaleString()}
                </div>
              </div>
              
              <div>
                <label className="label">Status</label>
                <Badge variant={getStatusColor(selectedReturn.status) as any}>
                  {selectedReturn.status}
                </Badge>
              </div>
              
              {selectedReturn.notes && (
                <div>
                  <label className="label">Notes</label>
                  <div style={{ 
                    padding: '12px', 
                    background: 'var(--color-elevated)', 
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px'
                  }}>
                    {selectedReturn.notes}
                  </div>
                </div>
              )}
              
              <div className="grid grid-2" style={{ gap: '12px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                <div>
                  <strong>Requested:</strong> {new Date(selectedReturn.requestedAt).toLocaleString()}
                </div>
                {selectedReturn.approvedAt && (
                  <div>
                    <strong>Approved:</strong> {new Date(selectedReturn.approvedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Process Return Modal */}
      <Modal
        isOpen={showProcessModal}
        onClose={() => {
          setShowProcessModal(false);
          setSelectedReturn(null);
          setProcessNotes("");
        }}
        title={t("processReturnRequest")}
      >
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedReturn && (
            <Alert variant="info">
              Processing return for <strong>{selectedReturn.customerName}</strong> ({selectedReturn.rmaNumber})
            </Alert>
          )}
          
          <Select
            label="Action"
            value={processAction}
            onChange={(e) => setProcessAction(e.target.value as any)}
            options={[
              { value: 'APPROVE', label: '✅ Approve Return' },
              { value: 'REJECT', label: '❌ Reject Return' }
            ]}
          />
          
          {processAction === 'APPROVE' && (
            <Input
              label="Refund Amount (¥)"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
            />
          )}
          
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              value={processNotes}
              onChange={(e) => setProcessNotes(e.target.value)}
              placeholder={t("addInternalNotes")}
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button
              onClick={handleProcessReturn}
              disabled={loading}
              variant={processAction === 'APPROVE' ? 'success' : 'danger'}
              fullWidth
            >
              {loading ? 'Processing...' : `${processAction === 'APPROVE' ? 'Approve' : 'Reject'} Return`}
            </Button>
            <Button
              onClick={() => setShowProcessModal(false)}
              variant="ghost"
              fullWidth
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"]))
    }
  };
}
