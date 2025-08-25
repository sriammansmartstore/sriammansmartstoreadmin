import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { suggestNextLocation, makeCode } from '../utils/locations';

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
  const [rack, setRack] = useState(initialData.rack || '');
  const [shelf, setShelf] = useState(initialData.shelf || '');
  const [bin, setBin] = useState(initialData.bin || '');
  const [locationHint, setLocationHint] = useState('');
  const [locationError, setLocationError] = useState('');
  const [showOfferBand, setShowOfferBand] = useState(initialData.showOfferBand || false);

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

  const handleSuggestLocation = async () => {
    setLocationError('');
    const next = await suggestNextLocation();
    setRack(String(next.rack));
    setShelf(String(next.shelf));
    setBin(String(next.bin));
    setLocationHint(`Suggested: ${next.code}`);
  };

  const checkAvailability = async () => {
    setLocationError('');
    setLocationHint('');
    if (!rack || !shelf || !bin) return;
    const code = makeCode(Number(rack), Number(shelf), Number(bin));
    const ref = doc(db, 'locations', code);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setLocationError('This rack/shelf/bin is already in use.');
    } else {
      setLocationHint('Available');
    }
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
      images,
      rack: rack ? Number(rack) : null,
      shelf: shelf ? Number(shelf) : null,
      bin: bin ? Number(bin) : null,
      locationCode: rack && shelf && bin ? makeCode(Number(rack), Number(shelf), Number(bin)) : '',
      showOfferBand
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

        <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ margin: 0, fontWeight: 500 }}>Show Offer Band:</label>
          <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
            <input
              type="checkbox"
              checked={showOfferBand}
              onChange={(e) => setShowOfferBand(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: showOfferBand ? '#2196F3' : '#ccc',
              transition: '.4s',
              borderRadius: '24px'
            }}>
              <span style={{
                position: 'absolute',
                height: '16px',
                width: '16px',
                left: '4px',
                bottom: '4px',
                backgroundColor: 'white',
                transition: '.4s',
                borderRadius: '50%',
                transform: showOfferBand ? 'translateX(26px)' : 'translateX(0)'
              }} />
            </span>
          </label>
          <span style={{ color: showOfferBand ? '#2196F3' : '#666', fontWeight: 500 }}>
            {showOfferBand ? 'Yes' : 'No'}
          </span>
        </div>

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

        <hr style={{ margin: '16px 0' }} />
        <h3>Storage Location</h3>
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          flexDirection: 'row',
          '@media (max-width: 768px)': {
            flexDirection: 'column',
            alignItems: 'stretch',
            '& > div': {
              width: '100%',
              marginBottom: 8
            }
          }
        }}>
          <div style={{ 
            minWidth: 90,
            flex: '1 1 0'
          }}>
            <label>Rack</label>
            <input 
              type="number" 
              min="1" 
              placeholder="R" 
              value={rack} 
              onChange={e => setRack(e.target.value)} 
              onBlur={checkAvailability} 
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                fontSize: 14
              }}
            />
          </div>
          <div style={{ 
            minWidth: 90,
            flex: '1 1 0'
          }}>
            <label>Shelf</label>
            <input 
              type="number" 
              min="1" 
              placeholder="S" 
              value={shelf} 
              onChange={e => setShelf(e.target.value)} 
              onBlur={checkAvailability} 
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                fontSize: 14
              }}
            />
          </div>
          <div style={{ 
            minWidth: 90,
            flex: '1 1 0'
          }}>
            <label>Bin</label>
            <input 
              type="number" 
              min="1" 
              placeholder="B" 
              value={bin} 
              onChange={e => setBin(e.target.value)} 
              onBlur={checkAvailability} 
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                fontSize: 14
              }}
            />
          </div>
          <button 
            type="button" 
            onClick={handleSuggestLocation} 
            style={{ 
              height: 36, 
              padding: '0 16px',
              background: '#f5f5f5',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              color: '#333',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
width: '100%',
              marginTop: 8
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#e6f7ff'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f5f5f5'}
          >
            <span>🔍</span> Suggest
          </button>
        </div>
        {rack && shelf && bin && (
          <div style={{ marginTop: 6, fontSize: 12 }}>
            Code: <strong>{makeCode(Number(rack), Number(shelf), Number(bin))}</strong>
          </div>
        )}
        {locationHint && <div style={{ color: '#2e7d32', fontSize: 12 }}>{locationHint}</div>}
        {locationError && <div style={{ color: '#d32f2f', fontSize: 12 }}>{locationError}</div>}
        {success && <div className="success">{success}</div>}
        {error && <div className="error">{error}</div>}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 16,
          '& > button': {
            flex: 1,
            minWidth: 120
          },
          '@media (max-width: 768px)': {
            flexDirection: 'column',
            '& > button': {
              width: '100%',
              margin: '4px 0',
              minWidth: '100%'
            }
          }
        }}>
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
            style={{
              padding: '8px 20px',
              background: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              color: '#ff4d4f',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.3s',
              marginLeft: 8
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#fff1f0';
              e.currentTarget.style.borderColor = '#ff4d4f';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.borderColor = '#d9d9d9';
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProductForm;
