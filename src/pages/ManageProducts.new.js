import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Table, Button, Card, message, Tag, Switch, Space, Modal, Input, Image, Typography, Alert } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined, ImageOutlined } from '@ant-design/icons';
import TopNavBar from '../components/TopNavBar';
import { handleDelete, toggleOfferBand, handleSearch, getColumns } from './ManageProducts.handlers';

const { Text } = Typography;
const { Search } = Input;

function ManageProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const categoriesSnapshot = await getDocs(collection(db, 'products'));
      let productsList = [];
      
      for (const categoryDoc of categoriesSnapshot.docs) {
        const category = categoryDoc.id;
        const itemsSnapshot = await getDocs(collection(db, 'products', category, 'items'));
        
        itemsSnapshot.forEach((itemDoc) => {
          const data = itemDoc.data();
          productsList.push({
            key: itemDoc.id,
            id: itemDoc.id,
            category,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            showOfferBand: data.showOfferBand || false
          });
        });
      }
      
      setProducts(productsList);
      setFilteredProducts(productsList);
    } catch (err) {
      console.error('Error fetching products:', err);
      message.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = useCallback(async (product) => {
    await handleDelete(
      product, 
      setProducts, 
      setFilteredProducts, 
      setIsDeleteModalVisible, 
      setLoading
    );
  }, []);

  const onToggleOfferBand = useCallback((product) => {
    toggleOfferBand(
      product, 
      products, 
      setProducts, 
      setFilteredProducts
    );
  }, [products]);

  const onSearch = useCallback((value) => {
    handleSearch(value, products, setSearchText, setFilteredProducts);
  }, [products]);

  const columns = getColumns(
    navigate, 
    onToggleOfferBand, 
    setSelectedProduct, 
    setIsViewModalVisible, 
    setIsDeleteModalVisible
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <TopNavBar />
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '20px',
        ...(isClient && window.innerWidth <= 768 && { padding: '16px' })
      }}>
        {/* Header and search */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 500,
              color: '#333'
            }}>
              Manage Products
            </h1>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Search
                placeholder="Search products..."
                allowClear
                onSearch={onSearch}
                style={{ width: 250 }}
              />
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => navigate('/add-product')}
              >
                Add Product
              </Button>
            </div>
          </div>
        </div>

        {/* Products table */}
        <Card>
          <Table 
            columns={columns} 
            dataSource={filteredProducts}
            loading={loading}
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} products`
            }}
            scroll={{ x: true }}
            rowKey="id"
            locale={{
              emptyText: (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }}>
                    <ImageOutlined />
                  </div>
                  <h3 style={{ marginBottom: '8px', color: '#333' }}>
                    {searchText ? 'No products found' : 'No products yet'}
                  </h3>
                  <p style={{ color: '#666', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                    {searchText ? 
                      'Try adjusting your search or filter to find what you\'re looking for.' : 
                      'Get started by adding your first product.'
                    }
                  </p>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/add-product')}
                  >
                    Add Product
                  </Button>
                </div>
              )
            }}
          />
        </Card>

        {/* View Product Modal */}
        <Modal
          title="Product Details"
          open={isViewModalVisible}
          onCancel={() => setIsViewModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsViewModalVisible(false)}>
              Close
            </Button>,
            <Button
              key="edit"
              type="primary"
              onClick={() => {
                setIsViewModalVisible(false);
                navigate(`/edit-product/${selectedProduct?.category}/${selectedProduct?.id}`);
              }}
            >
              Edit Product
            </Button>
          ]}
          width={800}
        >
          {selectedProduct && (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                {selectedProduct.imageUrls?.length > 0 ? (
                  <Image.PreviewGroup>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {selectedProduct.imageUrls.map((img, index) => (
                        <Image
                          key={index}
                          src={img}
                          width={120}
                          height={120}
                          style={{ objectFit: 'cover', borderRadius: 4 }}
                        />
                      ))}
                    </div>
                  </Image.PreviewGroup>
                ) : (
                  <div style={{
                    width: '100%',
                    height: 200,
                    backgroundColor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4
                  }}>
                    <ImageOutlined style={{ fontSize: 40, color: '#999' }} />
                  </div>
                )}
              </div>
              <div style={{ flex: '2 1 300px' }}>
                <h2 style={{ marginTop: 0 }}>{selectedProduct.name}</h2>
                {selectedProduct.nameTamil && (
                  <p style={{ color: '#666', marginBottom: 15 }}>{selectedProduct.nameTamil}</p>
                )}
                
                <div style={{ marginBottom: 15 }}>
                  <div style={{ display: 'flex', marginBottom: 8 }}>
                    <Text strong style={{ width: 120 }}>Category:</Text>
                    <Text>{selectedProduct.category}</Text>
                  </div>
                  <div style={{ display: 'flex', marginBottom: 8 }}>
                    <Text strong style={{ width: 120 }}>Price:</Text>
                    <Text>₹{selectedProduct.price?.toLocaleString('en-IN')}</Text>
                  </div>
                  <div style={{ display: 'flex', marginBottom: 8 }}>
                    <Text strong style={{ width: 120 }}>Stock:</Text>
                    <Text>{selectedProduct.stock || 0} units</Text>
                  </div>
                  <div style={{ display: 'flex', marginBottom: 8 }}>
                    <Text strong style={{ width: 120 }}>Offer Band:</Text>
                    <Tag color={selectedProduct.showOfferBand ? 'green' : 'default'}>
                      {selectedProduct.showOfferBand ? 'Visible' : 'Hidden'}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', marginBottom: 8 }}>
                    <Text strong style={{ width: 120 }}>Created:</Text>
                    <Text>{
                      selectedProduct.createdAt?.toLocaleDateString?.() || 'N/A'
                    }</Text>
                  </div>
                </div>

                {selectedProduct.description && (
                  <div style={{ marginTop: 15 }}>
                    <Text strong>Description:</Text>
                    <div style={{ 
                      marginTop: 5, 
                      padding: 10, 
                      backgroundColor: '#f9f9f9', 
                      borderRadius: 4 
                    }}>
                      {selectedProduct.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          title="Delete Product"
          open={isDeleteModalVisible}
          onOk={() => onDelete(selectedProduct)}
          onCancel={() => setIsDeleteModalVisible(false)}
          confirmLoading={loading}
        >
          <p>Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone.</p>
          {selectedProduct?.imageUrls?.length > 0 && (
            <Alert 
              message="Warning" 
              description="All associated product images will also be deleted from storage."
              type="warning" 
              showIcon 
              style={{ marginTop: 10 }}
            />
          )}
        </Modal>
      </div>
    </div>
  );
}

export default ManageProducts;
