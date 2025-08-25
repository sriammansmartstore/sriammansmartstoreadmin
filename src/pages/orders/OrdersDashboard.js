import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Card, Statistic, Row, Col, Badge } from 'antd';
import {
  ShoppingCartOutlined,
  ClockCircleOutlined,
  TruckOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UndoOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { db } from '../../firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import OrderManagementLayout from '../../components/layouts/OrderManagementLayout';
import BaseOrderPage from './BaseOrderPage';
import useOrderManagement from '../../hooks/useOrderManagement';

// Dashboard Statistics Component
const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total orders
        const ordersQuery = query(collection(db, 'orders'));
        const ordersSnapshot = await getCountFromServer(ordersQuery);
        
        // Get orders by status
        const statusCounts = {};
        const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
        
        for (const status of statuses) {
          const q = query(collection(db, 'orders'), where('status', '==', status));
          const snapshot = await getCountFromServer(q);
          statusCounts[status] = snapshot.data().count;
        }
        
        // Calculate revenue (this is a simplified example)
        // In a real app, you'd want to sum the order totals
        const revenueQuery = query(
          collection(db, 'orders'),
          where('status', 'in', ['delivered', 'completed'])
        );
        const revenueSnapshot = await getCountFromServer(revenueQuery);
        
        setStats({
          totalOrders: ordersSnapshot.data().count,
          pending: statusCounts.pending || 0,
          processing: statusCounts.processing || 0,
          completed: statusCounts.delivered || 0,
          revenue: revenueSnapshot.data().count * 1000 // Placeholder calculation
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Order Dashboard</h2>
      
      <Row gutter={[16, 16]} className="mb-6 overflow-hidden">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={stats.totalOrders}
              prefix={<ShoppingCartOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              loading={loading}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Processing"
              value={stats.processing}
              prefix={<SyncOutlined spin />}
              loading={loading}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              loading={loading}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>
      
      <Card title="Recent Orders" className="mb-6 overflow-hidden">
        <RecentOrdersPreview />
      </Card>
    </div>
  );
};

// Recent Orders Preview Component
const RecentOrdersPreview = () => {
  const { 
    orders, 
    loading, 
    error, 
    hasMore, 
    isLoadingMore, 
    loadMore, 
    refreshOrders 
  } = useOrderManagement('dashboard');

  if (loading && !orders.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <SyncOutlined spin className="text-2xl text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-red-500 mb-2">{error}</p>
        <button 
          onClick={refreshOrders}
          className="text-blue-500 hover:underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!orders.length) {
    return <div className="text-center p-4 text-gray-500">No recent orders found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.slice(0, 5).map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.orderNumber || `#${order.id.substring(0, 8)}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.userProfile?.fullName || 'Guest'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge 
                    status={getStatusBadgeStatus(order.status)}
                    text={order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'N/A'}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{order.total?.toFixed(2) || '0.00'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(order.createdAt?.toDate()).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="text-center mt-4">
        <button
          onClick={() => window.location.href = '/orders/pending'}
          className="text-blue-600 hover:underline"
        >
          View All Orders
        </button>
      </div>
    </div>
  );
};

// Helper function to get badge status
const getStatusBadgeStatus = (status) => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'processing':
    case 'shipped':
      return 'processing';
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'error';
    case 'returned':
      return 'default';
    default:
      return 'default';
  }
};

// Reusable Order Status Page Component
const OrderStatusPage = ({ status, title }) => {
  const { 
    orders, 
    loading, 
    error, 
    hasMore, 
    isLoadingMore, 
    loadMore, 
    refreshOrders 
  } = useOrderManagement(status);

  return (
    <BaseOrderPage
      status={status}
      title={title}
      orders={orders}
      loading={loading}
      error={error}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      loadMore={loadMore}
      refreshOrders={refreshOrders}
    />
  );
};

// Main Dashboard Component
const OrdersDashboard = () => {
  return (
    <OrderManagementLayout>
      <Routes>
        <Route path="/" element={<DashboardStats />} />
        <Route path="/dashboard" element={<DashboardStats />} />
        <Route path="/pending" element={<OrderStatusPage status="pending" title="Pending Orders" />} />
        <Route path="/processing" element={<OrderStatusPage status="processing" title="Processing Orders" />} />
        <Route path="/shipped" element={<OrderStatusPage status="shipped" title="Shipped Orders" />} />
        <Route path="/in-transit" element={<OrderStatusPage status="in-transit" title="Orders In Transit" />} />
        <Route path="/delivered" element={<OrderStatusPage status="delivered" title="Delivered Orders" />} />
        <Route path="/cancelled" element={<OrderStatusPage status="cancelled" title="Cancelled Orders" />} />
        <Route path="/returned" element={<OrderStatusPage status="returned" title="Returned Orders" />} />
      </Routes>
    </OrderManagementLayout>
  );
};

export default OrdersDashboard;
