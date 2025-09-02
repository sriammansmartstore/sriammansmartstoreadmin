import React from 'react';

const AddressBlock = ({ order }) => {
  const a = order?.address || {};
  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Shipping Address</h3>
      <div className="bg-gray-50 p-4 rounded text-sm">
        <div className="font-medium">{a.fullName || order?.userProfile?.fullName || 'N/A'}</div>
        <div>
          {(a.door ? `${a.door}, ` : '')}{a.street || a.address || ''}
        </div>
        <div>
          {[a.town, a.city, a.district].filter(Boolean).join(', ')}
        </div>
        <div>
          {a.state} {a.pincode ? `- ${a.pincode}` : ''}
        </div>
        <div>Phone: {a.contact || a.phoneNumber || order?.userProfile?.number || 'N/A'}</div>
      </div>
    </div>
  );
};

export default AddressBlock;
