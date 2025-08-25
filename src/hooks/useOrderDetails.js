import { useState } from 'react';
import { message } from 'antd';
import { updateOrderStatus as updateOrderStatusUtil } from '../utils/orderUtils';

export const useOrderDetails = () => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const showOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsModalVisible(true);
  };

  const hideOrderDetails = () => {
    setIsModalVisible(false);
    setSelectedOrder(null);
  };

  const updateOrderStatus = async (orderId, status, notes = '') => {
    if (!orderId) return false;
    setUpdating(true);
    try {
      const result = await updateOrderStatusUtil(orderId, status, notes ? { notes } : {});
      if (result?.success) {
        message.success(`Order marked as ${status}`);
        return true;
      }
      throw result?.error || new Error('Failed to update order status');
    } catch (error) {
      console.error('Error updating order status:', error);
      message.error('Failed to update order status');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return {
    selectedOrder,
    isModalVisible,
    loading,
    updating,
    showOrderDetails,
    hideOrderDetails,
    updateOrderStatus,
  };
};

export default useOrderDetails;
