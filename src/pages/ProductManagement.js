import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocs, collection, deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import TopNavBar from '../components/TopNavBar';
import BackButton from '../components/BackButton';
function ProductManagement() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, []);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsList = [];
      querySnapshot.forEach((doc) => {
        productsList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsList);
    } catch (err) {
      setError('Failed to fetch products.');
    }
  };

  const handleDelete = async (productId, imageUrl) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        if (imageUrl) {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef).catch(() => {});
        }
        setSuccess('Product deleted successfully!');
        fetchProducts();
      } catch (err) {
        setError('Failed to delete product.');
      }
    }
  };

  return (
    <>
      <TopNavBar />
      <div className="admin-main">
        <BackButton />
        <div className="product-management-actions" style={{ maxWidth: 500, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <button className="btn-primary" onClick={() => navigate('/products/add')}>
            <span className="add-icon">＋</span> Add Product
          </button>
          <button className="btn-primary" onClick={() => navigate('/categories/add')}>
            <span className="add-icon">＋</span> Add Category
          </button>
          <button className="btn-primary" onClick={() => navigate('/products/manage')}>
            <span className="add-icon">🛒</span> Manage Products
          </button>
          <button className="btn-primary" onClick={() => navigate('/categories/manage')}>
            <span className="add-icon">📂</span> Manage Categories
          </button>
        </div>
      </div>
    </>
  );
}

export default ProductManagement;