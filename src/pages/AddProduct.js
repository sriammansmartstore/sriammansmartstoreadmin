import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, orderBy, query, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { reserveLocation, annotateLocation } from '../utils/locations';
import ProductForm from '../components/ProductForm';
import TopNavBar from '../components/TopNavBar';
import BackButton from '../components/BackButton';

function AddProduct() {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

  const handleAddProduct = async ({ name, nameTamil, keywords, options, description, category, images, rack, shelf, bin, locationCode, showOfferBand }) => {
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      // Generate next product number for this category
      const productNumber = await getNextProductNumber(category);

      // Upload all images and get URLs
      let imageUrls = [];
      if (images && images.length > 0) {
        for (let img of images) {
          const imageRef = ref(storage, `products/${category}/${Date.now()}_${img.name}`);
          await uploadBytes(imageRef, img);
          const url = await getDownloadURL(imageRef);
          imageUrls.push(url);
        }
      }

      // Prepare options array: parse numbers
      const parsedOptions = (options || []).map(opt => ({
        unit: opt.unit,
        unitSize: opt.unitSize,
        quantity: opt.quantity ? parseFloat(opt.quantity) : 0,
        mrp: opt.mrp ? parseFloat(opt.mrp) : 0,
        sellingPrice: opt.sellingPrice ? parseFloat(opt.sellingPrice) : 0,
        specialPrice: opt.specialPrice ? parseFloat(opt.specialPrice) : null
      }));

      // If a location is provided, reserve it atomically before creating product
      if (locationCode && rack && shelf && bin) {
        await reserveLocation(locationCode, { category, tentativeName: name });
      }

      // Product data object
      const productData = {
        productNumber,
        name,
        nameTamil,
        keywords,
        options: parsedOptions,
        description,
        category,
        imageUrls,
        showOfferBand: Boolean(showOfferBand),
        createdAt: new Date(),
        ...(locationCode && rack && shelf && bin ? {
          location: {
            code: locationCode,
            rack: Number(rack),
            shelf: Number(shelf),
            bin: Number(bin)
          }
        } : {})
      };

      // Add to 'products/{category}/items' subcollection
      const newRef = await addDoc(collection(db, 'products', category, 'items'), productData);

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
      setTimeout(() => navigate('/products'), 1200);
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
            onCancel={() => navigate('/products')}
            isEdit={false}
          />
        </div>
      </div>
    </div>
  );
}

export default AddProduct;
