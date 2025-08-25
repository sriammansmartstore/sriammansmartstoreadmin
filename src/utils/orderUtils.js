import { doc, updateDoc, serverTimestamp, getDoc, addDoc, collection, setDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { sendSms } from './sms';

// Normalize various status inputs to our canonical keys
export const normalizeStatus = (s = '') => {
  const raw = String(s).trim();
  const lower = raw.toLowerCase().replace(/[_\s]+/g, '-');
  // Map common variants
  const map = {
    'in-transit': 'in-transit',
    'intransit': 'in-transit',
    'in-transist': 'in-transit', // guard against common typo
    'pending': 'pending',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'returned': 'returned',
  };
  return map[lower] || lower;
};

export const updateOrderStatus = async (orderId, newStatus, additionalData = {}) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    const orderData = orderSnap.exists() ? orderSnap.data() : {};

    const normalized = normalizeStatus(newStatus);
    const statusUpdate = {
      status: normalized,
      updatedAt: serverTimestamp(),
      ...additionalData
    };

    // Add timestamp based on status
    switch (normalized) {
      case 'shipped':
        statusUpdate.shippedAt = serverTimestamp();
        break;
      case 'in-transit':
        statusUpdate.inTransitAt = serverTimestamp();
        break;
      case 'delivered':
        statusUpdate.deliveredAt = serverTimestamp();
        statusUpdate.paymentStatus = 'Paid';
        break;
      case 'cancelled':
        statusUpdate.cancelledAt = serverTimestamp();
        statusUpdate.paymentStatus = 'Refunded';
        break;
      case 'returned':
        statusUpdate.returnedAt = serverTimestamp();
        statusUpdate.paymentStatus = 'Refunded';
        break;
      default:
        break;
    }

    await updateDoc(orderRef, statusUpdate);

    // Mirror status into user's orders subcollection if possible
    try {
      const userId = orderData?.userId
        || orderData?.userUID
        || orderData?.userUid
        || orderData?.user?.id
        || orderData?.userProfile?.uid
        || orderData?.userProfile?.id
        || null;

      if (userId) {
        const userOrderRef = doc(db, 'users', userId, 'orders', orderId);
        const userOrderUpdate = {
          status: normalized,
          updatedAt: serverTimestamp(),
        };
        if (statusUpdate.paymentStatus) userOrderUpdate.paymentStatus = statusUpdate.paymentStatus;
        if (statusUpdate.shippedAt) userOrderUpdate.shippedAt = serverTimestamp();
        if (statusUpdate.inTransitAt) userOrderUpdate.inTransitAt = serverTimestamp();
        if (statusUpdate.deliveredAt) userOrderUpdate.deliveredAt = serverTimestamp();
        if (statusUpdate.cancelledAt) userOrderUpdate.cancelledAt = serverTimestamp();
        if (statusUpdate.returnedAt) userOrderUpdate.returnedAt = serverTimestamp();
        await setDoc(userOrderRef, userOrderUpdate, { merge: true });
      } else {
        console.warn('[orderUtils] Could not determine userId to mirror status for order', orderId);
      }
    } catch (mirrorErr) {
      console.error('Error mirroring order status to user subcollection:', mirrorErr);
    }

    // After-update side effects
    const phone = orderData?.verifiedPhoneNumber || orderData?.userProfile?.number || orderData?.userProfile?.phone;
    const orderDisplay = orderData?.orderId || `#${orderId?.substring(0, 8)}`;

    if (normalized === 'shipped' && phone) {
      // Send shipped SMS
      await sendSms(phone, `Your order ${orderDisplay} has been shipped. Thank you for shopping with us!`);
    }

    if (normalized === 'delivered') {
      // Send delivered SMS
      if (phone) {
        await sendSms(phone, `Your order ${orderDisplay} has been delivered. Thank you for choosing us!`);
      }
      // Archive to delivered_orders collection
      try {
        await addDoc(collection(db, 'delivered_orders'), {
          originalOrderId: orderId,
          archivedAt: serverTimestamp(),
          ...orderData,
          status: 'delivered',
          deliveredAt: orderData?.deliveredAt || serverTimestamp(),
        });
      } catch (archiveErr) {
        console.error('Error archiving delivered order:', archiveErr);
      }
    }

    // Track user cancellation count on user document
    if (normalized === 'cancelled') {
      try {
        // Best-effort userId extraction from order data
        const userId = orderData?.userId
          || orderData?.userUID
          || orderData?.userUid
          || orderData?.user?.id
          || orderData?.userProfile?.uid
          || orderData?.userProfile?.id
          || null;

        if (userId) {
          const userRef = doc(db, 'users', userId);
          await setDoc(
            userRef,
            {
              cancellationsCount: increment(1),
              lastCancelledAt: serverTimestamp(),
            },
            { merge: true }
          );
        } else {
          console.warn('[orderUtils] Could not determine userId to increment cancellationsCount for order', orderId);
        }
      } catch (cntErr) {
        console.error('Error incrementing user cancellationsCount:', cntErr);
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error };
  }
};

export const formatOrderDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getOrderStatusBadge = (status) => {
  const statusMap = {
    'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    'shipped': { color: 'bg-blue-100 text-blue-800', label: 'Shipped' },
    'in-transit': { color: 'bg-purple-100 text-purple-800', label: 'In Transit' },
    'delivered': { color: 'bg-green-100 text-green-800', label: 'Delivered' },
    'cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    'returned': { color: 'bg-pink-100 text-pink-800', label: 'Returned' },
  };

  const statusInfo = statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
      {statusInfo.label}
    </span>
  );
};
