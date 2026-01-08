import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, Info, Package, CreditCard, TrendingUp } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Notifications: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { inventory, orders, payments } = useFirestore();

  // Generate notifications based on data
  useEffect(() => {
    const newNotifications: Notification[] = [];

    // Low stock alerts
    inventory.forEach(item => {
      if (item.stockRemaining < 10 && item.stockRemaining > 0) {
        newNotifications.push({
          id: `low-stock-${item.id}`,
          type: 'warning',
          title: 'Low Stock Alert',
          message: `Only ${item.stockRemaining} units remaining in inventory`,
          timestamp: new Date(),
          read: false,
          action: {
            label: 'View Inventory',
            onClick: () => {
              // Navigate to inventory page
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventory' }));
            }
          }
        });
      }
    });

    // New orders
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(order => order.orderDate === today && order.status === 'pending');
    if (todayOrders.length > 0) {
      newNotifications.push({
        id: 'new-orders',
        type: 'info',
        title: 'New Orders',
        message: `${todayOrders.length} pending orders for today`,
        timestamp: new Date(),
        read: false,
        action: {
          label: 'View Orders',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'orders' }));
          }
        }
      });
    }

    // Payment reminders
    const pendingPayments = payments.filter(payment => payment.status === 'pending');
    if (pendingPayments.length > 0) {
      newNotifications.push({
        id: 'pending-payments',
        type: 'warning',
        title: 'Pending Payments',
        message: `${pendingPayments.length} payments pending`,
        timestamp: new Date(),
        read: false,
        action: {
          label: 'View Payments',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'payments' }));
          }
        }
      });
    }

    setNotifications(prev => {
      const existing = prev.filter(n => !newNotifications.find(nn => nn.id === n.id));
      return [...newNotifications, ...existing].slice(0, 20); // Keep only last 20
    });
  }, [inventory, orders, payments]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {notification.title}
                          </h4>
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <X className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {notification.timestamp.toLocaleTimeString()}
                          </span>
                          {notification.action && (
                            <button
                              onClick={() => {
                                notification.action!.onClick();
                                setIsOpen(false);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              {notification.action.label}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
