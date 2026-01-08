import React, { useState } from 'react';
import { Save, Bell, Palette, Globe, Database, HelpCircle, Download, Upload } from 'lucide-react';

interface SettingsState {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    lowStock: boolean;
    newOrders: boolean;
    paymentReminders: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    language: 'en' | 'hi' | 'te';
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    currency: 'INR' | 'USD' | 'EUR';
  };
  business: {
    name: string;
    phone: string;
    email: string;
    address: string;
    taxRate: number;
    defaultPrice: number;
  };
  data: {
    autoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    exportFormat: 'csv' | 'excel' | 'json';
  };
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      email: true,
      push: true,
      sms: false,
      lowStock: true,
      newOrders: true,
      paymentReminders: true
    },
    appearance: {
      theme: 'light',
      language: 'en',
      dateFormat: 'DD/MM/YYYY',
      currency: 'INR'
    },
    business: {
      name: 'Govupalu Dairy',
      phone: '+91 98765 43210',
      email: 'info@govupalu.com',
      address: '123 Main Street, Hyderabad, Telangana 500001',
      taxRate: 5,
      defaultPrice: 60
    },
    data: {
      autoBackup: true,
      backupFrequency: 'daily',
      exportFormat: 'csv'
    }
  });

  const [activeTab, setActiveTab] = useState<'notifications' | 'appearance' | 'business' | 'data'>('notifications');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to localStorage for demo
      localStorage.setItem('app-settings', JSON.stringify(settings));
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setSettings(imported);
          setMessage({ type: 'success', text: 'Settings imported successfully!' });
        } catch (error) {
          setMessage({ type: 'error', text: 'Failed to import settings' });
        }
      };
      reader.readAsText(file);
    }
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'business', label: 'Business', icon: Globe },
    { id: 'data', label: 'Data & Backup', icon: Database }
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 bg-white rounded-lg shadow-sm border border-gray-200">
          <nav className="p-4">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors mb-2 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>
              
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Channels</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
                      { key: 'push', label: 'Push Notifications', description: 'Browser push notifications' },
                      { key: 'sms', label: 'SMS Notifications', description: 'Receive text messages' }
                    ].map(({ key, label, description }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{label}</div>
                          <div className="text-sm text-gray-500">{description}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications[key as keyof typeof settings.notifications]}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, [key]: e.target.checked }
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Types</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'lowStock', label: 'Low Stock Alerts', description: 'When inventory runs low' },
                      { key: 'newOrders', label: 'New Orders', description: 'When customers place orders' },
                      { key: 'paymentReminders', label: 'Payment Reminders', description: 'Pending payment notifications' }
                    ].map(({ key, label, description }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{label}</div>
                          <div className="text-sm text-gray-500">{description}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications[key as keyof typeof settings.notifications]}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              notifications: { ...prev.notifications, [key]: e.target.checked }
                            }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Appearance</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                  <select
                    value={settings.appearance.theme}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, theme: e.target.value as any }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select
                    value={settings.appearance.language}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, language: e.target.value as any }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                  <select
                    value={settings.appearance.dateFormat}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, dateFormat: e.target.value as any }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                  <select
                    value={settings.appearance.currency}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      appearance: { ...prev.appearance, currency: e.target.value as any }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="INR">₹ Indian Rupee (INR)</option>
                    <option value="USD">$ US Dollar (USD)</option>
                    <option value="EUR">€ Euro (EUR)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Business Settings */}
          {activeTab === 'business' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Business Information</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                  <input
                    type="text"
                    value={settings.business.name}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      business: { ...prev.business, name: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={settings.business.phone}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      business: { ...prev.business, phone: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={settings.business.email}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      business: { ...prev.business, email: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    value={settings.business.address}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      business: { ...prev.business, address: e.target.value }
                    }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                    <input
                      type="number"
                      value={settings.business.taxRate}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        business: { ...prev.business, taxRate: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Milk Price (₹/L)</label>
                    <input
                      type="number"
                      value={settings.business.defaultPrice}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        business: { ...prev.business, defaultPrice: parseFloat(e.target.value) || 0 }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data & Backup Settings */}
          {activeTab === 'data' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Data & Backup</h2>
              
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Automatic Backup</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Auto Backup</div>
                        <div className="text-sm text-gray-500">Automatically backup your data</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.data.autoBackup}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            data: { ...prev.data, autoBackup: e.target.checked }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                      <select
                        value={settings.data.backupFrequency}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          data: { ...prev.data, backupFrequency: e.target.value as any }
                        }))}
                        disabled={!settings.data.autoBackup}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Export Format</h3>
                  <select
                    value={settings.data.exportFormat}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      data: { ...prev.data, exportFormat: e.target.value as any }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="csv">CSV (Comma Separated Values)</option>
                    <option value="excel">Excel (.xlsx)</option>
                    <option value="json">JSON (JavaScript Object Notation)</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Data Storage</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Your data is securely stored in Firebase cloud storage and automatically synchronized across all your devices. 
                        Regular backups ensure you never lose important business information.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
