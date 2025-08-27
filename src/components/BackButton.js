import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';

function BackButton({ to = -1, label = 'Back', style = {}, className = '' }) {
  const navigate = useNavigate();
  
  return (
    <Button 
      type="text"
      icon={<ArrowLeftOutlined />}
      onClick={() => navigate(to)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        margin: '8px 0 16px',
        color: '#1890ff',
        fontWeight: 500,
        ...style
      }}
      className={`back-button ${className}`}
    >
      {label}
    </Button>
  );
}

export default BackButton;
