import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Drawer } from 'antd';
import { 
  DashboardOutlined, 
  ShoppingCartOutlined, 
  ClockCircleOutlined, 
  CarOutlined, 
  CheckCircleOutlined, 
  UndoOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LeftOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const OrderManagementLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const location = useLocation();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // Get the current path to set the default selected key
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('pending')) return 'pending';
    if (path.includes('processing')) return 'processing';
    if (path.includes('shipped')) return 'shipped';
    if (path.includes('in-transit')) return 'in-transit';
    if (path.includes('delivered')) return 'delivered';
    if (path.includes('returned')) return 'returned';
    if (path.includes('cancelled')) return 'cancelled';
    return 'dashboard';
  };

  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  // Close drawer when a menu item is clicked
  const handleMenuClick = () => {
    if (window.innerWidth <= 768) {
      setDrawerVisible(false);
    }
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Menu items
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/orders/dashboard">Dashboard</Link>,
    },
    {
      key: 'pending',
      icon: <ClockCircleOutlined />,
      label: <Link to="/orders/pending">Pending Orders</Link>,
    },
    {
      key: 'processing',
      icon: <SyncOutlined />,
      label: <Link to="/orders/processing">Processing Orders</Link>,
    },
    {
      key: 'shipped',
      icon: <ShoppingCartOutlined />,
      label: <Link to="/orders/shipped">Shipped Orders</Link>,
    },
    {
      key: 'in-transit',
      icon: <CarOutlined />,
      label: <Link to="/orders/in-transit">In Transit</Link>,
    },
    {
      key: 'delivered',
      icon: <CheckCircleOutlined />,
      label: <Link to="/orders/delivered">Delivered</Link>,
    },
    {
      key: 'returned',
      icon: <UndoOutlined />,
      label: <Link to="/orders/returned">Returned</Link>,
    },
    {
      key: 'cancelled',
      icon: <CloseCircleOutlined />,
      label: <Link to="/orders/cancelled">Cancelled</Link>,
    },
  ];

  // Sidebar content
  const showSidebarHeading = drawerVisible || !collapsed;
  const sidebarContent = (
    <div className="h-full flex flex-col">
      {showSidebarHeading && (
        <div className="p-3 md:p-4">
          <h2 className="text-white text-lg md:text-xl font-bold m-0">Order Management</h2>
        </div>
      )}
      <Menu
        theme="dark"
        mode="inline"
        defaultSelectedKeys={[getSelectedKey()]}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </div>
  );

  return (
    <Layout className="min-h-screen">
      {/* Desktop Sidebar */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed} 
        className="hidden md:block"
        width={250}
      >
        {sidebarContent}
      </Sider>

      {/* Mobile Drawer */}
      <Drawer
        title={null}
        placement="left"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        styles={{
          body: { padding: 0 }
        }}
        width={250}
      >
        {sidebarContent}
      </Drawer>

      <Layout>
        <Header 
          style={{ padding: 0, background: colorBgContainer }} 
          className="flex items-center px-2 md:px-4 h-12 md:h-16"
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => window.innerWidth <= 768 ? setDrawerVisible(true) : setCollapsed(!collapsed)}
            className="text-lg w-10 h-10 md:w-12 md:h-12"
          />
          <Link to="/" className="ml-1 md:ml-2" aria-label="Back to Admin Home">
            <Button
              type="text"
              icon={<LeftOutlined />}
              className="text-lg w-10 h-10 md:w-auto md:h-auto"
            >
              <span className="hidden md:inline">Back to Home</span>
            </Button>
          </Link>
          {/* Removed page title to avoid overlap/hidden heading issues */}
        </Header>
        <Content
          style={{
            margin: window.innerWidth <= 768 ? '12px 8px' : '24px 16px',
            padding: window.innerWidth <= 768 ? 12 : 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: 8,
          }}
          className="overflow-y-auto overflow-x-hidden"
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default OrderManagementLayout;
