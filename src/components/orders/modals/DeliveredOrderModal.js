import React from 'react';
import { Modal, Divider } from 'antd';
import OrderSummary from '../shared/OrderSummary';
import CustomerInfo from '../shared/CustomerInfo';
import AddressBlock from '../shared/AddressBlock';
import '../OrderDetailsModal.mobile.css';

const DeliveredOrderModal = ({ order, visible, onClose }) => {
  if (!order) return null;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <Modal
      title={`Order #${order.orderNumber || order.id.substring(0, 8)} — Delivered`}
      open={visible}
      onCancel={onClose}
      width={isMobile ? '100%' : 720}
      className={isMobile ? 'order-details-modal-mobile' : 'order-details-modal'}
      styles={isMobile ? { body: { padding: 12, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' } } : {}}
      footer={null}
    >
      <div className="space-y-4">
        <OrderSummary order={order} />
        <Divider />
        <CustomerInfo order={order} />
        <Divider />
        <AddressBlock order={order} />
      </div>
    </Modal>
  );
};

export default DeliveredOrderModal;
