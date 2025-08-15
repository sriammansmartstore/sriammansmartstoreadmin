import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocs, collection, deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import TopNavBar from '../components/TopNavBar';
import BackButton from '../components/BackButton';

function ManageProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch all products from all categories' items subcollections
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const categoriesSnapshot = await getDocs(collection(db, 'products'));
      let productsList = [];
      for (const categoryDoc of categoriesSnapshot.docs) {
        const category = categoryDoc.id;
        const itemsSnapshot = await getDocs(collection(db, 'products', category, 'items'));
        itemsSnapshot.forEach((itemDoc) => {
          productsList.push({
            id: itemDoc.id,
            category,
            ...itemDoc.data()
          });
        });
      }
      setProducts(productsList);
    } catch (err) {
      setError('Failed to fetch products.');
    }
    setLoading(false);
  };

  const handleDelete = async (category, productId, imageUrls = [], imageUrl = '') => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', category, 'items', productId));
        // Delete all images from storage
        if (Array.isArray(imageUrls)) {
          for (const url of imageUrls) {
            const imageRef = ref(storage, url);
            await deleteObject(imageRef).catch(() => {});
          }
        } else if (imageUrl) {
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
        <div className="manage-products-container" style={{ maxWidth: 900, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 32 }}>
          <h2 style={{marginBottom:24}}>Manage Products</h2>
          {success && <div className="success">{success}</div>}
          {error && <div className="error">{error}</div>}
          {loading ? <div>Loading...</div> : (
            <div className="products-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {products.length === 0 ? <div>No products found.</div> : products.map((product) => (
                <div key={product.id} className="product-card" style={{ background:'#fafafa', borderRadius:8, boxShadow:'0 1px 6px rgba(0,0,0,0.06)', padding:20, width:220 }}>
                  {Array.isArray(product.imageUrls) && product.imageUrls.length > 0 ? (
                    <div className="product-image-multi" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom:8 }}>
                      {product.imageUrls.map((url, idx) => (
                        <img key={idx} src={url} alt={product.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
                      ))}
                    </div>
                  ) : product.imageUrl ? (
                    <div className="product-image" style={{ marginBottom:8 }}>
                      <img src={product.imageUrl} alt={product.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
                    </div>
                  ) : null}
                  <div className="product-details">
                    <h3 style={{fontSize:18, margin:'8px 0'}}>{product.name}</h3>
                    <div style={{fontSize:14, color:'#555'}}>{product.category}</div>
                    <div style={{fontSize:14, color:'#555'}}>{product.unit} {product.unitSize} - Qty: {product.quantity}</div>
                    <div style={{fontSize:14, color:'#555'}}>MRP: ₹{product.mrp} | Selling: ₹{product.sellingPrice}</div>
                    {product.specialPrice && <div style={{fontSize:14, color:'#007bff'}}>Special: ₹{product.specialPrice}</div>}
                  </div>
                  <div className="product-actions" style={{marginTop:12, display:'flex', gap:8}}>
                    <button className="btn-edit" onClick={() => navigate(`/products/edit/${product.category}/${product.id}`)}>
                      Edit
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(product.category, product.id, product.imageUrls, product.imageUrl)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ManageProducts;
