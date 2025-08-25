import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import {
    Table,
    Button,
    Card,
    message,
    Tag,
    Switch,
    Space,
    Modal,
    Input,
    Image,
    Typography,
    Alert,
    Row,
    Col,
    Descriptions,
    Divider,
} from 'antd';
import {
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    PictureOutlined,
} from '@ant-design/icons';
import TopNavBar from '../components/TopNavBar';
import BackButton from '../components/BackButton';

const { Text } = Typography;
const { Search } = Input;

// Base styles
const containerStyle = {
    maxWidth: 1200,
    margin: '40px auto',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
    padding: 32,
};

const productsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '24px',
    width: '100%',
};

// Media query breakpoints
const breakpoints = {
    tablet: 768,
    mobile: 480,
};

// Check if window is defined (for SSR)
const isClient = typeof window !== 'undefined';

// Helper function to get current screen size
const getScreenSize = () => {
    if (!isClient) return 'desktop';
    const width = window.innerWidth;
    if (width <= breakpoints.mobile) return 'mobile';
    if (width <= breakpoints.tablet) return 'tablet';
    return 'desktop';
};

// Responsive styles generator
const responsiveStyles = (styles) => {
    if (!isClient) return styles;

    const screenSize = getScreenSize();
    const responsiveStyle = { ...styles };

    // Apply mobile styles
    if (screenSize === 'mobile' && styles.mobile) {
        Object.assign(responsiveStyle, styles.mobile);
    }

    // Apply tablet styles (also applies to mobile if not overridden)
    if (screenSize === 'tablet' && styles.tablet) {
        Object.assign(responsiveStyle, styles.tablet);
    }

    return responsiveStyle;
};

// Container style with responsive variants
const getContainerStyle = () =>
    responsiveStyles({
        ...containerStyle,
        tablet: {
            padding: '16px',
        },
        mobile: {
            padding: '12px',
            margin: '20px 10px',
            borderRadius: '8px',
        },
    });

// Products grid style with responsive variants
const getProductsGridStyle = () =>
    responsiveStyles({
        ...productsGridStyle,
        tablet: {
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
        },
        mobile: {
            gridTemplateColumns: '1fr',
            gap: '12px',
        },
    });

// Product card style with hover effect and responsive variants
const getProductCardStyle = () => {
    const baseStyle = {
        background: '#fafafa',
        borderRadius: 8,
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        padding: 16,
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        // Note: Inline styles in React don't support pseudo-selectors like :hover.
        // You'll need to use CSS modules or a styling library for that.
    };

    return responsiveStyles({
        ...baseStyle,
        tablet: {
            padding: '12px',
        },
    });
};

// Product actions style with responsive variants
const getProductActionsStyle = () =>
    responsiveStyles({
        marginTop: 'auto',
        display: 'flex',
        gap: 8,
        paddingTop: 12,
        mobile: {
            flexDirection: 'column',
            gap: '8px',
        },
    });

const productCardStyle = {
    background: '#fafafa',
    borderRadius: 8,
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
    padding: 16,
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    transition: 'transform 0.2s, box-shadow 0.2s',
};

const productImageStyle = {
    marginBottom: 12,
    width: '100%',
    height: 180,
    borderRadius: 6,
    border: '1px solid #eee',
    overflow: 'hidden',
};

const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
};

const productTitleStyle = {
    fontSize: 16,
    fontWeight: 600,
    margin: '8px 0',
    color: '#333',
};

const productDetailStyle = {
    fontSize: 14,
    color: '#666',
    margin: '4px 0',
};

const productPriceStyle = {
    fontWeight: 600,
    color: '#1890ff',
    margin: '8px 0',
};

const productActionsStyle = {
    marginTop: 'auto',
    display: 'flex',
    gap: 8,
    paddingTop: 12,
};

const buttonBaseStyle = {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s',
    textAlign: 'center',
};

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
    const [screenSize, setScreenSize] = useState(getScreenSize());

    useEffect(() => {
        fetchProducts();
        setIsClient(true);
    }, []);

    // Fetch all products from all categories' items subcollections
    const fetchProducts = async () => {
        setLoading(true);
        try {
            console.log('Starting to fetch products...');
            let productsList = [];
            
            // Define the categories we're interested in
            const targetCategories = ['sweets', 'Chips']; // Add other categories as needed
            console.log('Target categories:', targetCategories);
            
            // Fetch products from each category's 'items' subcollection
            for (const category of targetCategories) {
                try {
                    console.log(`Fetching items for category: ${category}`);
                    const itemsSnapshot = await getDocs(
                        collection(db, 'products', category, 'items')
                    );
                    
                    console.log(`Found ${itemsSnapshot.size} items in category: ${category}`);
                    
                    itemsSnapshot.forEach((itemDoc) => {
                        const productData = itemDoc.data();
                        console.log(`Product data for ${itemDoc.id}:`, productData);
                        
                        // Process options to ensure they're in the correct format
                        const processedOptions = (productData.options || []).map(option => ({
                            ...option,
                            size: option.unitSize || option.size || '',
                            unit: option.unit || 'piece',
                            mrp: parseFloat(option.mrp) || 0,
                            sellingPrice: parseFloat(option.sellingPrice) || 0,
                            specialPrice: parseFloat(option.specialPrice) || 0,
                            stockQuantity: parseInt(option.quantity) || 0,
                            inStock: (parseInt(option.quantity) || 0) > 0
                        }));
                        
                        productsList.push({
                            id: itemDoc.id,
                            category: productData.category || category,
                            name: productData.name || 'Unnamed Product',
                            nameTamil: productData.nameTamil || '',
                            description: productData.description || '',
                            keywords: productData.keywords ? productData.keywords.split(',').map(k => k.trim()) : [],
                            imageUrls: Array.isArray(productData.imageUrls) ? 
                                productData.imageUrls : 
                                (productData.imageUrl ? [productData.imageUrl] : []),
                            options: processedOptions,
                            active: productData.active !== undefined ? productData.active : true,
                            createdAt: productData.createdAt?.toDate ? productData.createdAt.toDate() : new Date(),
                            updatedAt: productData.updatedAt?.toDate ? productData.updatedAt.toDate() : new Date()
                        });
                    });
                } catch (error) {
                    console.error(`Error fetching items for category ${category}:`, error);
                }
            }
            
            console.log(`Total products found: ${productsList.length}`);
            console.log('Products list:', productsList);
            
            setProducts(productsList);
            setFilteredProducts(productsList);
            
            if (productsList.length === 0) {
                console.log('No products found in any category');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            message.error('Failed to fetch products');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (product) => {
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
            setProducts(products.filter((p) => p.id !== id));
            setFilteredProducts(filteredProducts.filter((p) => p.id !== id));
        } catch (err) {
            console.error('Error deleting product:', err);
            message.error('Failed to delete product');
        } finally {
            setIsDeleteModalVisible(false);
        }
    };

    const toggleOfferBand = async (product) => {
        try {
            const productRef = doc(
                db,
                'products',
                product.category,
                'items',
                product.id
            );
            await updateDoc(productRef, {
                showOfferBand: !product.showOfferBand,
            });

            const updatedProducts = products.map((p) =>
                p.id === product.id ? { ...p, showOfferBand: !p.showOfferBand } : p
            );

            setProducts(updatedProducts);
            setFilteredProducts(
                updatedProducts.filter((p) =>
                    filteredProducts.some((fp) => fp.id === p.id)
                )
            );

            message.success(
                `Offer band ${!product.showOfferBand ? 'enabled' : 'disabled'}`
            );
        } catch (err) {
            console.error('Error updating offer band:', err);
            message.error('Failed to update offer band');
        }
    };

    const handleSearch = (value) => {
        setSearchText(value);
        const filtered = products.filter(
            (p) =>
                p.name?.toLowerCase().includes(value.toLowerCase()) ||
                p.nameTamil?.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredProducts(filtered);
    };

    const columns = [
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
                            <PictureOutlined />
                        </div>
                    )}
                    <div>
                        <div style={{ fontWeight: 500 }}>{text}</div>
                        {record.nameTamil && (
                            <div style={{ fontSize: 12, color: '#666' }}>
                                {record.nameTamil}
                            </div>
                        )}
                        <div style={{ fontSize: 12, color: '#999' }}>
                            {record.category}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Price Range',
            key: 'price',
            render: (_, record) => {
                if (!record.options || record.options.length === 0) {
                    return 'N/A';
                }
                const prices = record.options.map(opt => opt.sellingPrice || 0);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                return `₹${minPrice} - ₹${maxPrice}`;
            },
            sorter: (a, b) => {
                const getMinPrice = (item) => {
                    if (!item.options || item.options.length === 0) return 0;
                    return Math.min(...item.options.map(opt => opt.sellingPrice || 0));
                };
                return getMinPrice(a) - getMinPrice(b);
            },
        },
        {
            title: 'Available Sizes',
            key: 'sizes',
            render: (_, record) => {
                if (!record.options || record.options.length === 0) {
                    return 'N/A';
                }
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {record.options.map((opt, index) => (
                            <Tag key={index} color="blue">
                                {opt.unitSize} {opt.unit}
                            </Tag>
                        ))}
                    </div>
                );
            },
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            filters: Array.from(new Set(products.map(p => p.category))).map(cat => ({
                text: cat,
                value: cat,
            })),
            onFilter: (value, record) => record.category === value,
            render: (category) => (
                <Tag color="purple" style={{ textTransform: 'capitalize' }}>
                    {category}
                </Tag>
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
                        onClick={() =>
                            navigate(`/edit-product/${record.category}/${record.id}`)
                        }
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

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
            <TopNavBar />
            <div
                style={{
                    maxWidth: 1200,
                    margin: '0 auto',
                    padding: '20px',
                    ...(isClient && window.innerWidth <= 768 && { padding: '16px' }),
                }}
            >
                <div style={{ marginBottom: 24 }}>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: isClient && window.innerWidth <= 768 ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: isClient && window.innerWidth <= 768 ? 'stretch' : 'center',
                            gap: '16px',
                            marginBottom: '24px',
                        }}
                    >
                        <h1 style={{ margin: 0, textAlign: isClient && window.innerWidth <= 768 ? 'center' : 'left' }}>Manage Products</h1>
                        <div style={{
                            display: 'flex',
                            flexDirection: isClient && window.innerWidth <= 768 ? 'column' : 'row',
                            gap: '12px',
                            width: isClient && window.innerWidth <= 768 ? '100%' : 'auto'
                        }}>
                            <Input.Search
                                placeholder="Search products..."
                                allowClear
                                onSearch={handleSearch}
                                style={{ width: isClient && window.innerWidth <= 768 ? '100%' : 250 }}
                            />
                            <Button 
                                type="primary" 
                                icon={<PlusOutlined />}
                                onClick={() => navigate('/add-product')}
                                style={isClient && window.innerWidth <= 768 ? { width: '100%' } : {}}
                            >
                                {isClient && window.innerWidth > 480 ? 'Add Product' : 'Add'}
                            </Button>
                        </div>
                    </div>

                    <Card>
                        <Table
                            columns={columns}
                            dataSource={filteredProducts}
                            loading={loading}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showTotal: (total, range) =>
                                    `${range[0]}-${range[1]} of ${total} products`,
                            }}
                            scroll={{ x: true }}
                            rowKey="id"
                        />
                    </Card>
                </div>

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
                                navigate(`/edit-product/${selectedProduct.category}/${selectedProduct.id}`);
                            }}
                        >
                            Edit Product
                        </Button>
                    ]}
                    width={800}
                >
                    {selectedProduct && (
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            {/* Left Column - Images */}
                            <div style={{ flex: '1 1 300px' }}>
                                {selectedProduct.imageUrls?.length > 0 ? (
                                    <Image.PreviewGroup>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                                            {selectedProduct.imageUrls.map((img, index) => (
                                                <Image
                                                    key={index}
                                                    src={img}
                                                    width={120}
                                                    height={120}
                                                    style={{ 
                                                        objectFit: 'cover', 
                                                        borderRadius: 8,
                                                        border: '1px solid #f0f0f0'
                                                    }}
                                                    alt={`Product ${index + 1}`}
                                                />
                                            ))}
                                        </div>
                                    </Image.PreviewGroup>
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        height: 200,
                                        backgroundColor: '#fafafa',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 8,
                                    }}>
                                        <PictureOutlined style={{ fontSize: 48, marginBottom: 8 }} />
                                        <div>No images available</div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column - Product Details */}
                            <div style={{ flex: '1 1 300px' }}>
                                <Card title="Product Information" style={{ marginBottom: 16 }}>
                                    <Descriptions column={1} bordered size="small">
                                        <Descriptions.Item label="Name">{selectedProduct.name}</Descriptions.Item>
                                        {selectedProduct.nameTamil && (
                                            <Descriptions.Item label="Tamil Name">{selectedProduct.nameTamil}</Descriptions.Item>
                                        )}
                                        <Descriptions.Item label="Category">
                                            {selectedProduct.category}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Description">
                                            {selectedProduct.description || 'No description available'}
                                        </Descriptions.Item>
                                        {selectedProduct.keywords?.length > 0 && (
                                            <Descriptions.Item label="Keywords">
                                                {selectedProduct.keywords.join(', ')}
                                            </Descriptions.Item>
                                        )}
                                        <Descriptions.Item label="Status">
                                            <Tag color={selectedProduct.active ? 'green' : 'red'}>
                                                {selectedProduct.active ? 'Active' : 'Inactive'}
                                            </Tag>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>

                                {selectedProduct.options?.length > 0 && (
                                    <Card title="Product Options" style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'grid', gap: '12px' }}>
                                            {selectedProduct.options.map((option, index) => (
                                                <Card
                                                    key={index}
                                                    type="inner"
                                                    title={`Option ${index + 1}`}
                                                    style={{ backgroundColor: '#fafafa' }}
                                                >
                                                    <Descriptions column={1} bordered size="small">
                                                        <Descriptions.Item label="Size/Unit">
                                                            {option.size || option.unit || 'N/A'}
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="MRP">
                                                            ₹{option.mrp?.toFixed(2) || '0.00'}
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="Selling Price">
                                                            ₹{option.sellingPrice?.toFixed(2) || '0.00'}
                                                        </Descriptions.Item>
                                                        {option.specialPrice && (
                                                            <Descriptions.Item label="Special Price">
                                                                ₹{option.specialPrice.toFixed(2)}
                                                            </Descriptions.Item>
                                                        )}
                                                        <Descriptions.Item label="Stock">
                                                            {option.inStock ? (
                                                                <Tag color="green">In Stock</Tag>
                                                            ) : (
                                                                <Tag color="red">Out of Stock</Tag>
                                                            )}
                                                        </Descriptions.Item>
                                                        <Descriptions.Item label="Stock Quantity">
                                                            {option.stockQuantity || 0}
                                                        </Descriptions.Item>
                                                    </Descriptions>
                                                </Card>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                <Card title="Additional Information">
                                    <Descriptions column={1} bordered size="small">
                                        <Descriptions.Item label="Product ID">
                                            <Text copyable>{selectedProduct.id}</Text>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Created At">
                                            {selectedProduct.createdAt?.toDate?.().toLocaleString() || 'N/A'}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Last Updated">
                                            {selectedProduct.updatedAt?.toDate?.().toLocaleString() || 'N/A'}
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    title="Delete Product"
                    open={isDeleteModalVisible}
                    onOk={() => handleDelete(selectedProduct)}
                    onCancel={() => setIsDeleteModalVisible(false)}
                    confirmLoading={loading}
                >
                    <p>
                        Are you sure you want to delete "{selectedProduct?.name}"? This action
                        cannot be undone.
                    </p>
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