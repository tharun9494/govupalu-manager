import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  CreditCard, 
  TrendingUp, 
  Menu, 
  X,
  Bell,
  Search,
  User,
  Plus,
  BarChart3,
  Settings
} from 'lucide-react';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  const quickLinks = [
    { 
      id: 'add-order', 
      label: 'Add Order', 
      icon: ShoppingCart, 
      color: 'bg-primary-600 hover:bg-primary-700',
      page: 'orders'
    },
    { 
      id: 'add-inventory', 
      label: 'Update Stock', 
      icon: Package, 
      color: 'bg-success-600 hover:bg-success-700',
      page: 'inventory'
    },
    { 
      id: 'add-payment', 
      label: 'Record Payment', 
      icon: CreditCard, 
      color: 'bg-purple-600 hover:bg-purple-700',
      page: 'payments'
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3, 
      color: 'bg-gray-600 hover:bg-gray-700',
      page: 'analytics'
    },
  ];

  const handleQuickLink = (page: string) => {
    onPageChange(page);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-large transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative lg:inset-auto
      `}>
        {/* Logo Section */}
        <div className="flex items-center justify-between h-16 sm:h-20 px-4 sm:px-6 border-b border-gray-100">
          <Logo size="sm" showTagline={false} />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 sm:mt-8 px-3 sm:px-4">
          <div className="space-y-1 sm:space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center px-3 sm:px-4 py-2.5 sm:py-3 text-left rounded-xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600 shadow-soft' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 transition-colors ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span className="font-medium text-sm sm:text-base">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 border-t border-gray-100">
          <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-xl bg-gray-50">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <User className="w-3 h-3 sm:w-4 sm:h-4 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">Admin User</p>
              <p className="text-xs text-gray-500 truncate">admin@govupalu.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-0">
        {/* Top bar */}
        <div className="bg-white shadow-soft border-b border-gray-100 h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 capitalize">
                {currentPage}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Manage your milk business</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-2 bg-gray-50 rounded-lg px-3 sm:px-4 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400 w-40 sm:w-48"
              />
            </div>
            
            {/* Mobile Search Button */}
            <button className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <Search className="w-5 h-5" />
            </button>
            
            {/* Notifications */}
            <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
            </button>
            
            {/* User Avatar */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <span className="text-primary-600 font-semibold text-xs sm:text-sm">A</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links Bar */}
        <div className="bg-white border-b border-gray-100 px-3 sm:px-6 py-2 sm:py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:block">Quick Actions:</span>
                <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-hide flex-1">
                  {quickLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <button
                        key={link.id}
                        onClick={() => handleQuickLink(link.page)}
                        className={`
                          ${link.color} text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium 
                          transition-all duration-200 flex items-center space-x-1 sm:space-x-2 whitespace-nowrap
                          hover:scale-105 active:scale-95 shadow-sm hover:shadow-md flex-shrink-0
                        `}
                      >
                        <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">{link.label}</span>
                        <span className="xs:hidden">{link.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Settings Link */}
              <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-2">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-3 sm:p-4 md:p-6 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;