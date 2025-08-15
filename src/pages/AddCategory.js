import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import TopNavBar from '../components/TopNavBar';
import BackButton from '../components/BackButton';

function AddCategory() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      let imageUrl = '';
      if (image) {
        const imageRef = ref(storage, `categories/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }
      await addDoc(collection(db, 'categories'), {
        name,
        description,
        imageUrl,
        createdAt: new Date()
      });
      setSuccess('Category added successfully!');
      setTimeout(() => navigate('/categories'), 1200);
    } catch (err) {
      setError('Failed to add category.');
    }
    setUploading(false);
  };

  return (
    <>
      <TopNavBar />
      <div className="admin-main">
        <BackButton />
        <div className="add-category-page-container" style={{ maxWidth: 500, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 32 }}>
          <h2>Add New Category</h2>
          <form onSubmit={handleSubmit}>
            <label>Category Name</label>
            <input
              type="text"
              placeholder="Category Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <label>Description</label>
            <textarea
              placeholder="Category Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              required
            />
            <label>Category Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {success && <div className="success">{success}</div>}
            {error && <div className="error">{error}</div>}
            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={uploading}>
                {uploading ? 'Processing...' : 'Add Category'}
              </button>
              <button type="button" className="btn-cancel" onClick={() => navigate('/categories')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default AddCategory;
