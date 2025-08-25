import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase';

// Build common variant list for a given status label to cope with inconsistent casing/formatting in DB
const buildStatusVariants = (s) => {
  if (!s) return [];
  const raw = String(s);
  const lower = raw.toLowerCase();
  const title = lower.replace(/(^|[-_\s])(\w)/g, (_, p1, p2) => (p1 ? p1 : '') + p2.toUpperCase());
  const dashed = lower.replace(/[_\s]+/g, '-');
  const underscored = lower.replace(/[-\s]+/g, '_');
  const spaced = lower.replace(/[-_]+/g, ' ');
  const candidates = new Set([lower, dashed, underscored, spaced, title, title.replace(/[-_]/g, ' ')]);
  // Special handling for in-transit typos/variants
  if (lower.includes('transit')) {
    candidates.add('in-transit');
    candidates.add('in transit');
    candidates.add('in_transit');
  }
  if (lower === 'cancelled' || lower === 'canceled') {
    candidates.add('canceled');
    candidates.add('cancelled');
  }
  const list = Array.from(candidates).slice(0, 10); // Firestore 'in' supports up to 10 values
  console.log('[useOrders] buildStatusVariants', { input: s, variants: list });
  return list;
};

export const useOrders = (status, itemsPerPage = 10) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchOrders = async (loadMore = false) => {
    try {
      if (!loadMore) {
        setLoading(true);
        setOrders([]);
      } else {
        setIsLoadingMore(true);
      }

      setError(null);

      let q;
      // If status is provided, AVOID orderBy to not require composite index
      if (status) {
        const variants = buildStatusVariants(status);
        console.log('[useOrders] Status mode, building query without orderBy', variants);
        if (variants.length > 0) {
          q = query(collection(db, 'orders'), where('status', 'in', variants), limit(itemsPerPage));
        } else {
          q = query(collection(db, 'orders'), limit(itemsPerPage));
        }
      } else {
        // No status filter: safe to order by createdAt
        q = query(
          collection(db, 'orders'),
          orderBy('createdAt', 'desc')
        );
      }

      // For pagination
      if (!status) {
        if (loadMore && lastVisible) {
          q = query(q, startAfter(lastVisible), limit(itemsPerPage));
        } else {
          q = query(q, limit(itemsPerPage));
        }
      } else {
        // In status mode we don't paginate at query level (no cursor without orderBy)
        setHasMore(false);
      }

      console.log('[useOrders] Fetching orders', { loadMore, lastVisible: !!lastVisible, itemsPerPage });
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (err) {
        // Fallback if composite index for where('in') + orderBy is missing
        if (status) {
          console.warn('[useOrders] IN+orderBy failed, falling back to multiple == filters', err?.message);
          const variants = buildStatusVariants(status);
          const limited = variants.slice(0, 3); // keep reads low
          const snapshots = [];
          for (const v of limited) {
            const qEq = query(
              collection(db, 'orders'),
              where('status', '==', v),
              limit(itemsPerPage)
            );
            const snap = await getDocs(qEq);
            snapshots.push(...snap.docs);
          }
          // De-dup by id and sort by createdAt desc
          const byId = new Map();
          snapshots.forEach(d => byId.set(d.id, d));
          const mergedDocs = Array.from(byId.values()).sort((a, b) => {
            const ca = a.data().createdAt; const cb = b.data().createdAt;
            const ad = ca?.toDate ? ca.toDate() : (ca ? new Date(ca) : 0);
            const bd = cb?.toDate ? cb.toDate() : (cb ? new Date(cb) : 0);
            return bd - ad;
          }).slice(0, itemsPerPage);
          // Create a synthetic snapshot-like object
          querySnapshot = { docs: mergedDocs };
        } else {
          throw err;
        }
      }
      // Last-resort fallback: if still nothing and we expected status, fetch recent and filter client-side
      if ((querySnapshot?.docs?.length ?? 0) === 0 && status) {
        console.warn('[useOrders] No docs from status queries. Last-resort: fetch recent orders and filter client-side.');
        const recentQ = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(itemsPerPage));
        const recentSnap = await getDocs(recentQ);
        const variants = buildStatusVariants(status);
        const filtered = recentSnap.docs.filter(d => variants.includes(String(d.data()?.status ?? '').toLowerCase()) ||
          variants.includes(String(d.data()?.status ?? '')));
        querySnapshot = { docs: filtered };
        // Extra diagnostics: list recent orders statuses
        try {
          const diagQ = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(20));
          const diagSnap = await getDocs(diagQ);
          const diag = diagSnap.docs.map(d => ({ id: d.id, status: d.data()?.status, createdAt: d.data()?.createdAt }));
          console.log('[useOrders] Diagnostic last 20 orders', diag);
        } catch (e) {
          console.warn('[useOrders] Diagnostic fetch failed', e?.message);
        }
      }
      
      // Get the last visible document for pagination
      if (!status) {
        const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastVisible(lastVisibleDoc);
      }

      // Check if there are more documents to load
      if (!status) {
        setHasMore(querySnapshot.docs.length === itemsPerPage);
      }

      let ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps to JavaScript Date objects
        ...(doc.data().createdAt && { createdAt: doc.data().createdAt.toDate() }),
        ...(doc.data().shippedAt && { shippedAt: doc.data().shippedAt.toDate() }),
        ...(doc.data().inTransitAt && { inTransitAt: doc.data().inTransitAt.toDate() }),
        ...(doc.data().deliveredAt && { deliveredAt: doc.data().deliveredAt.toDate() }),
        ...(doc.data().cancelledAt && { cancelledAt: doc.data().cancelledAt.toDate() }),
        ...(doc.data().returnedAt && { returnedAt: doc.data().returnedAt.toDate() }),
      }));
      // In status mode, sort client-side by createdAt desc for consistent ordering
      if (status) {
        ordersData = ordersData.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
      }

      console.log('[useOrders] Loaded orders count', ordersData.length);
      setOrders(prevOrders => 
        loadMore ? [...prevOrders, ...ordersData] : ordersData
      );
    } catch (err) {
      console.error('[useOrders] Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Fetch initial orders when status changes
  useEffect(() => {
    fetchOrders(false);
    // Reset lastVisible when status changes
    setLastVisible(null);
  }, [status]);

  // Function to refresh orders
  const refreshOrders = () => {
    setLastVisible(null);
    fetchOrders(false);
  };

  return {
    orders,
    loading,
    error,
    hasMore,
    isLoadingMore,
    loadMore: () => fetchOrders(true),
    refreshOrders,
  };
};

export const useOrderCounts = () => {
  const [counts, setCounts] = useState({
    pending: 0,
    shipped: 0,
    'in-transit': 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
    all: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);
        setError(null);

        const statuses = ['pending', 'shipped', 'in-transit', 'delivered', 'cancelled', 'returned'];
        const countsObj = { all: 0 };
        
        // Fetch count for each status using 'in' variants
        for (const s of statuses) {
          const variants = buildStatusVariants(s);
          try {
            const q = query(collection(db, 'orders'), where('status', 'in', variants));
            const snapshot = await getDocs(q);
            countsObj[s] = snapshot.size;
            countsObj.all += snapshot.size;
          } catch (err) {
            // Fallback: sum individual equals queries
            let sum = 0;
            const limited = variants.slice(0, 3);
            for (const v of limited) {
              const qEq = query(collection(db, 'orders'), where('status', '==', v));
              const snap = await getDocs(qEq);
              sum += snap.size;
            }
            countsObj[s] = sum;
            countsObj.all += sum;
          }
          console.log('[useOrders] Count for', s, countsObj[s]);
        }

        setCounts(countsObj);
      } catch (err) {
        console.error('[useOrders] Error fetching order counts:', err);
        setError('Failed to load order counts');
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return { counts, loading, error };
};
