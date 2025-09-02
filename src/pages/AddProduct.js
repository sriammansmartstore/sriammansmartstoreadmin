import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, orderBy, query, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { reserveLocation, annotateLocation, releaseLocation } from '../utils/locations';
import ProductForm from '../components/ProductForm';
import TopNavBar from '../components/TopNavBar';
import BackButton from '../components/BackButton';

function AddProduct({ editMode = false }) {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [initialProduct, setInitialProduct] = useState(null);
  const navigate = useNavigate();
  const { category, id: productId } = useParams();

  // Fetch product data if in edit mode
  useEffect(() => {
    if (editMode && category && productId) {
      const fetchProduct = async () => {
        try {
          const productRef = doc(db, 'products', category, 'items', productId);
          const productDoc = await getDoc(productRef);
          
          if (productDoc.exists()) {
            setInitialProduct({
              ...productDoc.data(),
              id: productDoc.id
            });
          } else {
            setError('Product not found');
            setTimeout(() => navigate('/products/manage'), 1500);
          }
        } catch (err) {
          console.error('Error fetching product:', err);
          setError('Failed to load product data');
        }
      };
      
      fetchProduct();
    }
  }, [editMode, category, productId, navigate]);

  // Get the next product number by checking the last product in the category
  const getNextProductNumber = async (category) => {
    const categoryProductsRef = collection(db, 'products', category, 'items');
    const q = query(categoryProductsRef, orderBy('productNumber', 'desc'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const lastProduct = snapshot.docs[0].data();
      return (lastProduct.productNumber || 0) + 1;
    }
    return 1;
  };

  const handleAddProduct = async (productData) => {
    setUploading(true);
    setError('');
    setSuccess('');
    
    try {
      const {
        name,
        nameTamil,
        description,
        category,
        keywords,
        images,
        options,
        location,
        showOfferBand,
        gstInclusive,
        gstRate
      } = productData;

      // Generate next product number for this category
      const productNumber = await getNextProductNumber(category);

      // Upload all images and get URLs
      let imageUrls = [];
      if (images && images.length > 0) {
        for (let img of images) {
          // Only upload if it's a new file (not already a URL)
          if (typeof img !== 'string') {
            const imageRef = ref(storage, `products/${category}/${Date.now()}_${img.name}`);
            await uploadBytes(imageRef, img);
            const url = await getDownloadURL(imageRef);
            imageUrls.push(url);
          } else {
            // Keep existing URLs
            imageUrls.push(img);
          }
        }
      }

      // Prepare options array with all fields
      const parsedOptions = (options || []).map(opt => ({
        unit: opt.unit || '',
        unitSize: opt.unitSize || '',
        quantity: opt.quantity ? Number(opt.quantity) : 0,
        mrp: opt.mrp ? Number(opt.mrp) : 0,
        sellingPrice: opt.sellingPrice ? Number(opt.sellingPrice) : 0,
        specialPrice: opt.specialPrice ? Number(opt.specialPrice) : 0,
        minStock: opt.minStock ? Number(opt.minStock) : 0
      }));

      // Extract location data
      const { rack, shelf, bin, code: locationCode } = location || {};

      // If a location is provided, reserve it atomically before creating product
      if (locationCode && rack && shelf && bin) {
        await reserveLocation(locationCode, { category, tentativeName: name });
      }

      // Prepare product data for Firestore
      const productDoc = {
        productNumber,
        name,
        nameTamil: nameTamil || '',
        description: description || '',
        category,
        keywords: Array.isArray(keywords) ? keywords : (keywords ? [keywords] : []),
        imageUrls,
        options: parsedOptions,
        showOfferBand: Boolean(showOfferBand),
        gstInclusive: Boolean(gstInclusive),
        gstRate: Number(gstRate) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(locationCode && rack && shelf && bin ? {
          location: {
            code: locationCode,
            rack: Number(rack),
            shelf: Number(shelf),
            bin: Number(bin)
          }
        } : {})
      };

      if (editMode && initialProduct) {
        // Update existing product
        const productRef = doc(db, 'products', category, 'items', productId);
        
        // Release old location if changed
        if (initialProduct.location?.code && 
            (initialProduct.location.code !== locationCode || 
             initialProduct.location.rack !== rack || 
             initialProduct.location.shelf !== shelf || 
             initialProduct.location.bin !== bin)) {
          await releaseLocation(initialProduct.location.code);
        }
        
        // Reserve new location if provided
        if (locationCode && rack && shelf && bin) {
          await annotateLocation(locationCode, {
            productId: productId,
            productDocPath: `products/${category}/items/${productId}`,
            category,
            productNumber: initialProduct.productNumber || productNumber
          });
        }
        
        await updateDoc(productRef, {
          ...productDoc,
          updatedAt: new Date().toISOString()
        });
        
        setSuccess('Product updated successfully!');
      } else {
        // Add new product
        const newRef = await addDoc(collection(db, 'products', category, 'items'), productDoc);

        // Annotate location with product id reference for easier lookup
        if (locationCode && rack && shelf && bin) {
          await annotateLocation(locationCode, {
            productId: newRef.id,
            productDocPath: `products/${category}/items/${newRef.id}`,
            category,
            productNumber
          });
        }
        
        setSuccess('Product added successfully!');
      }
      
      setTimeout(() => navigate('/products/manage'), 1200);
    } catch (err) {
      console.error('Add product error:', err);
      setError('Failed to add product. ' + (err && err.message ? err.message : ''));
    }
    setUploading(false);
  };

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh' }}>
      <TopNavBar />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 16px 32px' }}>
        <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)' }}>
          <BackButton 
            label="Back" 
            style={{ marginBottom: 24, paddingLeft: 0 }}
          />
         
          <ProductForm
            onSubmit={handleAddProduct}
            uploading={uploading}
            success={success}
            error={error}
            onCancel={() => navigate('/products/manage')}
            isEdit={editMode}
            initialData={initialProduct}
          />
        </div>
      </div>
    </div>
  );
}

export default AddProduct;
