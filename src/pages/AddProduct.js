import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

  const handleAddProduct = async ({ name, nameTamil, keywords, options, description, category, images }) => {
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
        createdAt: new Date()
      };

      // Add to 'products/{category}/items' subcollection
      await addDoc(collection(db, 'products', category, 'items'), productData);

      setSuccess('Product added successfully!');
      setTimeout(() => navigate('/products'), 1200);
    } catch (err) {
      console.error('Add product error:', err);
      setError('Failed to add product. ' + (err && err.message ? err.message : ''));
    }
    setUploading(false);
  };

  return (
    <>
      <TopNavBar />
      <div className="admin-main">
        <BackButton />
        <div className="add-product-page-container" style={{ maxWidth: 500, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 32 }}>
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
    </>
  );
}

export default AddProduct;
