import React from 'react';

const CustomerInfo = ({ order }) => {
  if (!order) return null;
  const user = order.userProfile || {};
  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Customer</h3>
      <div className="bg-gray-50 p-4 rounded">
        <div className="font-medium">{user.fullName || 'Guest Customer'}</div>
        <div className="text-gray-600 text-sm break-all">{user.email || 'N/A'}</div>
        <div className="text-gray-600 text-sm">{user.number || user.verifiedPhoneNumber || 'N/A'}</div>
      </div>
    </div>
  );
};

export default CustomerInfo;
