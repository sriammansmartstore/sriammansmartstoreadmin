import React from 'react';
import { Divider, Space, Tag } from 'antd';
import '../../orders/OrderDetailsModal.mobile.css';

const OrderSummary = ({ order, compact = false }) => {
  if (!order) return null;
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Order Items</h3>
      <div className="order-items-list border rounded divide-y">
        {(order.cartItems || []).map((item, index) => {
          const thumb = item.image || item.imageUrls?.[0];
          const qty = Number(item.quantity) || 1;
          const sp = Number(item.sellingPrice) || 0;
          const mrp = Number(item.mrp) || 0;
          const lineTotal = sp * qty;
          const unit = item.unit || item.options?.[0]?.unit;
          const unitSize = item.unitSize || item.options?.[0]?.unitSize;
          const variantText = item.variant
            ? Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(', ')
            : null;

          return (
            <div key={index} className="item-row p-2 md:p-3">
              <div className="item-row-inner flex items-start gap-2">
                <div className="item-thumb w-8 h-8 md:w-12 md:h-12 bg-white border border-gray-200 rounded-md p-0.5 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 768px) 32px, 48px"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">No Img</span>
                  )}
                </div>
                <div className="item-meta flex-1 min-w-0">
                  <div className="font-medium truncate">{item.name}{item.nameTamil ? ` (${item.nameTamil})` : ''}</div>
                  {variantText && (
                    <div className="text-xs text-gray-600 mt-0.5 break-words">{variantText}</div>
                  )}
                  <div className="text-xs text-gray-600 mt-0.5">
                    Qty: {qty}
                    {(unitSize || unit) ? ` • ${unitSize || ''} ${unit || ''}`.trim() : ''}
                  </div>
                  {!compact && (
                    <Space size={[8, 4]} wrap className="mt-1">
                      <span className="text-sm font-semibold">₹{sp.toFixed(2)}</span>
                      {mrp > sp && (
                        <span className="text-xs text-gray-500 line-through">₹{mrp.toFixed(2)}</span>
                      )}
                      {item.specialPrice && (
                        <Tag color="green">Offer: ₹{Number(item.specialPrice).toFixed(2)}</Tag>
                      )}
                      <span className="text-xs text-gray-500">Line Total: ₹{lineTotal.toFixed(2)}</span>
                    </Space>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderSummary;
