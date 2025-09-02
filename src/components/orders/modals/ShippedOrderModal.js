import React from 'react';
import { Modal, Button, Divider } from 'antd';
import OrderSummary from '../shared/OrderSummary';
import CustomerInfo from '../shared/CustomerInfo';
import AddressBlock from '../shared/AddressBlock';
import '../OrderDetailsModal.mobile.css';

const ShippedOrderModal = ({
  order,
  visible,
  onClose,
  onMoveToInTransit,
  loading = false,
  updating = false,
}) => {
  if (!order) return null;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <Modal
      title={`Order #${order.orderNumber || order.id.substring(0, 8)} — Shipped`}
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

        <div className="mobile-sticky-actions flex justify-end gap-2 mt-2">
          <Button type="primary" onClick={() => onMoveToInTransit(order)} loading={updating}>
            Move to In Transit
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ShippedOrderModal;
