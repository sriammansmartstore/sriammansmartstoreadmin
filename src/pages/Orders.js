import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import OrdersDashboard from './orders/OrdersDashboard';

const Orders = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/orders/pending" replace />} />
      <Route path="/*" element={<OrdersDashboard />} />
    </Routes>
  );
};

export default Orders;
