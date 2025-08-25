import React from 'react';
import { Empty, Spin, Button, Card, Tag, Space, Typography } from 'antd';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import OrderDetailsModal from '../../components/orders/OrderDetailsModal';
import useOrderDetails from '../../hooks/useOrderDetails';

const { Text } = Typography;

const statusColors = {
  pending: 'orange',
  processing: 'blue',
  shipped: 'cyan',
  'in-transit': 'geekblue',
  delivered: 'green',
  returned: 'purple',
  cancelled: 'red',
};

const paymentStatusColors = {
  pending: 'orange',
  paid: 'green',
  refunded: 'purple',
  failed: 'red',
};

const BaseOrderPage = ({ 
  status, 
  title, 
  orders, 
  loading, 
  error, 
  hasMore, 
  isLoadingMore, 
  loadMore, 
  refreshOrders 
}) => {
  const {
    selectedOrder,
    isModalVisible,
    showOrderDetails,
    hideOrderDetails,
    updateOrderStatus,
    updating
  } = useOrderDetails();

  const handleStatusUpdate = async (orderId, newStatus, notes) => {
    const success = await updateOrderStatus(orderId, newStatus, notes);
    if (success) {
      refreshOrders();
    }
    return success;
  };
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const jsDate = date.toDate ? date.toDate() : new Date(date);
      return format(jsDate, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  if (loading && !orders.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button type="primary" onClick={refreshOrders}>
          Retry
        </Button>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="text-center p-8">
        <Empty 
          description={
            <span className="text-gray-500">No {title.toLowerCase()} found</span>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Heading removed as requested; keeping quick refresh above list if needed */}
      <div className="flex justify-end mb-2 md:mb-4">
        <Button size="small" onClick={refreshOrders} loading={loading}>Refresh</Button>
      </div>

      <OrderDetailsModal
        order={selectedOrder}
        visible={isModalVisible}
        onClose={hideOrderDetails}
        onStatusUpdate={handleStatusUpdate}
        loading={loading}
        updating={updating}
      />

      <div className="space-y-3 md:space-y-4 relative z-0">
        {orders.map((order) => (
          <Card 
            key={order.id}
            className="hover:shadow-lg transition-shadow duration-200"
            actions={[
              <Button type="link" size="small" key="view" onClick={() => showOrderDetails(order)}>View Details</Button>
            ]}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div>
                <Text strong>Order #</Text>
                <p>{order.orderNumber || order.id.substring(0, 8)}</p>
              </div>
              <div>
                <Text strong>Date</Text>
                <p>{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <Text strong>Customer</Text>
                <p>{order.userProfile?.fullName || 'Guest'}</p>
              </div>
              <div>
                <Text strong>Status</Text>
                <div className="mt-1">
                  <div key={order.id} className="cursor-pointer" onClick={() => showOrderDetails(order)}>
                    <Tag color={statusColors[order.status] || 'default'}>
                      {order.status?.toUpperCase()}
                    </Tag>
                  </div>
                </div>
              </div>
              <div>
                <Text strong>Payment</Text>
                <div className="mt-1">
                  <Tag color={paymentStatusColors[order.paymentStatus] || 'default'}>
                    {order.paymentStatus?.toUpperCase() || 'N/A'}
                  </Tag>
                </div>
              </div>
              <div className="md:text-right">
                <Text strong>Total</Text>
                <p className="text-lg font-semibold">
                  ₹{order.total?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>

            {/* Quick actions for mobile usability */}
            <div className="mt-3 flex flex-wrap gap-2">
              {(() => {
                const s = order.status;
                const btnProps = { size: 'small' };
                if (s === 'pending') {
                  return (
                    <>
                      <Button {...btnProps} onClick={() => handleStatusUpdate(order.id, 'processing')}>Mark as Processing</Button>
                      <Button type="primary" {...btnProps} onClick={() => handleStatusUpdate(order.id, 'shipped')}>Mark as Shipped</Button>
                      <Button danger {...btnProps} onClick={() => handleStatusUpdate(order.id, 'cancelled')}>Cancel</Button>
                    </>
                  );
                }
                if (s === 'processing') {
                  return (
                    <>
                      <Button type="primary" {...btnProps} onClick={() => handleStatusUpdate(order.id, 'shipped')}>Mark as Shipped</Button>
                      <Button danger {...btnProps} onClick={() => handleStatusUpdate(order.id, 'cancelled')}>Cancel</Button>
                    </>
                  );
                }
                if (s === 'shipped') {
                  return (
                    <Button type="primary" {...btnProps} onClick={() => handleStatusUpdate(order.id, 'in-transit')}>Move to In Transit</Button>
                  );
                }
                if (s === 'in-transit') {
                  return (
                    <Button type="primary" {...btnProps} onClick={() => handleStatusUpdate(order.id, 'delivered')}>Mark as Delivered</Button>
                  );
                }
                if (s === 'delivered') {
                  return (
                    <Button {...btnProps} onClick={() => handleStatusUpdate(order.id, 'returned')}>Move to Returned</Button>
                  );
                }
                return null;
              })()}
            </div>
          </Card>
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-6">
          <Button 
            onClick={loadMore} 
            loading={isLoadingMore}
            type="primary"
          >
            Load More Orders
          </Button>
        </div>
      )}
    </div>
  );
};

export default BaseOrderPage;
