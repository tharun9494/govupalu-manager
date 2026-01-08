import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Product {
  id?: string;
  name: string;
  category: 'All Products' | 'Milk & Dairy Products' | 'Fresh Vegetables' | 'Leafy Greens' | 'Fresh Fruits';
  imageUrl: string;
  price: number;
  quantity?: string;
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface InventoryRecord {
  id?: string;
  date: string;         
  stockReceived: number;
  stockSold: number;
  stockRemaining: number;
  buyingPrice: number;
  sellingPrice: number;
  createdAt?: Timestamp;
}

// Firebase order structure (actual data from Firestore)
export interface FirebaseOrder {
  id?: string;  
  // Customer information
  name?: string; // Customer name
  userName?: string; // Alternate customer name
  phone?: string; // Customer phone
  customerName?: string; // Alternative field name
  customerPhone?: string; // Alternative field name
  userId?: string;
  userEmail?: string;
  
  // Location information
  liveLocationLink?: string; // Google Maps link
  lat?: number; // Latitude
  lng?: number; // Longitude
  pincode?: string; // Postal code
  state?: string; // State
  type?: string; // Address type (e.g., "home")
  homeLocation?: boolean;
  isDefault?: boolean;
  
  // Order information
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  orderStatus?: string;
  paymentMethod?: string;
  preferredTiming?: string;
  note?: string;
  transaction?: {
    amount?: number;
    date?: Timestamp;
    orderId?: string;
    paymentId?: string;
    status?: string; // completed, pending, failed
    [key: string]: any;
  };
  
  // Cart/Items information
  cartItems?: Array<{
    basePrice: number;
    category: string;
    name: string;
    price?: number;
    amount?: number;
    total?: number;
    pricePerUnit?: number;
    baseQuantity?: number;
    quantity?: number;
    qty?: number;
    quantityInLiters?: number;
    quantityInLiter?: number;
    liters?: number;
    totalQuantity?: number;
    quantityLabel?: string;
    quantityText?: string;
    description?: string;
    [key: string]: any;
  }>;
  
  // Subscription information (in case orders contain subscription data)
  frequency?: string;
  deliveryDays?: string[];
  quantity?: number;
  pricePerLiter?: number;
  totalAmount?: number;
  
  // Address information
  address?: string;
  completeAddress?: string;
  selectedAddress?: {
    address: string;
    phone?: string;
    city?: string;
    pincode?: string;
    state?: string;
    lat?: number;
    lng?: number;
    liveLocationLink?: string;
    name?: string;
    type?: string;
    isDefault?: boolean;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
  };
  
  // Any other fields that might exist
  [key: string]: any;
}

// User structure (from users collection)
export interface AppUser {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  imageUrl?: string;
  addresses?: Array<{
    address?: string;
    lat?: number;
    lng?: number;
    liveLocationLink?: string;
    isDefault?: boolean;
  }>;
  [key: string]: any;
}

// Application order structure (for UI display)
export interface Order {
  id?: string;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  locationLink?: string;
  orderItems: Array<{
    name: string;
    category: string;
    quantity: number;
    price: number;
    basePrice: number;
  }>;
  quantity: number;
  pricePerLiter: number;
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  orderDate: string;
  deliveryDate: string;
  deliveryTime?: 'morning' | 'evening';
  paymentType?: 'online' | 'offline';
  paymentMethod: string;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  orderTime?: string; // Time when order was placed (HH:mm format)
  completedTime?: string; // Time when order was completed (HH:mm format)
  cancelledTime?: string; // Time when order was cancelled (HH:mm format)
}

export interface Payment {
  id?: string;
  orderId: string;
  customerName: string;
  amount: number;
  type: 'online' | 'offline';
  status: 'completed' | 'pending';
  date: string;
  createdAt?: Timestamp;
}

export interface Subscription {
  id?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  mapLink?: string;
  quantity: number;
  pricePerLiter: number;
  totalAmount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  deliveryDays: string[];
  deliveryTimePreference?: 'morning' | 'evening' | 'both';
  attendance?: {
    [isoDate: string]: {
      morning?: boolean;
      evening?: boolean;
    }
  };
  startDate: string;
  endDate?: string | null;
  status: 'active' | 'paused' | 'cancelled';
  paymentType: 'online' | 'offline';
  paymentStatus?: 'paid' | 'pending' | 'overdue' | 'failed';
  autoRenew: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const parseNumericValue = (value: any): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const getFirstPositiveNumber = (...values: any[]): number => {
  for (const value of values) {
    const parsed = parseNumericValue(value);
    if (parsed > 0) return parsed;
  }
  return 0;
};

// Helper function to convert Firebase order to application order format
const convertFirebaseOrderToOrder = (firebaseOrder: FirebaseOrder, user?: AppUser): Order => {
  // Convert Firebase order to application format
  
  // Extract customer information (try multiple possible field names)
  const customerName = (user?.name) || 
                       firebaseOrder.selectedAddress?.name ||
                       firebaseOrder.name || 
                       firebaseOrder.userName || 
                       firebaseOrder.customerName || 
                       'Customer';
  const customerPhone = (user?.phone) || 
                       firebaseOrder.selectedAddress?.phone ||
                       firebaseOrder.phone || 
                       firebaseOrder.customerPhone || 
                       'N/A';
  
  // Extract address information
  const address = firebaseOrder.address || 
                  firebaseOrder.completeAddress || 
                  firebaseOrder.selectedAddress?.address || 
                  '';
  
  // Build address from available components
  const addressComponents = [];
  if (firebaseOrder.selectedAddress?.pincode) addressComponents.push(firebaseOrder.selectedAddress.pincode);
  else if (firebaseOrder.pincode) addressComponents.push(firebaseOrder.pincode);
  if (firebaseOrder.selectedAddress?.state) addressComponents.push(firebaseOrder.selectedAddress.state);
  else if (firebaseOrder.state) addressComponents.push(firebaseOrder.state);
  if (address) addressComponents.unshift(address);
  
  const customerAddress = addressComponents.length > 0 
    ? addressComponents.join(', ') 
    : 'Address not provided';
  
  // Extract location link
  const locationLink = firebaseOrder.selectedAddress?.liveLocationLink ||
                       firebaseOrder.liveLocationLink || 
                       user?.addresses?.find(a=>a.isDefault)?.liveLocationLink ||
                      (firebaseOrder.selectedAddress?.lat && firebaseOrder.selectedAddress?.lng ? 
                        `https://maps.google.com/?q=${firebaseOrder.selectedAddress.lat},${firebaseOrder.selectedAddress.lng}` : 
                        (firebaseOrder.lat && firebaseOrder.lng ? 
                          `https://maps.google.com/?q=${firebaseOrder.lat},${firebaseOrder.lng}` : 
                          (user?.addresses && user.addresses[0]?.lat && user.addresses[0]?.lng
                            ? `https://maps.google.com/?q=${user.addresses[0].lat},${user.addresses[0].lng}`
                            : undefined)));
  
  // Calculate total quantity and amount from cart items (if available)
  const defaultPricePerLiter = parseNumericValue(
    firebaseOrder.pricePerLiter ?? firebaseOrder.transaction?.pricePerLiter
  );

  const normalizedCartItems = (firebaseOrder.cartItems || []).map(item => {
    const rawQuantity = parseNumericValue(
      item.quantity
        ?? item.qty
        ?? item.quantityInLiters
        ?? item.quantityInLiter
        ?? item.liters
        ?? item.totalQuantity
        ?? item.baseQuantity
        ?? item.quantityLabel
        ?? item.quantityText
        ?? item.description
    );
    const price = parseNumericValue(
      item.price
        ?? item.amount
        ?? item.total
        ?? item.pricePerUnit
        ?? item.basePrice
        ?? defaultPricePerLiter
    );
    const basePrice = parseNumericValue(
      item.basePrice
        ?? item.price
        ?? defaultPricePerLiter
    );
    let normalizedQuantity = rawQuantity;
    if (normalizedQuantity <= 0 && (price > 0 || item.quantityLabel || item.quantityText)) {
      const parsedFromLabel = parseNumericValue(item.quantityLabel || item.quantityText);
      if (parsedFromLabel > 0) {
        normalizedQuantity = parsedFromLabel;
      }
    }
    if (normalizedQuantity <= 0 && price > 0) {
      normalizedQuantity = 1;
    }

    return {
      ...item,
      quantity: normalizedQuantity,
      price,
      basePrice
    };
  });

  const totalQuantity = normalizedCartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalAmount = normalizedCartItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
  
  // If no cart items, try to use direct quantity and amount fields
  const fallbackQuantity = getFirstPositiveNumber(
    firebaseOrder.quantity,
    firebaseOrder.qty,
    firebaseOrder.totalQuantity,
    firebaseOrder.quantityInLiters,
    firebaseOrder.quantityInLiter,
    firebaseOrder.quantityLiters,
    firebaseOrder.transaction?.quantity,
    firebaseOrder.subscription?.quantity,
    firebaseOrder.subscriptionQuantity,
    firebaseOrder.planQuantity,
    (firebaseOrder as any).plan?.quantity
  );

  const additionalItemCount = totalQuantity === 0 && normalizedCartItems.length > 0
    ? normalizedCartItems.filter(item => item.price > 0 || item.basePrice > 0).length
    : 0;

  const finalQuantity = totalQuantity
    || fallbackQuantity
    || additionalItemCount
    || (totalAmount > 0 ? 1 : 0);
  const finalAmount = totalAmount 
    || getFirstPositiveNumber(
      firebaseOrder.totalAmount,
      firebaseOrder.amount,
      firebaseOrder.transaction?.amount,
      firebaseOrder.transaction?.total,
      firebaseOrder.paymentAmount
    )
    || 0;
  
  const fallbackItemPrice = finalQuantity > 0
    ? finalAmount / finalQuantity
    : defaultPricePerLiter;
  
  // Map order status
  const statusMap: { [key: string]: 'pending' | 'completed' | 'cancelled' } = {
    'confirmed': 'pending',
    'delivered': 'completed',
    'cancelled': 'cancelled',
    'active': 'pending',
    'paused': 'pending'
  };
  
  // Format dates
  const createdAt = firebaseOrder.createdAt || firebaseOrder.transaction?.date;
  const orderDate = createdAt ? createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const orderTime = createdAt ? createdAt.toDate().toTimeString().split(' ')[0].substring(0, 5) : new Date().toTimeString().split(' ')[0].substring(0, 5);
  
  // Create order items from cart items or create a default item
  let orderItems = normalizedCartItems.map(item => ({
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    price: item.price,
    basePrice: item.basePrice
  }));

  orderItems = orderItems.map(item => ({
    ...item,
    price: item.price > 0 ? item.price : fallbackItemPrice,
    basePrice: item.basePrice > 0 ? item.basePrice : fallbackItemPrice,
    quantity: item.quantity > 0 ? item.quantity : 1
  }));
  
  // If no cart items but we have quantity/amount, create a default item
  if (orderItems.length === 0 && finalQuantity > 0) {
    orderItems = [{
      name: firebaseOrder.frequency ? `${firebaseOrder.frequency} Plan` : 'Milk Order',
      category: 'Milk & Dairy Products',
      quantity: finalQuantity,
      price: fallbackItemPrice,
      basePrice: fallbackItemPrice
    }];
  }

  const avgPricePerLiter = finalQuantity > 0
    ? finalAmount / finalQuantity
    : fallbackItemPrice;
  
  const convertedOrder = {
    id: firebaseOrder.id,
    orderNumber: firebaseOrder.id ? `#${firebaseOrder.id.substring(0, 8).toUpperCase()}` : 'N/A',
    customerName: customerName,
    customerPhone: customerPhone,
    customerAddress: customerAddress,
    locationLink: locationLink,
    orderItems: orderItems,
    quantity: finalQuantity,
    pricePerLiter: avgPricePerLiter,
    totalAmount: finalAmount,
    status: (firebaseOrder.transaction?.status === 'completed')
      ? 'completed'
      : (statusMap[firebaseOrder.orderStatus || 'confirmed'] || 'pending'),
    orderDate: orderDate,
    deliveryDate: orderDate, // Same as order date for now
    deliveryTime: (firebaseOrder.preferredTiming === 'morning' ? 'morning' : 'evening') as 'morning' | 'evening',
    paymentType: ((firebaseOrder.paymentMethod === 'cod' || (firebaseOrder.transaction?.paymentId?.startsWith('COD') ?? false)) ? 'offline' : 'online') as 'online' | 'offline',
    paymentMethod: (firebaseOrder.paymentMethod
      || (firebaseOrder.transaction?.paymentId?.startsWith('COD') ? 'COD' : undefined)
      || 'COD').toUpperCase(),
    notes: firebaseOrder.note || '',
    createdAt: firebaseOrder.createdAt,
    orderTime: orderTime
  };
  
  // Return the converted order
  
  return convertedOrder;
};

export const useFirestore = () => {
  // All hooks must be called in the same order every time
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listeners - this useEffect must be called after all useState hooks
  useEffect(() => {
    let unsubscribeInventory: (() => void) | undefined;
    let unsubscribeOrders: (() => void) | undefined;
    let unsubscribePayments: (() => void) | undefined;
    let unsubscribeUsers: (() => void) | undefined;
    let unsubscribeSubscriptions: (() => void) | undefined;
    let unsubscribeProducts: (() => void) | undefined;

    try {
      unsubscribeInventory = onSnapshot(
        query(collection(db, 'inventory'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          const inventoryData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as InventoryRecord[];
          setInventory(inventoryData);
        },
        (error) => {
          console.error('Error listening to inventory:', error);
        }
      );

      unsubscribeOrders = onSnapshot(
        query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          const firebaseOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as FirebaseOrder[];
          
          // Convert Firebase orders to application format
          const ordersData = firebaseOrders.map((fo) => {
            const user = users.find(u => u.id === (fo.userId || fo.transaction?.userId));
            return convertFirebaseOrderToOrder(fo, user);
          });
          
          setOrders(ordersData);
        },
        (error) => {
          console.error('Error listening to orders:', error);
        }
      );
      // Users
      unsubscribeUsers = onSnapshot(
        query(collection(db, 'users'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AppUser[];
          setUsers(usersData);
        },
        (error) => {
          console.error('Error listening to users:', error);
        }
      );

      unsubscribePayments = onSnapshot(
        query(collection(db, 'payments'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          const paymentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Payment[];
          setPayments(paymentsData);
        },
        (error) => {
          console.error('Error listening to payments:', error);
        }
      );

      unsubscribeSubscriptions = onSnapshot(
        query(collection(db, 'subscriptions'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          const subscriptionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Subscription[];
          setSubscriptions(subscriptionsData);
        },
        (error) => {
          console.error('Error listening to subscriptions:', error);
        }
      );

      unsubscribeProducts = onSnapshot(
        query(collection(db, 'products'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          const productsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Product[];
          setProducts(productsData);
          setLoading(false);
        },
        (error) => {
          console.error('Error listening to products:', error);
        }
      );
    } catch (error) {
      console.error('Error setting up listeners:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribeInventory) unsubscribeInventory();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribePayments) unsubscribePayments();
      if (unsubscribeSubscriptions) unsubscribeSubscriptions();
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, []);

  // Helper function to update inventory when order is created
  const updateInventoryForOrder = async (quantity: number, orderDate: string) => {
    try {
      // Find the most recent inventory record for the order date or create a new one
      const today = new Date().toISOString().split('T')[0];
      
      // Get all inventory records and filter by date (simpler approach)
      const inventorySnapshot = await getDocs(collection(db, 'inventory'));
      const todayRecords = (inventorySnapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as any) })) as (InventoryRecord & { id: string })[])
        .filter(record => record.date === today);
      
      if (todayRecords.length > 0) {
        // Update the first record for today
        const latestRecord = todayRecords[0];
        
        await updateDoc(doc(db, 'inventory', latestRecord.id), {
          stockSold: (latestRecord.stockSold || 0) + quantity,
          stockRemaining: (latestRecord.stockRemaining || 0) - quantity
        });
      } else {
        // Create new inventory record for today
        await addDoc(collection(db, 'inventory'), {
          date: today,
          stockReceived: 0,
          stockSold: quantity,
          stockRemaining: -quantity, // This indicates we need to add stock
          buyingPrice: 35, // Default buying price
          sellingPrice: 60, // Default selling price
          createdAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error updating inventory for order:', error);
      // Don't throw the error, just log it to prevent the app from crashing
      // The order will still be created even if inventory update fails
    }
  };

  // Helper function to create automatic payment when order is completed
  const createAutomaticPayment = async (order: Order) => {
    try {
      // Check if payment already exists for this order by getting all payments
      const paymentsSnapshot = await getDocs(collection(db, 'payments'));
      const existingPayment = (paymentsSnapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as any) })) as (Payment & { id: string })[])
        .find(payment => payment.orderId === order.id);
      
      if (!existingPayment) {
        // Create automatic payment using the order's payment type
        await addDoc(collection(db, 'payments'), {
          orderId: order.id,
          customerName: order.customerName,
          amount: order.totalAmount,
          type: (order.paymentType as any) || 'offline', // default to offline
          status: 'completed',
          date: order.deliveryDate,
          createdAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error creating automatic payment:', error);
      // Don't throw the error, just log it
    }
  };

  // CRUD operations
  const addInventoryRecord = async (record: Omit<InventoryRecord, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'inventory'), {
        ...record,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error adding inventory record:', error);
      throw error;
    }
  };

  const addOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'completedTime' | 'cancelledTime'>) => {
    try {
      const now = Timestamp.now();
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Prepare order data with automatic timestamps
      const orderData: any = {
        ...order,
        createdAt: now,
        updatedAt: now,
        orderTime: order.orderTime || currentTime
      };

      // Only add status-specific timestamps if they have values
      if (order.status === 'completed') {
        orderData.completedTime = currentTime;
      }
      if (order.status === 'cancelled') {
        orderData.cancelledTime = currentTime;
      }

      // Add the order first
      const orderRef = await addDoc(collection(db, 'orders'), orderData);

      // Then update inventory (this can fail without breaking the order creation)
      try {
        await updateInventoryForOrder(order.quantity, order.orderDate);
      } catch (inventoryError) {
        console.error('Inventory update failed, but order was created:', inventoryError);
      }

      // If order is completed, create automatic payment
      if (order.status === 'completed') {
        try {
          const orderWithId = { ...orderData, id: orderRef.id };
          await createAutomaticPayment(orderWithId);
        } catch (paymentError) {
          console.error('Automatic payment creation failed:', paymentError);
        }
      }
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  };

  const addPayment = async (payment: Omit<Payment, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'payments'), {
        ...payment,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  };

  const updateOrder = async (orderId: string, updates: Partial<Order>) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      // Get current order data by getting all orders and finding the one we need
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const currentOrder = ordersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find(order => order.id === orderId) as Order;
      
      const now = Timestamp.now();
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Prepare update data with automatic timestamps
      const updateData: any = {
        ...updates,
        updatedAt: now
      };

      // Add status-specific timestamps only if status is changing
      if (updates.status === 'completed' && currentOrder?.status !== 'completed') {
        updateData.completedTime = currentTime;
      }
      if (updates.status === 'cancelled' && currentOrder?.status !== 'cancelled') {
        updateData.cancelledTime = currentTime;
      }

      // Update the order
      await updateDoc(orderRef, updateData);

      // If status changed to completed, create automatic payment
      if (updates.status === 'completed' && currentOrder?.status !== 'completed') {
        try {
          const updatedOrder = { ...currentOrder, ...updateData, id: orderId };
          await createAutomaticPayment(updatedOrder);
        } catch (paymentError) {
          console.error('Automatic payment creation failed:', paymentError);
        }
      }

      // If quantity changed, update inventory
      if (updates.quantity && updates.quantity !== currentOrder?.quantity) {
        try {
          const quantityDifference = updates.quantity - currentOrder.quantity;
          if (quantityDifference !== 0) {
            await updateInventoryForOrder(quantityDifference, currentOrder.orderDate);
          }
        } catch (inventoryError) {
          console.error('Inventory update failed:', inventoryError);
        }
      }
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      // Get order data before deletion by getting all orders and finding the one we need
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const orderData = ordersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find(order => order.id === orderId) as Order;
      
      // Delete the order
      await deleteDoc(doc(db, 'orders', orderId));

      // Update inventory by adding back the quantity
      if (orderData) {
        try {
          await updateInventoryForOrder(-orderData.quantity, orderData.orderDate);
        } catch (inventoryError) {
          console.error('Inventory update failed during order deletion:', inventoryError);
        }
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  };

  const updateInventoryRecord = async (recordId: string, updates: Partial<InventoryRecord>) => {
    try {
      await updateDoc(doc(db, 'inventory', recordId), updates);
    } catch (error) {
      console.error('Error updating inventory record:', error);
      throw error;
    }
  };

  const deleteInventoryRecord = async (recordId: string) => {
    try {
      await deleteDoc(doc(db, 'inventory', recordId));
    } catch (error) {
      console.error('Error deleting inventory record:', error);
      throw error;
    }
  };

  // Subscription functions
  const removeUndefined = (obj: any) => {
    const copy: any = Array.isArray(obj) ? [] : {};
    Object.keys(obj || {}).forEach((key) => {
      const value = obj[key];
      if (value === undefined) return; // skip undefined
      if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
        copy[key] = removeUndefined(value);
      } else {
        copy[key] = value;
      }
    });
    return copy;
  };

  const addSubscription = async (subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = Timestamp.now();
      const subscriptionData = removeUndefined({
        ...subscription,
        // defaults
        deliveryTimePreference: subscription.deliveryTimePreference || 'morning',
        attendance: subscription.attendance || {},
        // Firestore doesn't allow undefined; use null for empty endDate
        endDate: subscription.endDate ?? null,
        createdAt: now,
        updatedAt: now
      });

      const docRef = await addDoc(collection(db, 'subscriptions'), subscriptionData);
      console.log('Subscription added with ID:', docRef.id);
    } catch (error) {
      console.error('Error adding subscription:', error);
      throw error;
    }
  };

  const updateSubscription = async (subscriptionId: string, updates: Partial<Subscription>) => {
    try {
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      const now = Timestamp.now();
      
      const updateData = removeUndefined({
        ...updates,
        // normalize endDate
        endDate: updates.endDate === undefined ? undefined : (updates.endDate ?? null),
        updatedAt: now
      });

      await updateDoc(subscriptionRef, updateData);
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  };

  const deleteSubscription = async (subscriptionId: string) => {
    try {
      await deleteDoc(doc(db, 'subscriptions', subscriptionId));
    } catch (error) {
      console.error('Error deleting subscription:', error);
      throw error;
    }
  };

  // Product functions
  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = Timestamp.now();
      const payload = {
        ...product,
        quantity: product.quantity?.trim() || undefined,
        createdAt: now,
        updatedAt: now
      };
      await addDoc(collection(db, 'products'), payload);
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    try {
      const updatePayload: Partial<Product> & { updatedAt: Timestamp } = {
        ...updates,
        ...(updates.quantity !== undefined
          ? { quantity: updates.quantity?.trim() || undefined }
          : {}),
        updatedAt: Timestamp.now()
      };

      await updateDoc(doc(db, 'products', productId), updatePayload);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  // Attendance helpers
  const toggleSubscriptionAttendance = async (
    subscriptionId: string,
    isoDate: string,
    time: 'morning' | 'evening',
    value: boolean
  ) => {
    try {
      // Read current subscription attendance
      const subsSnapshot = await getDocs(collection(db, 'subscriptions'));
      const sub = subsSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find((s: any) => s.id === subscriptionId) as Subscription | undefined;

      const existingAttendance = (sub?.attendance as any) || {};
      const dayAttendance = existingAttendance[isoDate] || {};
      const updatedAttendance = {
        ...existingAttendance,
        [isoDate]: {
          ...dayAttendance,
          [time]: value
        }
      };

      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        attendance: updatedAttendance,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error toggling subscription attendance:', error);
      throw error;
    }
  };

  return {
    inventory,
    orders,
    payments,
    subscriptions,
    products,
    users,
    loading,
    addInventoryRecord,
    addOrder,
    addPayment,
    addSubscription,
    updateOrder,
    updateSubscription,
    deleteOrder,
    deleteSubscription,
    toggleSubscriptionAttendance,
    updateInventoryRecord,
    deleteInventoryRecord,
    addProduct,
    updateProduct,
    deleteProduct
  };
};