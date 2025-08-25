
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import RegisterAdmin from './RegisterAdmin';
import Home from './pages/Home';
import ProductManagement from './pages/ProductManagement';
import AddProduct from './pages/AddProduct';
import Reports from './pages/Reports';
import UsersManagement from './pages/UsersManagement';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import AddCategory from './pages/AddCategory';
import ManageProducts from './pages/ManageProducts';
import ManageCategories from './pages/ManageCategories';
import SlideshowManager from './pages/SlideshowManager';
import OrdersDashboard from './pages/orders/OrdersDashboard';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/products" element={<PrivateRoute><ProductManagement /></PrivateRoute>} />
          <Route path="/products/add" element={<PrivateRoute><AddProduct /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
          {/* Order Management Routes */}
          <Route path="/orders/*" element={<PrivateRoute><OrdersDashboard /></PrivateRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OrdersDashboard />} />
            <Route path="pending" element={<OrdersDashboard />} />
            <Route path="shipped" element={<OrdersDashboard />} />
            <Route path="in-transit" element={<OrdersDashboard />} />
            <Route path="delivered" element={<OrdersDashboard />} />
            <Route path="cancelled" element={<OrdersDashboard />} />
            <Route path="returned" element={<OrdersDashboard />} />
          </Route>
          <Route path="/users" element={<PrivateRoute><UsersManagement /></PrivateRoute>} />
          <Route path="/categories/add" element={<PrivateRoute><AddCategory /></PrivateRoute>} />
          <Route path="/register-admin" element={<RegisterAdmin />} />
          <Route path="/products/manage" element={<PrivateRoute><ManageProducts /></PrivateRoute>} />
          <Route path="/categories/manage" element={<PrivateRoute><ManageCategories /></PrivateRoute>} />
          <Route path="/slideshow" element={<PrivateRoute><SlideshowManager /></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
