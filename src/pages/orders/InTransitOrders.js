import React, { useState } from 'react';
import { Button, Empty, Spin, message } from 'antd';
import { useOrders } from '../../hooks/useOrders';
import OrderCard from '../../components/orders/OrderCard';
import { updateOrderStatus } from '../../utils/orderUtils';

const InTransitOrders = () => {
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const { 
    orders, 
    loading, 
    error, 
    hasMore, 
    isLoadingMore, 
    loadMore, 
    refreshOrders 
  } = useOrders('in-transit');

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      setUpdatingOrder(orderId);
      const result = await updateOrderStatus(orderId, newStatus);
      
      if (result.success) {
        message.success(`Order marked as ${newStatus.replace(/[_-]/g, ' ')}`);
        refreshOrders();
      } else {
        throw new Error(result.error?.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      message.error(error.message || 'Failed to update order status');
    } finally {
      setUpdatingOrder(null);
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
            <span className="text-gray-500">No orders in transit</span>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-end items-center">
        <Button onClick={refreshOrders} loading={loading}>
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            status="in-transit"
            onStatusUpdate={handleStatusUpdate}
            loading={updatingOrder === order.id}
          />
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

export default InTransitOrders;
