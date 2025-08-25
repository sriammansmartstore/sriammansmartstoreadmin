// Action Handlers for ManageProducts component

export const handleDelete = async (product, setProducts, setFilteredProducts, setIsDeleteModalVisible, setLoading) => {
  if (!product) return;
  
  try {
    const { category, id, imageUrls } = product;
    await deleteDoc(doc(db, 'products', category, 'items', id));
    
    if (Array.isArray(imageUrls)) {
      for (const url of imageUrls) {
        const imageRef = ref(storage, url);
        await deleteObject(imageRef).catch(console.error);
      }
    }
    
    message.success('Product deleted successfully');
    setProducts(prev => prev.filter(p => p.id !== id));
    setFilteredProducts(prev => prev.filter(p => p.id !== id));
  } catch (err) {
    console.error('Error deleting product:', err);
    message.error('Failed to delete product');
  } finally {
    setIsDeleteModalVisible(false);
  }
};

export const toggleOfferBand = async (product, products, setProducts, setFilteredProducts) => {
  try {
    const productRef = doc(db, 'products', product.category, 'items', product.id);
    await updateDoc(productRef, {
      showOfferBand: !product.showOfferBand
    });
    
    const updatedProducts = products.map(p => 
      p.id === product.id ? { ...p, showOfferBand: !p.showOfferBand } : p
    );
    
    setProducts(updatedProducts);
    setFilteredProducts(updatedProducts.filter(p => 
      products.some(fp => fp.id === p.id)
    ));
    
    message.success(`Offer band ${!product.showOfferBand ? 'enabled' : 'disabled'}`);
  } catch (err) {
    console.error('Error updating offer band:', err);
    message.error('Failed to update offer band');
  }
};

export const handleSearch = (value, products, setSearchText, setFilteredProducts) => {
  setSearchText(value);
  const filtered = products.filter(p => 
    p.name?.toLowerCase().includes(value.toLowerCase()) ||
    p.nameTamil?.toLowerCase().includes(value.toLowerCase())
  );
  setFilteredProducts(filtered);
};

export const getColumns = (navigate, toggleOfferBand, setSelectedProduct, setIsViewModalVisible, setIsDeleteModalVisible) => [
  {
    title: 'Product',
    dataIndex: 'name',
    key: 'name',
    render: (text, record) => (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {record.imageUrls?.[0] ? (
          <img 
            src={record.imageUrls[0]} 
            alt={text}
            style={{
              width: 50,
              height: 50,
              objectFit: 'cover',
              marginRight: 10,
              borderRadius: 4,
            }}
          />
        ) : (
          <div
            style={{
              width: 50,
              height: 50,
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
              borderRadius: 4,
            }}
          >
            <ImageOutlined />
          </div>
        )}
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{record.category}</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Price',
    dataIndex: 'price',
    key: 'price',
    render: (price) => `₹${price?.toLocaleString('en-IN')}`,
    sorter: (a, b) => (a.price || 0) - (b.price || 0),
  },
  {
    title: 'Stock',
    dataIndex: 'stock',
    key: 'stock',
    render: (stock) => (
      <Tag color={stock > 0 ? 'green' : 'red'}>
        {stock > 0 ? `${stock} in stock` : 'Out of stock'}
      </Tag>
    ),
    sorter: (a, b) => (a.stock || 0) - (b.stock || 0),
  },
  {
    title: 'Offer Band',
    dataIndex: 'showOfferBand',
    key: 'showOfferBand',
    render: (show, record) => (
      <Switch 
        checked={show} 
        onChange={() => toggleOfferBand(record)}
        checkedChildren="Yes"
        unCheckedChildren="No"
      />
    ),
  },
  {
    title: 'Actions',
    key: 'actions',
    render: (_, record) => (
      <Space size="middle">
        <Button 
          icon={<EyeOutlined />} 
          onClick={() => {
            setSelectedProduct(record);
            setIsViewModalVisible(true);
          }}
        />
        <Button 
          type="primary" 
          icon={<EditOutlined />} 
          onClick={() => navigate(`/edit-product/${record.category}/${record.id}`)}
        />
        <Button 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => {
            setSelectedProduct(record);
            setIsDeleteModalVisible(true);
          }}
        />
      </Space>
    ),
  },
];
