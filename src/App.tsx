import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Orders from './components/Orders';
import Payments from './components/Payments';
import Analytics from './components/Analytics';
import Subscriptions from './components/Subscriptions';
import Products from './components/Products';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [autoOpenModal, setAutoOpenModal] = useState(false);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    // Reset autoOpenModal after navigation
    setAutoOpenModal(false);
  };

  const handleQuickAction = (page: string) => {
    setCurrentPage(page);
    setAutoOpenModal(true);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={handleQuickAction} />;
      case 'inventory':
        return <Inventory autoOpenModal={autoOpenModal} />;
      case 'orders':
        return <Orders autoOpenModal={autoOpenModal} />;
      case 'payments':
        return <Payments autoOpenModal={autoOpenModal} />;
      case 'subscriptions':
        return <Subscriptions autoOpenModal={autoOpenModal} />;
      case 'analytics':
        return <Analytics />;
      case 'products':
        return <Products autoOpenModal={autoOpenModal} />;
      default:
        return <Dashboard onPageChange={handleQuickAction} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={handlePageChange}>
      {renderPage()}
    </Layout>
  );
}

export default App;