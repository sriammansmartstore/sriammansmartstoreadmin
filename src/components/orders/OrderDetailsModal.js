import React, { useState, useEffect } from 'react';
import './OrderDetailsModal.mobile.css';
import { Modal, Button, Form, Input, Select, Tabs, Badge, Tag, Divider, Descriptions, Spin, message } from 'antd';
import { 
  UserOutlined, 
  ShoppingCartOutlined, 
  CreditCardOutlined, 
  EnvironmentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';

const { Option } = Select;
const { TextArea } = Input;

const OrderDetailsModal = ({
  order,
  visible,
  onClose,
  onStatusUpdate,
  loading = false,
  updating = false
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('details');
  const [status, setStatus] = useState(order?.status || 'pending');
  const [notes, setNotes] = useState(order?.notes || '');

  useEffect(() => {
    if (order) {
      setStatus(order.status || 'pending');
      setNotes(order.notes || '');
      form.setFieldsValue({
        status: order.status || 'pending',
        notes: order.notes || ''
      });
    }
  }, [order, form]);

  const handleStatusChange = (value) => {
    setStatus(value);
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const success = await onStatusUpdate(order.id, values.status, values.notes);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'orange', text: 'Pending' },
      processing: { color: 'blue', text: 'Processing' },
      shipped: { color: 'cyan', text: 'Shipped' },
      'in-transit': { color: 'geekblue', text: 'In Transit' },
      delivered: { color: 'green', text: 'Delivered' },
      cancelled: { color: 'red', text: 'Cancelled' },
      returned: { color: 'purple', text: 'Returned' },
    };
    
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const jsDate = date.toDate ? date.toDate() : new Date(date);
      return format(jsDate, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  if (!order) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <Modal
      title={`Order #${order.orderNumber || order.id.substring(0, 8)}`}
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
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          destroyInactiveTabPane={false}
          items={[
            {
              key: 'details',
              label: 'Order Details',
              children: (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Order Information</h3>
                <Descriptions bordered column={isMobile ? 1 : 2} size="small">
                  <Descriptions.Item label="Order Date">
                    {formatDate(order.createdAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    {getStatusBadge(order.status)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Payment Method">
                    {order.paymentMethod || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Payment Status">
                    <Tag color={order.paymentStatus === 'paid' ? 'green' : 'orange'}>
                      {order.paymentStatus?.toUpperCase() || 'PENDING'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Total Amount" span={isMobile ? 1 : 2}>
                    <span className="font-semibold text-lg">
                      ₹{order.total?.toFixed(2) || '0.00'}
                    </span>
                  </Descriptions.Item>
                </Descriptions>
              </div>

              <Divider />

              <div>
                <h3 className="text-lg font-medium mb-2">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-2 rounded-full mr-4">
                      <UserOutlined className="text-blue-600 text-lg" />
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {order.userProfile?.fullName || 'Guest Customer'}
                      </h4>
                      <p className="text-gray-600 break-all">{order.userProfile?.email || 'N/A'}</p>
                      <p className="text-gray-600">{order.userProfile?.number || order.userProfile?.verifiedPhoneNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Divider />

              <div>
                <h3 className="text-lg font-medium mb-2">Shipping Address</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-full mr-4">
                      <EnvironmentOutlined className="text-green-600 text-lg" />
                    </div>
                    <div>
                      <p className="font-medium">{order.address?.fullName || order.userProfile?.fullName || 'N/A'}</p>
                      <p>
                        {order.address?.door ? `${order.address.door}, ` : ''}
                        {order.address?.street || order.address?.address || ''}
                      </p>
                      <p>
                        {[order.address?.town, order.address?.city, order.address?.district].filter(Boolean).join(', ')}
                      </p>
                      <p>
                        {order.address?.state} {order.address?.pincode ? `- ${order.address.pincode}` : ''}
                      </p>
                      <p>Phone: {order.address?.contact || order.address?.phoneNumber || order.userProfile?.number || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Divider />

              <div>
                <h3 className="text-lg font-medium mb-2">Order Items</h3>
                <div className="order-items-list border rounded divide-y">
                  {order.cartItems?.map((item, index) => {
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
                              <ShoppingCartOutlined className="text-gray-400 text-lg" />
                            )}
                          </div>
                          <div className="item-meta flex-1 min-w-0">
                            <div className="font-medium truncate">{item.name}{item.nameTamil ? ` (${item.nameTamil})` : ''}</div>
                            {variantText && (
                              <div className="text-xs text-gray-600 mt-0.5 break-words">{variantText}</div>
                            )}
                            <div className="text-xs text-gray-600 mt-0.5">
                              Qty: {qty}
                              {unitSize || unit ? ` • ${unitSize || ''} ${unit || ''}`.trim() : ''}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-sm font-semibold">₹{sp.toFixed(2)}</span>
                              {mrp > sp && (
                                <span className="text-xs text-gray-500 line-through">₹{mrp.toFixed(2)}</span>
                              )}
                              {item.specialPrice && (
                                <span className="text-xs text-green-600">Offer: ₹{Number(item.specialPrice).toFixed(2)}</span>
                              )}
                              <span className="text-xs text-gray-500">Line Total: ₹{lineTotal.toFixed(2)}</span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500 break-words">
                              {item.category && <span className="mr-2">Category: {item.category}</span>}
                              {typeof item.productNumber !== 'undefined' && (
                                <span className="mr-2">No: {item.productNumber}</span>
                              )}
                              {item.productId && <span>ID: {item.productId}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
              )
            },
            {
              key: 'status',
              label: 'Update Status',
              children: (
            <Form form={form} layout="vertical">
              <Form.Item
                name="status"
                label="Order Status"
                rules={[{ required: true, message: 'Please select a status' }]}
              >
                <Select placeholder="Select status" onChange={handleStatusChange}>
                  <Option value="pending">Pending</Option>
                  <Option value="processing">Processing</Option>
                  <Option value="shipped">Shipped</Option>
                  <Option value="in-transit">In Transit</Option>
                  <Option value="delivered">Delivered</Option>
                  <Option value="cancelled">Cancelled</Option>
                  <Option value="returned">Returned</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="notes"
                label="Notes"
              >
                <TextArea 
                  rows={4} 
                  placeholder="Add any notes about this order..."
                  value={notes}
                  onChange={handleNotesChange}
                />
              </Form.Item>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 md:p-4 mb-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Changing the order status may notify the customer via SMS.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  type="primary" 
                  loading={updating}
                  onClick={handleSubmit}
                >
                  Update Status
                </Button>
              </div>
            </Form>
              )
            }
          ]}
        />
      </Spin>
    </Modal>
  );
}
;

export default OrderDetailsModal;
