
import React, { useState } from 'react';
import BackButton from '../components/BackButton';
import './OrdersManagement.css';

// Mock order data
const initialOrders = [
  {
    id: 'ORD001',
    customer: 'John Doe',
    items: [
      { name: 'Product A', qty: 2 },
      { name: 'Product B', qty: 1 },
    ],
    total: 1200,
    status: 'Pending',
    address: '123 Main St',
    date: '2025-08-15',
  },
  {
    id: 'ORD002',
    customer: 'Jane Smith',
    items: [
      { name: 'Product C', qty: 1 },
    ],
    total: 500,
    status: 'Delivered',
    address: '456 Market Rd',
    date: '2025-08-14',
  },
];

function OrdersManagement() {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // End order (set status to Finished)
  const endOrder = (id) => {
    setOrders(orders.map(order =>
      order.id === id ? { ...order, status: 'Finished' } : order
    ));
  };

  // Mark as delivered
  const deliverOrder = (id) => {
    setOrders(orders.map(order =>
      order.id === id ? { ...order, status: 'Delivered' } : order
    ));
  };

  // Filter and search logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer.toLowerCase().includes(search.toLowerCase()) || order.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || order.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="orders-container">
      <BackButton />
      <h2>Orders Management</h2>
      <div className="orders-controls">
        <input
          type="text"
          placeholder="Search by customer or order ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="All">All</option>
          <option value="Pending">Pending</option>
          <option value="Finished">Finished</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>

      <div className="orders-list">
        {filteredOrders.length === 0 ? (
          <p>No orders found.</p>
        ) : (
          filteredOrders.map(order => (
            <div className="order-card" key={order.id}>
              <div className="order-header">
                <span className="order-id">{order.id}</span>
                <span className={`order-status status-${order.status.toLowerCase()}`}>{order.status}</span>
              </div>
              <div className="order-info">
                <div><strong>Customer:</strong> {order.customer}</div>
                <div><strong>Date:</strong> {order.date}</div>
                <div><strong>Address:</strong> {order.address}</div>
                <div><strong>Total:</strong> ₹{order.total}</div>
                <div><strong>Items:</strong> {order.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</div>
              </div>
              <div className="order-actions">
                {order.status === 'Pending' && (
                  <>
                    <button onClick={() => endOrder(order.id)} className="end-btn">End Order</button>
                    <button onClick={() => deliverOrder(order.id)} className="deliver-btn">Mark as Delivered</button>
                  </>
                )}
                {order.status === 'Finished' && (
                  <button onClick={() => deliverOrder(order.id)} className="deliver-btn">Mark as Delivered</button>
                )}
                <button onClick={() => setSelectedOrder(order)} className="details-btn">Details</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal for order details */}
      {selectedOrder && (
        <div className="order-modal" onClick={() => setSelectedOrder(null)}>
          <div className="order-modal-content" onClick={e => e.stopPropagation()}>
            <h3>Order Details</h3>
            <div><strong>Order ID:</strong> {selectedOrder.id}</div>
            <div><strong>Customer:</strong> {selectedOrder.customer}</div>
            <div><strong>Date:</strong> {selectedOrder.date}</div>
            <div><strong>Address:</strong> {selectedOrder.address}</div>
            <div><strong>Total:</strong> ₹{selectedOrder.total}</div>
            <div><strong>Status:</strong> {selectedOrder.status}</div>
            <div><strong>Items:</strong>
              <ul>
                {selectedOrder.items.map((item, idx) => (
                  <li key={idx}>{item.name} (x{item.qty})</li>
                ))}
              </ul>
            </div>
            <button onClick={() => setSelectedOrder(null)} className="close-btn">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdersManagement;
