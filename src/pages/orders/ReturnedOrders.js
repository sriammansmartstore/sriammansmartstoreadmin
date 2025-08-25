import React, { useState } from 'react';
import { Button, Empty, Spin, message, Select, Input, Modal, Tag } from 'antd';
import { useOrders } from '../../hooks/useOrders';
import OrderCard from '../../components/orders/OrderCard';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';

const { Option } = Select;
const { TextArea } = Input;

const ReturnedOrders = () => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [returnStatus, setReturnStatus] = useState('processing');
  const [returnNotes, setReturnNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  
  const { 
    orders, 
    loading, 
    error, 
    hasMore, 
    isLoadingMore, 
    loadMore, 
    refreshOrders 
  } = useOrders('returned');

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setReturnStatus(order.returnStatus || 'processing');
    setReturnNotes(order.returnNotes || '');
    setIsModalVisible(true);
  };

  const handleReturnStatusUpdate = async () => {
    if (!selectedOrder) return;
    
    setUpdating(true);
    try {
      const updateData = {
        returnStatus,
        returnNotes,
        returnUpdatedAt: new Date()
      };
      
      if (returnStatus === 'completed') {
        updateData.refundStatus = 'refunded';
        updateData.refundedAt = new Date();
      }
      
      await updateDoc(doc(db, 'orders', selectedOrder.id), updateData);
      
      message.success('Return status updated successfully');
      refreshOrders();
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error updating return status:', error);
      message.error('Failed to update return status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
      approved: { color: 'bg-yellow-100 text-yellow-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      refunded: { color: 'bg-green-100 text-green-800', label: 'Refunded' },
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
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
            <span className="text-gray-500">No returned orders found</span>
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
          <div key={order.id} className="cursor-pointer" onClick={() => handleViewOrder(order)}>
            <OrderCard
              order={order}
              status="returned"
              showActions={false}
            />
          </div>
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

      <Modal
        title={`Process Return #${selectedOrder?.id?.substring(0, 8)}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={updating}
            onClick={handleReturnStatusUpdate}
          >
            Update Return Status
          </Button>,
        ]}
        width={800}
      >
        {selectedOrder && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="font-semibold mb-2">Customer Details</h3>
                <p>{selectedOrder.userProfile?.fullName || 'N/A'}</p>
                <p>{selectedOrder.address?.address || 'N/A'}</p>
                <p>{selectedOrder.address?.city}, {selectedOrder.address?.state} - {selectedOrder.address?.pincode}</p>
                <p>Phone: {selectedOrder.userProfile?.number || 'N/A'}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Return Details</h3>
                <p>Order Date: {selectedOrder.createdAt?.toDate ? format(selectedOrder.createdAt.toDate(), 'PPpp') : 'N/A'}</p>
                <p>Return Requested: {selectedOrder.returnRequestedAt?.toDate ? format(selectedOrder.returnRequestedAt.toDate(), 'PPpp') : 'N/A'}</p>
                <p>Status: {getStatusBadge(selectedOrder.returnStatus || 'processing')}</p>
                <p>Payment Method: {selectedOrder.paymentMethod || 'N/A'}</p>
                <p>Total Amount: ₹{selectedOrder.total?.toFixed(2) || '0.00'}</p>
                <p>
                  Refund Status: {' '}
                  <Tag color={selectedOrder.refundStatus === 'refunded' ? 'success' : 'error'}>
                    {(selectedOrder.refundStatus || 'pending').toUpperCase()}
                  </Tag>
                </p>
                {selectedOrder.returnReason && (
                  <p className="mt-2">
                    <span className="font-medium">Return Reason:</span>{' '}
                    {selectedOrder.returnReason}
                  </p>
                )}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block font-medium mb-2">Update Return Status</label>
              <Select
                value={returnStatus}
                onChange={setReturnStatus}
                className="w-full mb-4"
              >
                <Option value="processing">Processing</Option>
                <Option value="approved">Approved</Option>
                <Option value="rejected">Rejected</Option>
                <Option value="completed">Completed</Option>
              </Select>
              
              <label className="block font-medium mb-2">Notes</label>
              <TextArea
                rows={4}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Add any notes about this return..."
              />
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Order Items</h3>
              <div className="border rounded divide-y">
                {selectedOrder.cartItems?.map((item, index) => (
                  <div key={index} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-gray-600 text-sm">Qty: {item.quantity}</p>
                      {item.returnedQuantity && (
                        <p className="text-gray-600 text-sm">
                          Returned: {item.returnedQuantity}
                        </p>
                      )}
                    </div>
                    <p className="font-medium">₹{item.sellingPrice?.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReturnedOrders;
