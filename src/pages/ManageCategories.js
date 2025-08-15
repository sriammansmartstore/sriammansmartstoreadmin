import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocs, collection, deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import TopNavBar from '../components/TopNavBar';
import BackButton from '../components/BackButton';

function ManageCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const categoriesList = [];
      querySnapshot.forEach((doc) => {
        categoriesList.push({ id: doc.id, ...doc.data() });
      });
      setCategories(categoriesList);
    } catch (err) {
      setError('Failed to fetch categories.');
    }
    setLoading(false);
  };

  const handleDelete = async (categoryId, imageUrl) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteDoc(doc(db, 'categories', categoryId));
        if (imageUrl) {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef).catch(() => {});
        }
        setSuccess('Category deleted successfully!');
        fetchCategories();
      } catch (err) {
        setError('Failed to delete category.');
      }
    }
  };

  return (
    <>
      <TopNavBar />
      <div className="admin-main">
        <BackButton />
        <div className="manage-categories-container" style={{ maxWidth: 900, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 32 }}>
          <h2 style={{marginBottom:24}}>Manage Categories</h2>
          {success && <div className="success">{success}</div>}
          {error && <div className="error">{error}</div>}
          {loading ? <div>Loading...</div> : (
            <div className="categories-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {categories.length === 0 ? <div>No categories found.</div> : categories.map((cat) => (
                <div key={cat.id} className="category-card" style={{ background:'#fafafa', borderRadius:8, boxShadow:'0 1px 6px rgba(0,0,0,0.06)', padding:20, width:220 }}>
                  {cat.imageUrl && (
                    <div className="category-image" style={{ marginBottom:8 }}>
                      <img src={cat.imageUrl} alt={cat.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
                    </div>
                  )}
                  <div className="category-details">
                    <h3 style={{fontSize:18, margin:'8px 0'}}>{cat.name}</h3>
                    <div style={{fontSize:14, color:'#555'}}>{cat.description}</div>
                  </div>
                  <div className="category-actions" style={{marginTop:12, display:'flex', gap:8}}>
                    <button className="btn-edit" onClick={() => navigate(`/categories/edit/${cat.id}`)}>
                      Edit
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(cat.id, cat.imageUrl)}>
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

export default ManageCategories;
