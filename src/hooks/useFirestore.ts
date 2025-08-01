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
  where,
  onSnapshot,
  Timestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';

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

export interface Order {
  id?: string;
  customerName: string;
  customerPhone: string;
  quantity: number;
  pricePerLiter: number;
  totalAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  orderDate: string;
  deliveryDate: string;
  paymentType: 'online' | 'offline';
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

export const useFirestore = () => {
  // All hooks must be called in the same order every time
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listeners - this useEffect must be called after all useState hooks
  useEffect(() => {
    let unsubscribeInventory: (() => void) | undefined;
    let unsubscribeOrders: (() => void) | undefined;
    let unsubscribePayments: (() => void) | undefined;

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
          const ordersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Order[];
          setOrders(ordersData);
        },
        (error) => {
          console.error('Error listening to orders:', error);
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
          setLoading(false);
        },
        (error) => {
          console.error('Error listening to payments:', error);
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
    };
  }, []);

  // Helper function to update inventory when order is created
  const updateInventoryForOrder = async (quantity: number, orderDate: string) => {
    try {
      // Find the most recent inventory record for the order date or create a new one
      const today = new Date().toISOString().split('T')[0];
      
      // Get all inventory records and filter by date (simpler approach)
      const inventorySnapshot = await getDocs(collection(db, 'inventory'));
      const todayRecords = inventorySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
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
      const existingPayment = paymentsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find(payment => payment.orderId === order.id);
      
      if (!existingPayment) {
        // Create automatic payment using the order's payment type
        await addDoc(collection(db, 'payments'), {
          orderId: order.id,
          customerName: order.customerName,
          amount: order.totalAmount,
          type: order.paymentType || 'offline', // Use order's payment type, default to offline
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

  const addOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'orderTime' | 'completedTime' | 'cancelledTime'>) => {
    try {
      const now = Timestamp.now();
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Prepare order data with automatic timestamps
      const orderData = {
        ...order,
        createdAt: now,
        updatedAt: now,
        orderTime: currentTime,
        completedTime: order.status === 'completed' ? currentTime : undefined,
        cancelledTime: order.status === 'cancelled' ? currentTime : undefined
      };

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
      const updateData = {
        ...updates,
        updatedAt: now
      };

      // Add status-specific timestamps
      if (updates.status === 'completed' && currentOrder?.status !== 'completed') {
        updateData.completedTime = currentTime;
      } else if (updates.status === 'cancelled' && currentOrder?.status !== 'cancelled') {
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

  return {
    inventory,
    orders,
    payments,
    loading,
    addInventoryRecord,
    addOrder,
    addPayment,
    updateOrder,
    deleteOrder,
    updateInventoryRecord,
    deleteInventoryRecord
  };
};