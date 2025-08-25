import React from 'react';
import { Button, Empty, Spin } from 'antd';
import { useOrders } from '../../hooks/useOrders';
import OrderCard from '../../components/orders/OrderCard';

const DeliveredOrders = () => {
  const { 
    orders, 
    loading, 
    error, 
    hasMore, 
    isLoadingMore, 
    loadMore, 
    refreshOrders 
  } = useOrders('delivered');

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
            <span className="text-gray-500">No delivered orders found</span>
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
            status="delivered"
            showActions={false}
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

export default DeliveredOrders;
