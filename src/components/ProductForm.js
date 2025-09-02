import React, { useState, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase';
import { collection, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { suggestNextLocation, makeCode } from '../utils/locations';

// Tax and GST related constants
const gstSlabs = [
  { value: 0, label: '0% - Nil Rated' },
  { value: 0.25, label: '0.25% - Special Rate' },
  { value: 3, label: '3% - Special Rate' },
  { value: 5, label: '5% - Standard Rate' },
  { value: 12, label: '12% - Standard Rate' },
  { value: 18, label: '18% - Standard Rate' },
  { value: 28, label: '28% - Luxury Rate' },
  { value: 40, label: '40% - Special Rate' },
];

const taxTypes = [
  { value: 'inclusive', label: 'Inclusive of Tax' },
  { value: 'exclusive', label: 'Exclusive of Tax' },
  { value: 'none', label: 'No Tax' }
];

const gstTypes = [
  { value: 'regular', label: 'Regular (Normal Taxpayer)' },
  { value: 'composition', label: 'Composition Scheme' },
  { value: 'unregistered', label: 'Unregistered Dealer' },
  { value: 'export', label: 'Export/SEZ' },
  { value: 'deemed', label: 'Deemed Export' },
  { value: 'sez', label: 'SEZ Developer' },
];

const unitOptions = [
  'kilo', 'gram', 'litre', 'millilitre', 'packet', 'set', 'piece', 'box', 'dozen', 'meter', 'cm', 'inch', 'gallon', 'bundle', 'carton', 'bag', 'bottle', 'can', 'tablet', 'capsule', 'sheet', 'roll', 'pair', 'others'
];

function ProductForm({
  onSubmit,
  initialData = null,
  uploading = false,
  success = '',
  error = '',
  onCancel,
  onError = () => {},
  isEdit = false
}) {
  // Use empty object if initialData is null
  const data = initialData || {};
  
  // All state hooks must be called unconditionally at the top level
  const [name, setName] = useState('');
  const [gstInclusive, setGstInclusive] = useState(true);
  const [gstRate, setGstRate] = useState(0);
  const [taxType, setTaxType] = useState('inclusive');
  const [gstType, setGstType] = useState('regular');
  const [nameTamil, setNameTamil] = useState('');
  const [keywords, setKeywords] = useState('');
  const [options, setOptions] = useState([{
    unit: unitOptions[0],
    unitSize: '',
    quantity: 0,
    mrp: 0,
    sellingPrice: 0,
    specialPrice: 0,
    minStock: 0
  }]);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [images, setImages] = useState([]);
  const [rack, setRack] = useState('');
  const [shelf, setShelf] = useState('');
  const [bin, setBin] = useState('');
  const [locationHint, setLocationHint] = useState('');
  const [locationError, setLocationError] = useState('');
  const [activeSection, setActiveSection] = useState('product');
  const [isFormComplete, setIsFormComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Inline Add Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDescription, setNewCatDescription] = useState('');
  const [newCatImage, setNewCatImage] = useState(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addCategoryError, setAddCategoryError] = useState('');
  const [addCategorySuccess, setAddCategorySuccess] = useState('');

  // Toggle tax inclusive callback - moved to top level
  const toggleTaxInclusive = useCallback(() => {
    setGstInclusive(prev => {
      const newValue = !prev;
      setTaxType(newValue ? 'inclusive' : 'exclusive');
      return newValue;
    });
  }, []);

  // Check if all required fields are filled - moved to top level
  const checkFormCompletion = useCallback(() => {
    try {
      const isProductDetailsComplete = name && category && description;
      const isPricingComplete = options.length > 0 && options.every(opt => 
        opt.unit && (Number(opt.sellingPrice) > 0 || Number(opt.mrp) > 0) && 
        typeof opt.quantity === 'number' && opt.quantity >= 0
      );
      const isLocationComplete = Boolean(rack && shelf && bin);
      
      // For edit mode, be more lenient with validation
      if (isEdit) {
        return isProductDetailsComplete && isPricingComplete;
      }
      
      return isProductDetailsComplete && isPricingComplete && isLocationComplete;
    } catch (err) {
      console.error('Error checking form completion:', err);
      return true; // Allow submission in case of validation errors
    }
  }, [name, category, description, images, options, rack, shelf, bin, onError, isEdit]);
  
  // Initialize form with data when initialData changes or in edit mode
  useEffect(() => {
    if (isEdit && !initialData) {
      setIsLoading(true);
      // Load product data here if needed
      setIsLoading(false);
    } else if (initialData) {
      setName(initialData.name || '');
      setGstInclusive(initialData.gstInclusive !== undefined ? initialData.gstInclusive : true);
      setGstRate(initialData.gstRate || 0);
      setTaxType(initialData.taxType || 'inclusive');
      setGstType(initialData.gstType || 'regular');
      setNameTamil(initialData.nameTamil || '');
      setKeywords(Array.isArray(initialData.keywords) ? initialData.keywords.join(', ') : '');
      setOptions(
        initialData.options && Array.isArray(initialData.options) && initialData.options.length > 0
          ? initialData.options.map(opt => ({
              ...opt,
              quantity: Number(opt.quantity) || 0,
              minStock: Number(opt.minStock) || 0,
              mrp: Number(opt.mrp) || 0,
              sellingPrice: Number(opt.sellingPrice) || 0,
              specialPrice: Number(opt.specialPrice) || 0
            }))
          : [{
              unit: unitOptions[0],
              unitSize: '',
              quantity: 0,
              mrp: 0,
              sellingPrice: 0,
              specialPrice: 0,
              minStock: 0
            }]
      );
      setDescription(initialData.description || '');
      setCategory(initialData.category || '');
      setImages(initialData.imageUrls ? [...initialData.imageUrls] : []);
      setRack(initialData.location?.rack || '');
      setShelf(initialData.location?.shelf || '');
      setBin(initialData.location?.bin || '');
    }
  }, [initialData, isEdit]);
  
  // Fetch categories
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
        console.error('Error fetching categories:', err);
        onError('Failed to load categories');
      }
    };
    
    fetchCategories();
  }, [onError]);
  
  // Handle loading state with useEffect
  useEffect(() => {
    if (isEdit && !initialData) {
      const loadData = async () => {
        try {
          // Simulate loading or fetch data here if needed
          // Once data is loaded, update the state
          setIsLoading(false);
        } catch (err) {
          onError(err);
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [isEdit, initialData, onError]);

  // Update form completion status when dependencies change
  useEffect(() => {
    setIsFormComplete(checkFormCompletion());
  }, [checkFormCompletion]);

  // Return loading state if in edit mode and still loading
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div className="ant-spin ant-spin-lg" />
        <div style={{ marginTop: 16 }}>Loading product data...</div>
      </div>
    );
  }
  
  const handleImageChange = (e) => {
    setImages(Array.from(e.target.files));
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    if (val === '__add__') {
      setShowCategoryModal(true);
      return;
    }
    setCategory(val);
  };

  const handleNewCatImageChange = (e) => {
    setNewCatImage(e.target.files && e.target.files[0] ? e.target.files[0] : null);
  };

  const resetNewCategoryForm = () => {
    setNewCatName('');
    setNewCatDescription('');
    setNewCatImage(null);
    setAddCategoryError('');
    setAddCategorySuccess('');
  };

  const handleCreateCategory = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setAddingCategory(true);
    setAddCategoryError('');
    setAddCategorySuccess('');
    try {
      let imageUrl = '';
      if (newCatImage) {
        const imageRef = ref(storage, `categories/${Date.now()}_${newCatImage.name}`);
        await uploadBytes(imageRef, newCatImage);
        imageUrl = await getDownloadURL(imageRef);
      }
      await addDoc(collection(db, 'categories'), {
        name: newCatName,
        description: newCatDescription,
        imageUrl,
        createdAt: new Date()
      });
      // Update local dropdown and select the new category
      setCategoryOptions((prev) => (prev.includes(newCatName) ? prev : [...prev, newCatName]));
      setCategory(newCatName);
      setAddCategorySuccess('Category added');
      // Close modal shortly after success
      setTimeout(() => {
        setShowCategoryModal(false);
        resetNewCategoryForm();
      }, 600);
    } catch (err) {
      console.error('Failed to add category:', err);
      setAddCategoryError('Failed to add category.');
    } finally {
      setAddingCategory(false);
    }
  };
  
  const handleSuggestLocation = async () => {
    setLocationError('');
    try {
      const next = await suggestNextLocation();
      setRack(String(next.rack));
      setShelf(String(next.shelf));
      setBin(String(next.bin));
      setLocationHint(`Suggested: ${next.code}`);
    } catch (err) {
      setLocationError('Failed to suggest location. Please enter manually.');
    }
  };

  const checkAvailability = async () => {
    setLocationError('');
    setLocationHint('');
    
    // Skip location validation entirely in edit mode
    if (isEdit) {
      setLocationHint('Edit mode - location validation disabled');
      return;
    }
    
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

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...options];
    
    // Convert numeric fields to numbers
    if (['quantity', 'minStock', 'mrp', 'sellingPrice', 'specialPrice'].includes(field)) {
      newOptions[index] = { ...newOptions[index], [field]: Number(value) || 0 };
    } else {
      newOptions[index] = { ...newOptions[index], [field]: value };
    }
    
    // If quantity is less than minStock, adjust minStock
    if (field === 'quantity' && newOptions[index].minStock > Number(value)) {
      newOptions[index].minStock = Number(value) || 0;
    }
    
    setOptions(newOptions);
  };


  const addOption = () => {
    setOptions([...options, { 
      unit: unitOptions[0], 
      unitSize: '', 
      mrp: 0, 
      sellingPrice: 0, 
      specialPrice: 0, 
      quantity: 0, 
      minStock: 0 
    }]);
  };

  const handleRemoveOption = (idx) => {
    setOptions(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only check location availability for new products, not updates
    if (!isEdit && rack && shelf && bin) {
      const code = makeCode(Number(rack), Number(shelf), Number(bin));
      const ref = doc(db, 'locations', code);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        onError('This rack/shelf/bin is already in use. Please choose a different location.');
        return;
      }
    }

    // Generate location details
    const locationData = {
      bin: bin ? Number(bin) : null,
      rack: rack ? Number(rack) : null,
      shelf: shelf ? Number(shelf) : null,
      code: rack && shelf && bin ? makeCode(Number(rack), Number(shelf), Number(bin)) : ''
    };

    // Prepare options with all required fields
    const preparedOptions = options.map(option => ({
      unit: option.unit || '',
      unitSize: option.unitSize || '',
      mrp: Number(option.mrp) || 0,
      quantity: Number(option.quantity) || 0,
      sellingPrice: Number(option.sellingPrice) || 0,
      specialPrice: Number(option.specialPrice) || 0,
      minStock: Number(option.minStock) || 0,
    }));

    // Prepare product data with all fields
    const productData = {
      // Basic Information
      name,
      nameTamil: nameTamil || '',
      description: description || '',
      category: category || '',
      keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
      imageUrls: images.map(img => typeof img === 'string' ? img : URL.createObjectURL(img)),
      
      // Location Information
      location: locationData,
      
      // Product Options
      options: preparedOptions,
      
      // Tax Information
      gstInclusive: Boolean(gstInclusive),
      gstRate: Number(gstRate) || 0,
      
      // Timestamps
      createdAt: isEdit && initialData.createdAt ? initialData.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Additional Fields
      productNumber: isEdit && initialData.productNumber ? initialData.productNumber : Math.floor(1000 + Math.random() * 9000),
      
      // Include any existing ID if editing
      ...(isEdit && initialData.id && { id: initialData.id })
    };

    onSubmit(productData);
  };

  // Section navigation for mobile
  const renderSectionNav = () => (
    <div className="section-nav">
      <button 
        className={activeSection === 'product' ? 'active' : ''}
        onClick={() => setActiveSection('product')}
      >
        Product Details
      </button>
      <button 
        className={activeSection === 'pricing' ? 'active' : ''}
        onClick={() => setActiveSection('pricing')}
      >
        Pricing
      </button>
      <button 
        className={activeSection === 'stock' ? 'active' : ''}
        onClick={() => setActiveSection('stock')}
      >
        Stock Details
      </button>
    </div>
  );

  // Render product details section
  const renderProductDetails = () => (
    <div className="form-section">
      <h3>Product Information</h3>
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

      <label>Description</label>
      <textarea
        placeholder="Product Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={3}
        required
      />
      
      <label>Category</label>
      <select value={category} onChange={handleCategoryChange} required>
        <option value="">Select Category</option>
        {categoryOptions.map((cat, idx) => (
          <option key={idx} value={cat}>{cat}</option>
        ))}
        <option value="__add__">+ Add new category…</option>
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
    </div>
  );

  // Render pricing section
  const renderPricingSection = () => (
    <div className="form-section">
      <h3>Pricing & Options</h3>

      <label>Product Options</label>
      {options.map((opt, idx) => (
        <div key={idx} className="option-row" style={{ marginBottom: '24px', border: '1px solid #eee', padding: '16px', borderRadius: '8px' }}>
          {/* Unit and Unit Size in one row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label>Unit (e.g., kg, piece, liter)</label>
              <input
                type="text"
                placeholder="Unit"
                value={opt.unit || ''}
                onChange={e => handleOptionChange(idx, 'unit', e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>Unit Size (e.g., 1kg, 500ml)</label>
              <input
                type="text"
                placeholder="Unit Size"
                value={opt.unitSize || ''}
                onChange={e => handleOptionChange(idx, 'unitSize', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          {/* Prices in one row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label>MRP (₹)</label>
              <input
                type="number"
                placeholder="MRP"
                min="0"
                step="0.01"
                value={opt.mrp || ''}
                onChange={e => handleOptionChange(idx, 'mrp', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>Selling Price (₹)</label>
              <input
                type="number"
                placeholder="Selling Price"
                min="0"
                step="0.01"
                value={opt.sellingPrice || ''}
                onChange={e => handleOptionChange(idx, 'sellingPrice', e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label>Special Price (₹)</label>
              <input
                type="number"
                placeholder="Special Price"
                min="0"
                step="0.01"
                value={opt.specialPrice || ''}
                onChange={e => handleOptionChange(idx, 'specialPrice', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          {/* Remove button */}
          <div style={{ textAlign: 'right' }}>
            {options.length > 1 && (
              <button 
                type="button" 
                onClick={() => handleRemoveOption(idx)} 
                className="remove-btn"
                style={{
                  background: '#ffebee',
                  color: '#c62828',
                  border: '1px solid #ffcdd2',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Remove Option
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" onClick={addOption} className="add-option-btn">+ Add Option</button>

      <div className="tax-section">
        <h4>Tax & GST Information</h4>
        
        <div className="tax-grid">
          <div className="tax-field">
            <label>Tax Type</label>
            <select value={taxType} onChange={e => setTaxType(e.target.value)}>
              {taxTypes.map((tax, idx) => (
                <option key={idx} value={tax.value}>{tax.label}</option>
              ))}
            </select>
          </div>

          <div className="tax-field">
            <label>GST Type</label>
            <select value={gstType} onChange={e => setGstType(e.target.value)}>
              {gstTypes.map((gst, idx) => (
                <option key={idx} value={gst.value}>{gst.label}</option>
              ))}
            </select>
          </div>

          <div className="tax-field">
            <label>GST Rate (%)</label>
            <select value={gstRate} onChange={e => setGstRate(parseFloat(e.target.value))}>
              {gstSlabs.map((slab, idx) => (
                <option key={idx} value={slab.value}>{slab.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // Render stock details section
  const renderStockSection = () => (
    <div className="form-section">
      <h3>Stock Information</h3>
      
      {options.map((opt, idx) => (
        <div key={idx} className="option-quantity-fields">
          <div className="quantity-field">
            <label>Quantity in Stock</label>
            <input
              type="number"
              placeholder="Qty in stock"
              value={opt.quantity || ''}
              onChange={(e) => handleOptionChange(idx, 'quantity', parseInt(e.target.value) || 0)}
              min="0"
              step="1"
              required
            />
          </div>
          <div className="quantity-field">
            <label>Minimum Stock Level</label>
            <input
              type="number"
              placeholder="Min stock"
              value={opt.minStock || ''}
              onChange={(e) => handleOptionChange(idx, 'minStock', parseInt(e.target.value) || 0)}
              min="0"
              max={opt.quantity || ''}
              step="1"
              required
            />
          </div>
        </div>
      ))}
      
      <div className="location-section">
        <h4>Storage Location</h4>
        
        <div className="location-grid">
          <div className="location-field">
            <label>Rack</label>
            <input 
              type="number" 
              min="1" 
              placeholder="R" 
              value={rack} 
              onChange={e => setRack(e.target.value)} 
              onBlur={checkAvailability} 
            />
          </div>
          
          <div className="location-field">
            <label>Shelf</label>
            <input 
              type="number" 
              min="1" 
              placeholder="S" 
              value={shelf} 
              onChange={e => setShelf(e.target.value)} 
              onBlur={checkAvailability} 
            />
          </div>
          
          <div className="location-field">
            <label>Bin</label>
            <input 
              type="number" 
              min="1" 
              placeholder="B" 
              value={bin} 
              onChange={e => setBin(e.target.value)} 
              onBlur={checkAvailability} 
            />
          </div>
        </div>
        
        <button type="button" onClick={handleSuggestLocation} className="suggest-btn">
          <span>🔍</span> Suggest Location
        </button>
        
        {rack && shelf && bin && (
          <div className="location-code">
            Code: <strong>{makeCode(Number(rack), Number(shelf), Number(bin))}</strong>
          </div>
        )}
        
        {locationHint && <div className="location-hint">{locationHint}</div>}
        {locationError && <div className="location-error">{locationError}</div>}
      </div>
      
    </div>
  ); 
  
  const renderFormActions = () => (
    <div className="form-actions" style={{ marginTop: '24px' }}>
      <div style={{ width: '100%' }}>
        <button 
          className={`submit-btn ${!isFormComplete ? 'submit-btn--disabled' : ''}`} 
          type="button"
          onClick={handleSubmit}
          disabled={uploading}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            marginTop: '16px'
          }}
        >
          {uploading ? 'Processing...' : isEdit ? 'Update Product' : 'Add Product'}
        </button>
      </div>
      
      <button 
        type="button" 
        className="cancel-btn"
        onClick={onCancel}
        disabled={uploading}
      >
        Cancel
      </button>
    </div>
  );

  return (
    <div className="product-form-container">
      
      
      <h2>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
      
      {renderSectionNav()}
      
      <form onSubmit={handleSubmit}>
        <div className={`form-section-container ${activeSection === 'product' ? 'active' : ''}`}>
          {renderProductDetails()}
        </div>
        
        <div className={`form-section-container ${activeSection === 'pricing' ? 'active' : ''}`}>
          {renderPricingSection()}
        </div>
        
        <div className={`form-section-container ${activeSection === 'stock' ? 'active' : ''}`}>
          {renderStockSection()}
        </div>
        
        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}
        
        {renderFormActions()}
      </form>

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => { setShowCategoryModal(false); resetNewCategoryForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Category</h3>
            <form onSubmit={handleCreateCategory}>
              <label>Category Name</label>
              <input
                type="text"
                placeholder="Category Name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
              />
              <label>Description</label>
              <textarea
                placeholder="Category Description"
                value={newCatDescription}
                onChange={(e) => setNewCatDescription(e.target.value)}
                rows={3}
                required
              />
              <label>Category Image</label>
              <input type="file" accept="image/*" onChange={handleNewCatImageChange} />

              {addCategorySuccess && <div className="success-message">{addCategorySuccess}</div>}
              {addCategoryError && <div className="error-message">{addCategoryError}</div>}

              <div className="form-actions" style={{ marginTop: 0 }}>
                <button className={`submit-btn ${addingCategory ? 'submit-btn--disabled' : ''}`} type="submit" disabled={addingCategory}>
                  {addingCategory ? 'Processing…' : 'Add Category'}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => { setShowCategoryModal(false); resetNewCategoryForm(); }}
                  disabled={addingCategory}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background-color: #f5f5f5;
        }
        
        .product-form-container {
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 0;
        }
        
        .header-nav {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          margin: 0;
          padding: 0;
        }
        
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        h1 {
          font-size: 18px;
          color: #333;
          margin: 0;
        }
        
        .logout-btn {
          background: none;
          border: 1px solid #d32f2f;
          color: #d32f2f;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .back-nav {
          padding: 8px 12px;
        }
        
        .back-btn {
          background: none;
          border: none;
          color: #1976d2;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          display: flex;
          align-items: center;
        }
        
        .back-btn:before {
          content: "←";
          margin-right: 6px;
        }
        
        h2 {
          margin: 0;
          padding: 16px 12px;
          text-align: center;
          background: white;
          border-bottom: 1px solid #e0e0e0;
          font-size: 18px;
          color: #333;
        }
        
        .section-nav {
          display: flex;
          overflow-x: auto;
          margin: 0;
          border-bottom: 1px solid #e0e0e0;
          background: white;
          -webkit-overflow-scrolling: touch;
        }
        
        .section-nav button {
          flex: 1;
          min-width: 120px;
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          font-weight: 500;
          color: #666;
        }
        
        .section-nav button.active {
          color: #1976d2;
          border-bottom-color: #1976d2;
        }
        
        form {
          padding: 0 0px;
          background: white;
          margin: 0;
        }
        
        .form-section-container {
          display: none;
          padding: 16px 0;
        }
        
        .form-section-container.active {
          display: block;
        }
        
        .form-section {
          margin-bottom: 0;
        }
        
        .form-section h3 {
          margin: 0 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #e0e0e0;
          color: #333;
          font-size: 16px;
        }
        
        .form-section h4 {
          margin: 0 0 16px 0;
          color: #555;
          font-size: 15px;
        }
        
        label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }
        
        input, select, textarea {
          width: 100%;
          padding: 10px 12px;
          margin-bottom: 16px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          box-sizing: border-box;
          font-size: 16px;
          background: white;
        }
        
        textarea {
          resize: vertical;
          min-height: 80px;
        }
        
        .toggle-container {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
          gap: 10px;
        }
        
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }
        
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
          margin: 0;
        }
        
        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 24px;
        }
        
        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        
        input:checked + .toggle-slider {
          background-color: #2196F3;
        }
        
        input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }
        
        .toggle-label {
          color: #666;
          font-weight: 500;
          font-size: 14px;
        }
        
        .option-row {
          border: 1px solid #eee;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
          background: #fafbfc;
        }
        
        .option-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        
        .option-actions {
          display: flex;
          align-items: flex-end;
        }
        
        .remove-btn {
          background: #f44336;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 8px 12px;
          cursor: pointer;
          width: 100%;
          font-size: 14px;
        }
        
        .add-option-btn {
          background: #1976d2;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 10px 16px;
          margin-bottom: 16px;
          cursor: pointer;
          width: 100%;
          font-size: 14px;
        }
        
        .tax-section {
          margin: 20px 0;
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background-color: #f9f9f9;
        }
        
        .tax-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 15px;
        }
        
        .quantity-field {
          margin-bottom: 0;
        }
        
        .location-section {
          margin-top: 20px;
        }
        
        .location-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .location-field input {
          margin-bottom: 0;
        }
        
        .suggest-btn {
          width: 100%;
          height: 40px;
          padding: 0 16px;
          background: #f5f5f5;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          color: #333;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 12px;
        }
        
        .location-code, .location-hint, .location-error {
          font-size: 14px;
          margin-bottom: 8px;
        }
        
        .location-hint {
          color: #2e7d32;
        }
        
        .location-error {
          color: #d32f2f;
        }
        
        .success-message {
          color: #2e7d32;
          margin: 16px 0;
          padding: 8px 12px;
          background-color: #e8f5e9;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .error-message {
          color: #d32f2f;
          margin: 16px 0;
          padding: 8px 12px;
          background-color: #ffebee;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .form-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 24px 0;
          padding: 0;
        }
        
        .submit-btn {
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          opacity: 1;
        }
        
        .submit-btn--disabled {
          background: #cccccc;
          cursor: not-allowed;
          opacity: 0.7;
        }
        
        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .modal {
          width: 100%;
          max-width: 520px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          padding: 20px;
        }
        
        .cancel-btn {
          background: #fff;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          padding: 12px 20px;
          color: #ff4d4f;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
        }
        
        .image-note {
          font-size: 14px;
          color: #666;
          margin-top: -10px;
          margin-bottom: 16px;
        }
        
        /* Responsive styles */
        @media (min-width: 768px) {
          .header-top {
            padding: 12px 20px;
          }
          
          .back-nav {
            padding: 12px 20px;
          }
          
          h2 {
            padding: 20px;
          }
          
          form {
            padding: 0 20px;
          }
          
          .option-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .tax-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .form-actions {
            flex-direction: row;
          }
          
          .cancel-btn {
            margin-left: 12px;
          }
        }
        
        @media (min-width: 1024px) {
          .section-nav {
            justify-content: center;
          }
          
          .section-nav button {
            flex: none;
          }
          
          .form-section-container {
            display: block;
          }
          
          .section-nav {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default ProductForm;