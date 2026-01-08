import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Orders from './components/Orders';
import Payments from './components/Payments';
import Analytics from './components/Analytics';
import Subscriptions from './components/Subscriptions';
import Products from './components/Products';
import Customers from './components/Customers';
import Reports from './components/Reports';
import Settings from './components/Settings';
import AuthGate from './components/AuthGate';

const AUTH_EMAIL = import.meta.env.VITE_DASHBOARD_EMAIL ?? 'govupalu@gmail.com';
const AUTH_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD ?? '123456';
const AUTH_STORAGE_KEY = 'govupalu-dashboard-authenticated';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [autoOpenModal, setAutoOpenModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  });

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  };

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
      case 'customers':
        return <Customers />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onPageChange={handleQuickAction} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <AuthGate
        onSuccess={handleAuthSuccess}
        expectedEmail={AUTH_EMAIL}
        expectedPassword={AUTH_PASSWORD}
      />
    );
  }

  return (
    <Layout
      currentPage={currentPage}
      onPageChange={handlePageChange}
      onLogout={handleLogout}
      userEmail={AUTH_EMAIL}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;