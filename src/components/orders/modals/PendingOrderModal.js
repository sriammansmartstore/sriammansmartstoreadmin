import React from 'react';
import { Modal, Button, Divider } from 'antd';
import CustomerInfo from '../shared/CustomerInfo';
import AddressBlock from '../shared/AddressBlock';
import { format } from 'date-fns';

const PendingOrderModal = ({
  order,
  visible,
  onClose,
  onMoveToProcessing,
  onCancelOrder,
  loading = false,
  updating = false,
}) => {
  if (!order) return null;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <Modal
      title={`Pending — Order #${order.orderNumber || order.id.substring(0, 8)}`}
      open={visible}
      onCancel={onClose}
      width={isMobile ? '100%' : 720}
      className={isMobile ? 'order-details-modal-mobile' : 'order-details-modal'}
      styles={isMobile ? { body: { padding: 12, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' } } : {}}
      footer={null}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Order Info</h3>
          <div className="bg-gray-50 p-4 rounded text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <div className="text-gray-600">Order Date & Time</div>
              <div className="font-medium">
                {(() => {
                  const d = order.createdAt?.toDate ? order.createdAt.toDate() : (order.createdAt ? new Date(order.createdAt) : null);
                  return d ? format(d, 'MMM d, yyyy h:mm a') : 'N/A';
                })()}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Payment</div>
              <div className="font-medium">{(order.paymentMethod || 'N/A')} • {(order.paymentStatus || 'pending').toUpperCase()}</div>
            </div>
            <div>
              <div className="text-gray-600">Total Amount</div>
              <div className="font-semibold">₹{Number(order.total || 0).toFixed(2)}</div>
            </div>
            {order.notes ? (
              <div className="md:col-span-2">
                <div className="text-gray-600">Notes</div>
                <div className="">{order.notes}</div>
              </div>
            ) : null}
          </div>
        </div>

        <Divider />
        <CustomerInfo order={order} />

        <Divider />
        <AddressBlock order={order} />

        <div className="mobile-sticky-actions flex justify-end gap-2 mt-2">
          <Button danger onClick={() => onCancelOrder(order)} loading={updating}>
            Cancel Order
          </Button>
          <Button type="primary" onClick={() => onMoveToProcessing(order)} loading={updating}>
            Move to Processing
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PendingOrderModal;
