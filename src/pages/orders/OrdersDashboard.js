import React from 'react';
import { Tabs, Badge, Typography, Space, Tag, Button, Card, Empty, Spin, Input } from 'antd';
import { ClockCircleOutlined, Loading3QuartersOutlined, RocketOutlined, CarOutlined, CheckCircleOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import { useOrders, useOrderCounts } from '../../hooks/useOrders';
import BackButton from '../../components/BackButton';
import TopNavBar from '../../components/TopNavBar';
import useOrderDetails from '../../hooks/useOrderDetails';
import OrderDetailsModal from '../../components/orders/OrderDetailsModal';
import PendingOrderModal from '../../components/orders/modals/PendingOrderModal';
import ProcessingOrderModal from '../../components/orders/modals/ProcessingOrderModal';
import ShippedOrderModal from '../../components/orders/modals/ShippedOrderModal';
import InTransitOrderModal from '../../components/orders/modals/InTransitOrderModal';
import DeliveredOrderModal from '../../components/orders/modals/DeliveredOrderModal';
import CancelledOrderModal from '../../components/orders/modals/CancelledOrderModal';
import ReturnedOrderModal from '../../components/orders/modals/ReturnedOrderModal';
import { format } from 'date-fns';

const statusColors = {
  pending: 'orange',
  processing: 'blue',
  shipped: 'cyan',
  'in-transit': 'geekblue',
  delivered: 'green',
  returned: 'purple',
  cancelled: 'red',
};
const paymentStatusColors = { pending: 'orange', paid: 'green', refunded: 'purple', failed: 'red' };
const statusAccent = {
  pending: '#fa8c16', processing: '#1677ff', shipped: '#13c2c2', 'in-transit': '#2f54eb', delivered: '#52c41a', returned: '#722ed1', cancelled: '#f5222d'
};

const StatusTab = ({ status, title, refreshSignal, searchQuery }) => {
  const { orders, loading, error, hasMore, isLoadingMore, loadMore, refreshOrders } = useOrders(status);
  const { selectedOrder, isModalVisible, showOrderDetails, hideOrderDetails, updateOrderStatus, updating } = useOrderDetails();

  React.useEffect(() => {
    if (refreshSignal === undefined) return;
    refreshOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  const [defaultTab, setDefaultTab] = React.useState('details');
  const [viewMode, setViewMode] = React.useState('status');

  const handleStatusUpdate = async (orderId, newStatus, notes) => {
    const success = await updateOrderStatus(orderId, newStatus, notes);
    if (success) refreshOrders();
    return success;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const jsDate = date.toDate ? date.toDate() : new Date(date);
      return format(jsDate, 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  if (loading && !orders.length) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;
  }
  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button type="primary" onClick={refreshOrders}>Retry</Button>
      </div>
    );
  }
  if (!orders.length) {
    return <div className="text-center p-8"><Empty description={<span className="text-gray-500">No {title.toLowerCase()} found</span>} /></div>;
  }

  const filtered = React.useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const id = String(o.orderNumber || o.id || '').toLowerCase();
      const name = String(o.userProfile?.fullName || '').toLowerCase();
      const phone = String(o.userProfile?.number || o.userProfile?.phone || '').toLowerCase();
      return id.includes(q) || name.includes(q) || phone.includes(q);
    });
  }, [orders, searchQuery]);

  return (
    <div className="space-y-3 md:space-y-4">
      <style>{`
        @media (max-width: 420px) {
          .order-card .ant-card-actions { display: block; }
          .order-card .ant-card-actions > li { display: block; border-right: 0 !important; }
          .order-card .ant-card-actions > li > span { display: block; padding: 8px 16px; text-align: center; }
        }
      `}</style>

      {isModalVisible && selectedOrder && (
        viewMode === 'packing' ? (
          <OrderDetailsModal
            order={selectedOrder}
            visible={isModalVisible}
            onClose={() => { setDefaultTab('details'); setViewMode('status'); hideOrderDetails(); }}
            onStatusUpdate={handleStatusUpdate}
            loading={loading}
            updating={updating}
            defaultTab={defaultTab}
          />
        ) : selectedOrder.status === 'pending' ? (
          <PendingOrderModal
            order={selectedOrder}
            visible={isModalVisible}
            onClose={() => { setDefaultTab('details'); hideOrderDetails(); }}
            onMoveToProcessing={async (order) => { await handleStatusUpdate(order.id, 'processing'); hideOrderDetails(); }}
            onCancelOrder={async (order) => { await handleStatusUpdate(order.id, 'cancelled'); hideOrderDetails(); }}
            loading={loading}
            updating={updating}
          />
        ) : selectedOrder.status === 'processing' ? (
          <ProcessingOrderModal
            order={selectedOrder}
            visible={isModalVisible}
            onClose={() => { setDefaultTab('details'); hideOrderDetails(); }}
            onStartPacking={() => { setDefaultTab('packing'); setViewMode('packing'); }}
            onMoveToShipped={async (order) => { await handleStatusUpdate(order.id, 'shipped'); hideOrderDetails(); }}
            loading={loading}
            updating={updating}
          />
        ) : selectedOrder.status === 'shipped' ? (
          <ShippedOrderModal
            order={selectedOrder}
            visible={isModalVisible}
            onClose={() => { setDefaultTab('details'); hideOrderDetails(); }}
            onMoveToInTransit={async (order) => { await handleStatusUpdate(order.id, 'in-transit'); hideOrderDetails(); }}
            loading={loading}
            updating={updating}
          />
        ) : selectedOrder.status === 'in-transit' ? (
          <InTransitOrderModal
            order={selectedOrder}
            visible={isModalVisible}
            onClose={() => { setDefaultTab('details'); hideOrderDetails(); }}
            onMoveToDelivered={async (order) => { await handleStatusUpdate(order.id, 'delivered'); hideOrderDetails(); }}
            loading={loading}
            updating={updating}
          />
        ) : selectedOrder.status === 'delivered' ? (
          <DeliveredOrderModal order={selectedOrder} visible={isModalVisible} onClose={() => { setDefaultTab('details'); hideOrderDetails(); }} />
        ) : selectedOrder.status === 'cancelled' ? (
          <CancelledOrderModal order={selectedOrder} visible={isModalVisible} onClose={() => { setDefaultTab('details'); hideOrderDetails(); }} />
        ) : selectedOrder.status === 'returned' ? (
          <ReturnedOrderModal order={selectedOrder} visible={isModalVisible} onClose={() => { setDefaultTab('details'); hideOrderDetails(); }} />
        ) : null
      )}

      <div className="space-y-3 md:space-y-4 relative z-0">
        {filtered.map((order) => (
          <Card
            key={order.id}
            className="order-card hover:shadow-lg transition-shadow duration-200"
            style={{ borderLeft: `4px solid ${statusAccent[order.status] || 'transparent'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
            actions={[
              <Button type="link" size="small" key="view" onClick={() => { setDefaultTab('details'); setViewMode('status'); showOrderDetails(order); }}>View Details</Button>,
              <Button type="link" size="small" key="pack" onClick={() => { setDefaultTab('packing'); setViewMode('packing'); showOrderDetails(order); }}>Start Packing</Button>,
              (() => {
                const nextMap = { pending: { label: 'Move to Processing', to: 'processing' }, processing: { label: 'Move to Shipped', to: 'shipped' }, shipped: { label: 'Move to In-Transit', to: 'in-transit' }, 'in-transit': { label: 'Mark Delivered', to: 'delivered' } };
                const nx = nextMap[order.status];
                return nx ? (
                  <Button type="link" size="small" key="quick" onClick={async () => { await handleStatusUpdate(order.id, nx.to); }}>
                    {nx.label}
                  </Button>
                ) : <span key="spacer" />;
              })()
            ]}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-500">Order #</div>
                  <div className="text-base font-medium">{order.orderNumber || order.id.substring(0, 8)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="text-lg font-semibold">₹{order.total?.toFixed(2) || '0.00'}</div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-gray-600 truncate">
                  {formatDate(order.createdAt)} • {order.userProfile?.fullName || 'Guest'}
                </div>
                <div className="flex items-center gap-2">
                  <Tag color={statusColors[order.status] || 'default'}>{order.status?.toUpperCase()}</Tag>
                  <Tag color={paymentStatusColors[order.paymentStatus] || 'default'}>{order.paymentStatus?.toUpperCase() || 'N/A'}</Tag>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-6">
          <Button onClick={loadMore} loading={isLoadingMore} type="primary">Load More Orders</Button>
        </div>
      )}
    </div>
  );
};

const OrdersDashboard = () => {
  const { counts } = useOrderCounts();
  const [activeKey, setActiveKey] = React.useState('pending');
  const [refreshTick, setRefreshTick] = React.useState(0);
  const [query, setQuery] = React.useState('');

  const items = [
    {
      key: 'pending',
      label: (
        <Space>
          <ClockCircleOutlined />
          <span>Pending</span>
          <Badge count={counts.pending} overflowCount={999} />
        </Space>
      ),
      children: <StatusTab status="pending" title="Pending Orders" refreshSignal={refreshTick} searchQuery={query} />,
    },
    {
      key: 'processing',
      label: (
        <Space>
          <Loading3QuartersOutlined />
          <span>Processing</span>
          <Badge count={counts.processing} overflowCount={999} />
        </Space>
      ),
      children: <StatusTab status="processing" title="Processing Orders" refreshSignal={refreshTick} searchQuery={query} />,
    },
    {
      key: 'shipped',
      label: (
        <Space>
          <RocketOutlined />
          <span>Shipped</span>
          <Badge count={counts.shipped} overflowCount={999} />
        </Space>
      ),
      children: <StatusTab status="shipped" title="Shipped Orders" refreshSignal={refreshTick} searchQuery={query} />,
    },
    {
      key: 'in-transit',
      label: (
        <Space>
          <CarOutlined />
          <span>In-Transit</span>
          <Badge count={counts['in-transit']} overflowCount={999} />
        </Space>
      ),
      children: <StatusTab status="in-transit" title="In-Transit Orders" refreshSignal={refreshTick} searchQuery={query} />,
    },
    {
      key: 'delivered',
      label: (
        <Space>
          <CheckCircleOutlined />
          <span>Delivered</span>
          <Badge count={counts.delivered} overflowCount={999} />
        </Space>
      ),
      children: <StatusTab status="delivered" title="Delivered Orders" refreshSignal={refreshTick} searchQuery={query} />,
    },
    {
      key: 'cancelled',
      label: (
        <Space>
          <StopOutlined />
          <span>Cancelled</span>
          <Badge count={counts.cancelled} overflowCount={999} />
        </Space>
      ),
      children: <StatusTab status="cancelled" title="Cancelled Orders" refreshSignal={refreshTick} searchQuery={query} />,
    },
    {
      key: 'returned',
      label: (
        <Space>
          <UndoOutlined />
          <span>Returned</span>
          <Badge count={counts.returned} overflowCount={999} />
        </Space>
      ),
      children: <StatusTab status="returned" title="Returned Orders" refreshSignal={refreshTick} searchQuery={query} />,
    },
  ];

  return (
    <div className="p-0">
      <TopNavBar onLogout={() => {}} />
      <div className="p-2 md:p-4">
        {/* Sticky search + back bar */}
        <div
          className="sticky top-0 z-30"
          style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '8px 0' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BackButton label="Back to Home" to="/" />
            <Typography.Title level={4} style={{ margin: 0 }}>Order Management</Typography.Title>
            <div className="ml-auto">
              <Button onClick={() => setRefreshTick((v) => v + 1)}>Refresh</Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Input.Search
              allowClear
              placeholder="Search by order #, name, phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, minHeight: 44 }}
              enterButton
            />
          </div>
        </div>

        {/* Counts chips */}
        <div className="mb-2 md:mb-3 mt-3">
          <style>{`
            .touch-chip .ant-tag { padding: 6px 10px; font-size: 13px; }
          `}</style>
          <Space wrap className="touch-chip">
            <Tag color="default">All: {counts.all || 0}</Tag>
            <Tag color="orange">Pending: {counts.pending || 0}</Tag>
            <Tag color="blue">Processing: {counts.processing || 0}</Tag>
            <Tag color="cyan">Shipped: {counts.shipped || 0}</Tag>
            <Tag color="geekblue">In-Transit: {counts['in-transit'] || 0}</Tag>
            <Tag color="green">Delivered: {counts.delivered || 0}</Tag>
            <Tag color="red">Cancelled: {counts.cancelled || 0}</Tag>
            <Tag color="purple">Returned: {counts.returned || 0}</Tag>
          </Space>
        </div>
        {/* Status tabs directly below search bar */}
        <div style={{ overflowX: 'auto' }}>
          <style>{`
            .ant-tabs-top > .ant-tabs-nav .ant-tabs-tab { padding: 10px 14px; }
            @media (max-width: 480px) {
              .ant-tabs-top > .ant-tabs-nav .ant-tabs-tab { padding: 12px 16px; }
            }
          `}</style>
          <Tabs
            size="large"
            activeKey={activeKey}
            onChange={(k) => setActiveKey(k)}
            destroyInactiveTabPane
            tabBarGutter={8}
            items={items}
          />
        </div>
      </div>
    </div>
  );
};

export default OrdersDashboard;
