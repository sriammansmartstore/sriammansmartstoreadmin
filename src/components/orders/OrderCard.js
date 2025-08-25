import React from 'react';
import { Card, Tag, Button, Space, Divider, Badge, Tooltip, Typography } from 'antd';
import { format } from 'date-fns';
import { 
  ShoppingOutlined, 
  UserOutlined, 
  PhoneOutlined, 
  HomeOutlined, 
  ClockCircleOutlined, 
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  TruckOutlined,
  UndoOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const OrderCard = ({ order, onStatusUpdate, showActions = true, status, onClick }) => {
  const { 
    id,
    orderNumber,
    createdAt, 
    total, 
    status: orderStatus, 
    userProfile = {},
    address = {},
    paymentMethod,
    paymentStatus,
    cartItems = []
  } = order;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const jsDate = date.toDate ? date.toDate() : new Date(date);
      return format(jsDate, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'orange', icon: <ClockCircleOutlined /> },
      processing: { color: 'blue', icon: <SyncOutlined spin /> },
      shipped: { color: 'cyan', icon: <TruckOutlined /> },
      'in-transit': { color: 'geekblue', icon: <TruckOutlined rotate={90} /> },
      delivered: { color: 'green', icon: <CheckCircleOutlined /> },
      cancelled: { color: 'red', icon: <CloseCircleOutlined /> },
      returned: { color: 'purple', icon: <UndoOutlined /> },
    };
    
    const config = statusConfig[status] || { color: 'default', icon: null };
    return (
      <Tag color={config.color} icon={config.icon}>
        {status?.toUpperCase()}
      </Tag>
    );
  };

  const renderOrderItems = () => (
    <div className="mt-2">
      <div className="font-medium mb-2">Order Items</div>
      <div className="space-y-3">
        {cartItems.map((item, index) => (
          <div key={index} className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="w-12 h-12 bg-gray-100 rounded mr-3 flex-shrink-0 flex items-center justify-center">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <ShoppingOutlined className="text-gray-400" />
                )}
              </div>
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-gray-500">
                  Qty: {item.quantity}
                  {item.unitSize && item.unit && (
                    <span className="ml-2">
                      • {item.unitSize} {item.unit}
                    </span>
                  )}
                </div>
                {item.variant && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(item.variant).map(([key, value]) => (
                      <span key={key} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">₹{(item.sellingPrice * item.quantity).toFixed(2)}</div>
              {item.mrp > item.sellingPrice && (
                <div className="text-xs text-gray-500 line-through">
                  ₹{(item.mrp * item.quantity).toFixed(2)}
                </div>
              )}
              <div className="text-xs text-gray-500">
                ₹{item.sellingPrice?.toFixed(2)} each
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTimeline = () => {
    const timeline = [
      { status: 'ordered', label: 'Order Placed', time: createdAt },
      { status: 'shipped', label: 'Shipped', time: order.shippedAt },
      { status: 'in-transit', label: 'In Transit', time: order.inTransitAt },
      { status: 'delivered', label: 'Delivered', time: order.deliveredAt },
    ];

    const currentStatusIndex = timeline.findIndex(item => item.status === orderStatus) + 1;

    return (
      <div className="mt-4">
        <div className="text-sm font-medium mb-2">Order Status</div>
        <div className="relative">
          <div className="absolute left-3 top-0 h-full w-0.5 bg-gray-200 pointer-events-none z-0"></div>
          {timeline.map((item, index) => {
            const isCompleted = index < currentStatusIndex;
            const isCurrent = index === currentStatusIndex - 1 && orderStatus !== 'cancelled' && orderStatus !== 'returned';
            
            return (
              <div key={index} className="relative pl-8 pb-4">
                <div className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center z-0 ${
                  isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent 
                      ? 'border-2 border-green-500 bg-white' 
                      : 'border-2 border-gray-300 bg-white'
                }`}>
                  {isCompleted ? (
                    <span className="text-xs">✓</span>
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                  )}
                </div>
                <div className="relative z-10">
                  <div className="font-medium">{item.label}</div>
                  {item.time && (
                    <div className="text-xs text-gray-500">
                      {formatOrderDate(item.time)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActionButtons = () => {
    if (!showActions) return null;
    
    switch (status) {
      case 'pending':
        return (
          <Space>
            <Button 
              type="primary" 
              onClick={() => onStatusUpdate('shipped')}
            >
              Mark as Shipped
            </Button>
            <Button 
              danger
              onClick={() => onStatusUpdate('cancelled')}
            >
              Cancel Order
            </Button>
          </Space>
        );
      case 'shipped':
        return (
          <Button 
            type="primary" 
            onClick={() => onStatusUpdate('in-transit')}
          >
            Mark as In Transit
          </Button>
        );
      case 'in-transit':
        return (
          <Button 
            type="primary" 
            onClick={() => onStatusUpdate('delivered')}
          >
            Mark as Delivered
          </Button>
        );
      case 'delivered':
        return (
          <Button disabled>
            Order Completed
          </Button>
        );
      case 'cancelled':
        return (
          <Button disabled danger>
            Order Cancelled
          </Button>
        );
      case 'returned':
        return (
          <Button disabled>
            Return Processed
          </Button>
        );
      default:
        return null;
    }
  };

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick(order);
    }
  };

  return (
    <Card 
      className="mb-4 hover:shadow-md transition-shadow cursor-pointer relative"
      style={{ overflow: 'visible' }}
      onClick={handleClick}
      title={
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <Text strong className="block sm:inline-block">
              Order #{orderNumber || id?.substring(0, 8) || 'N/A'}
            </Text>
            <span className="hidden sm:inline-block mx-2">•</span>
            <Text type="secondary" className="block sm:inline-block text-sm">
              {formatDate(createdAt)}
            </Text>
          </div>
          <div className="flex items-center">
            {getStatusBadge(orderStatus)}
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <div className="flex items-center text-gray-500">
            <UserOutlined className="mr-2" />
            <span>Customer</span>
          </div>
          <div className="ml-6">
            <div className="font-medium">{userProfile?.fullName || 'Guest'}</div>
            <div className="text-gray-500 text-sm">{userProfile?.email || 'N/A'}</div>
            <div className="flex items-center text-gray-500 text-sm">
              <PhoneOutlined className="mr-1" />
              {userProfile?.number || 'N/A'}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center text-gray-500">
            <HomeOutlined className="mr-2" />
            <span>Shipping</span>
          </div>
          <div className="ml-6">
            <div className="font-medium">{address?.fullName || 'N/A'}</div>
            <div className="text-gray-500 text-sm">
              {address?.address || 'N/A'}
              {address?.landmark && `, ${address.landmark}`}
            </div>
            <div className="text-gray-500 text-sm">
              {address?.city && `${address.city}, `}
              {address?.state && `${address.state} - `}
              {address?.pincode || ''}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center text-gray-500">
            <DollarOutlined className="mr-2" />
            <span>Payment</span>
          </div>
          <div className="ml-6">
            <div className="font-medium">
              {paymentMethod ? paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1) : 'N/A'}
            </div>
            <div className="text-gray-500 text-sm">
              Status: <Tag color={paymentStatus === 'paid' ? 'success' : 'warning'} className="ml-1">
                {paymentStatus?.toUpperCase() || 'PENDING'}
              </Tag>
            </div>
            <div className="text-gray-500 text-sm">
              Total: <span className="font-medium">₹{total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </div>
      </div>

      <Divider className="my-4" />
      
      {renderOrderItems()}
      
      <Divider className="my-4" />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-gray-500">
          {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} • 
          <span className="ml-1 font-medium">₹{total?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button type="link" onClick={handleClick} className="p-0">
            View Details
          </Button>
          {showActions && renderActionButtons()}
        </div>
      </div>
    </Card>
  );
};

export default OrderCard;
