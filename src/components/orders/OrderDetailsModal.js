import React, { useState, useEffect, useMemo } from 'react';
import './OrderDetailsModal.mobile.css';
import { Modal, Button, Spin, message, Checkbox } from 'antd';
import { db } from '../../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Packing-only modal; details/status handled by status-specific modals

const OrderDetailsModal = ({
  order,
  visible,
  onClose,
  onStatusUpdate,
  loading = false,
  updating = false,
  defaultTab = 'packing'
}) => {
  const [packingMap, setPackingMap] = useState({});
  const [savingPacking, setSavingPacking] = useState(false);

  useEffect(() => {
    if (order) {
      // initialize packing map
      const initial = {};
      const packed = order.packedItems || {};
      (order.cartItems || []).forEach((item, idx) => {
        // key by productId or id or index for stability
        const key = item.productId || item.id || String(idx);
        initial[key] = Boolean(packed[key]);
      });
      setPackingMap(initial);
    }
  }, [order]);

  // Ensure packing map is ready on open
  useEffect(() => {
    // no-op placeholder to emphasize packing-only modal
  }, [visible, defaultTab]);

  const allPacked = useMemo(() => {
    const values = Object.values(packingMap);
    return values.length > 0 && values.every(Boolean);
  }, [packingMap]);

  const packedCount = useMemo(() => Object.values(packingMap).filter(Boolean).length, [packingMap]);

  const savePackingProgress = async () => {
    if (!order?.id) return;
    try {
      setSavingPacking(true);
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        packedItems: packingMap,
        packedUpdatedAt: serverTimestamp(),
      });
      message.success('Packing progress saved');
    } catch (e) {
      console.error('Failed to save packing progress', e);
      message.error('Failed to save packing progress');
    } finally {
      setSavingPacking(false);
    }
  };

  const moveToProcessingAfterPacked = async () => {
    try {
      await savePackingProgress();
      const ok = await onStatusUpdate(order.id, 'processing');
      if (ok) message.success('Order moved to Processing');
    } catch (e) {
      // messages already shown
    }
  };

  if (!order) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <Modal
      title={`Packing — Order #${order.orderNumber || order.id.substring(0, 8)}`}
      open={visible}
      onCancel={onClose}
      width={isMobile ? '100%' : 800}
      className={isMobile ? 'order-details-modal-mobile' : 'order-details-modal'}
      style={isMobile ? { top: 0, padding: 0 } : {}}
      styles={isMobile ? { body: { padding: 12, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' } } : {}}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ]}
    >
      <Spin spinning={loading}>
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 md:p-4 rounded">
            <div className="text-sm text-blue-700">
              Check each item as you pick and pack it. Location info is shown to speed up packing.
            </div>
          </div>
          <div className="order-items-list border rounded divide-y">
            {(order.cartItems || []).map((item, index) => {
              const key = item.productId || item.id || String(index);
              const qty = Number(item.quantity) || 1;
              const unit = item.unit || item.options?.[0]?.unit;
              const unitSize = item.unitSize || item.options?.[0]?.unitSize;
              const loc = item.location || item.locationInfo || {};
              const rack = loc.rack ?? order.location?.rack;
              const shelf = loc.shelf ?? order.location?.shelf;
              const bin = loc.bin ?? order.location?.bin;
              const fallbackCode = `R${rack ?? '-'}-S${shelf ?? '-'}-B${bin ?? '-'}`;
              const finalCode = (loc.code || item.locationCode || order.location?.code || fallbackCode);
              return (
                <div key={key} className="p-2 md:p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.name}{item.nameTamil ? ` (${item.nameTamil})` : ''}</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Qty: {qty}{(unitSize || unit) ? ` • ${unitSize || ''} ${unit || ''}`.trim() : ''}
                    </div>
                    <div className="text-xs text-gray-700 mt-0.5">
                      <span>code "<span className="font-semibold">{finalCode}</span>"</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Checkbox
                      className="packing-check"
                      checked={!!packingMap[key]}
                      onChange={(e) => setPackingMap(prev => ({ ...prev, [key]: e.target.checked }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mobile-sticky-actions flex flex-wrap gap-2 justify-end">
            <Button onClick={savePackingProgress} loading={savingPacking}>
              Save Packing
            </Button>
            <Button type="primary" disabled={!allPacked} onClick={moveToProcessingAfterPacked} loading={updating}>
              Move to Processing
            </Button>
          </div>
        </div>
      </Spin>
    </Modal>
  );
};

export default OrderDetailsModal;
