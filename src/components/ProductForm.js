import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const unitOptions = [
  'kilo', 'gram', 'litre', 'millilitre', 'packet', 'set', 'piece', 'box', 'dozen', 'meter', 'cm', 'inch', 'gallon', 'bundle', 'carton', 'bag', 'bottle', 'can', 'tablet', 'capsule', 'sheet', 'roll', 'pair', 'others'
];

function ProductForm({
  onSubmit,
  initialData = {},
  uploading = false,
  success = '',
  error = '',
  onCancel,
  isEdit = false
}) {
  const [name, setName] = useState(initialData.name || '');
  const [nameTamil, setNameTamil] = useState(initialData.nameTamil || '');
  const [keywords, setKeywords] = useState(initialData.keywords || '');
  // Options: array of { unit, unitSize, quantity, mrp, sellingPrice, specialPrice }
  const [options, setOptions] = useState(
    initialData.options && Array.isArray(initialData.options) && initialData.options.length > 0
      ? initialData.options
      : [
          {
            unit: unitOptions[0],
            unitSize: '',
            quantity: '',
            mrp: '',
            sellingPrice: '',
            specialPrice: ''
          }
        ]
  );
  const [description, setDescription] = useState(initialData.description || '');
  const [category, setCategory] = useState(initialData.category || '');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [images, setImages] = useState([]);

  // Fetch categories from Firestore
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        const categories = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name) categories.push(data.name);
        });
        setCategoryOptions(categories);
      } catch (err) {
        setCategoryOptions([]);
      }
    };
    fetchCategories();
  }, []);

  const handleImageChange = (e) => {
    setImages(Array.from(e.target.files));
  };

  const handleOptionChange = (idx, field, value) => {
    setOptions(prev => prev.map((opt, i) => i === idx ? { ...opt, [field]: value } : opt));
  };

  const handleAddOption = () => {
    setOptions(prev => [
      ...prev,
      {
        unit: unitOptions[0],
        unitSize: '',
        quantity: '',
        mrp: '',
        sellingPrice: '',
        specialPrice: ''
      }
    ]);
  };

  const handleRemoveOption = (idx) => {
    setOptions(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      nameTamil,
      keywords,
      options,
      description,
      category,
      images
    });
  };

  return (
    <div className="product-form">
      <h2>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
      <form onSubmit={handleSubmit}>
        <label>Product Name</label>
        <input
          type="text"
          placeholder="Product Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <label>Product Name (Tamil)</label>
        <input
          type="text"
          placeholder="Product Name in Tamil"
          value={nameTamil}
          onChange={e => setNameTamil(e.target.value)}
        />
        <label>Keywords</label>
        <input
          type="text"
          placeholder="Keywords (comma separated)"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
        />

        <label>Product Options</label>
        {options.map((opt, idx) => (
          <div key={idx} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12, background: '#fafbfc' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontWeight: 400 }}>Unit</label>
                <select value={opt.unit} onChange={e => handleOptionChange(idx, 'unit', e.target.value)} required>
                  {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontWeight: 400 }}>{`Unit Size (${opt.unit})`}</label>
                <input
                  type="text"
                  placeholder={`Enter unit size in ${opt.unit}`}
                  value={opt.unitSize}
                  onChange={e => handleOptionChange(idx, 'unitSize', e.target.value)}
                  required
                />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ fontWeight: 400 }}>Quantity</label>
                <input
                  type="number"
                  placeholder="Quantity"
                  value={opt.quantity}
                  onChange={e => handleOptionChange(idx, 'quantity', e.target.value)}
                  min="0"
                  required
                />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ fontWeight: 400 }}>MRP Price</label>
                <input
                  type="number"
                  placeholder="MRP Price"
                  value={opt.mrp}
                  onChange={e => handleOptionChange(idx, 'mrp', e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ fontWeight: 400 }}>Selling Price</label>
                <input
                  type="number"
                  placeholder="Selling Price"
                  value={opt.sellingPrice}
                  onChange={e => handleOptionChange(idx, 'sellingPrice', e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div style={{ flex: 1, minWidth: 100 }}>
                <label style={{ fontWeight: 400 }}>Special Price</label>
                <input
                  type="number"
                  placeholder="Special Price (optional)"
                  value={opt.specialPrice}
                  onChange={e => handleOptionChange(idx, 'specialPrice', e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div style={{ alignSelf: 'end' }}>
                {options.length > 1 && (
                  <button type="button" onClick={() => handleRemoveOption(idx)} style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', marginLeft: 8, cursor: 'pointer' }}>Remove</button>
                )}
              </div>
            </div>
          </div>
        ))}
        <button type="button" onClick={handleAddOption} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 16px', marginBottom: 16, cursor: 'pointer' }}>+ Add Option</button>

        <label>Description</label>
        <textarea
          placeholder="Product Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          required
        />
        <label>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)} required>
          <option value="">Select Category</option>
          {categoryOptions.map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>
        <label>Product Images</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
        />
        {isEdit && images.length === 0 && (
          <p className="image-note">Current images will be kept if no new images are selected.</p>
        )}
        {success && <div className="success">{success}</div>}
        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <button 
            className="btn-primary" 
            type="submit" 
            disabled={uploading}
          >
            {uploading ? 'Processing...' : isEdit ? 'Update Product' : 'Add Product'}
          </button>
          <button 
            type="button" 
            className="btn-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProductForm;
