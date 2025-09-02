import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocs, collection, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import TopNavBar from '../components/TopNavBar';
import BackButton from '../components/BackButton';

function ManageCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditName(cat.name || '');
    setEditDescription(cat.description || '');
    setEditImageFile(null);
    setSuccess('');
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditImageFile(null);
  };

  const onEditImageChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setEditImageFile(file);
  };

  const saveCategory = async (cat) => {
    if (!editingId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let imageUrl = cat.imageUrl || '';
      if (editImageFile) {
        const imageRef = ref(storage, `categories/${Date.now()}_${editImageFile.name}`);
        await uploadBytes(imageRef, editImageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      await updateDoc(doc(db, 'categories', editingId), {
        name: editName,
        description: editDescription,
        imageUrl,
        updatedAt: new Date(),
      });

      setSuccess('Category updated successfully!');
      setEditingId(null);
      setEditName('');
      setEditDescription('');
      setEditImageFile(null);
      await fetchCategories();
    } catch (err) {
      setError('Failed to update category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopNavBar />
      <div className="admin-main">
        <BackButton />
        <div className="manage-categories-container" style={{ maxWidth: 1000, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 16 }}>
          <h2 style={{marginBottom:24}}>Manage Categories</h2>
          {success && <div className="success">{success}</div>}
          {error && <div className="error">{error}</div>}
          {loading ? <div>Loading...</div> : (
            <div className="categories-grid">
              {categories.length === 0 ? <div>No categories found.</div> : categories.map((cat) => (
                <div key={cat.id} className="category-card">
                  <div className="category-top">
                    <div className="category-image">
                      {cat.imageUrl && !editingId && (
                        <img src={cat.imageUrl} alt={cat.name} />
                      )}
                      {editingId === cat.id && (
                        <>
                          {cat.imageUrl && <img src={cat.imageUrl} alt={cat.name} />}
                          <input type="file" accept="image/*" onChange={onEditImageChange} />
                        </>
                      )}
                    </div>
                    <div className="category-main">
                      {editingId === cat.id ? (
                        <>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Category Name"
                          />
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={3}
                            placeholder="Description"
                          />
                        </>
                      ) : (
                        <>
                          <h3>{cat.name}</h3>
                          <div className="category-description" title={cat.description}>{cat.description}</div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="category-actions">
                    {editingId === cat.id ? (
                      <>
                        <button className="btn-primary" onClick={() => saveCategory(cat)} disabled={saving}>
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button className="btn-secondary" onClick={cancelEdit} disabled={saving}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn-primary" onClick={() => startEdit(cat)}>Edit</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        .manage-categories-container h2 { padding-left: 8px; }
        .categories-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 520px) {
          .categories-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 900px) {
          .categories-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .category-card {
          background: #fafafa;
          border-radius: 10px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.06);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .category-top { display: flex; gap: 12px; }
        .category-image img { width: 56px; height: 56px; object-fit: cover; border-radius: 6px; border: 1px solid #eee; }
        .category-image input[type="file"] { margin-top: 8px; }
        .category-main { flex: 1; min-width: 0; }
        .category-main h3 { font-size: 18px; margin: 4px 0; word-break: break-word; }
        .category-description {
          font-size: 14px; color: #555; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .category-actions { display: flex; gap: 8px; margin-top: 8px; }
        .btn-primary { background: #1976d2; color: #fff; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; }
        .btn-secondary { background: #fff; color: #333; border: 1px solid #d9d9d9; border-radius: 6px; padding: 8px 12px; cursor: pointer; }
        .success { color: #2e7d32; background: #e8f5e9; padding: 8px 12px; border-radius: 6px; margin: 8px; }
        .error { color: #d32f2f; background: #ffebee; padding: 8px 12px; border-radius: 6px; margin: 8px; }
      `}</style>
    </>
  );
}

export default ManageCategories;
