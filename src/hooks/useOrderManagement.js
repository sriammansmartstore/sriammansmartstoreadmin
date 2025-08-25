import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const ITEMS_PER_PAGE = 10;

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
  if (lower.includes('transit')) {
    candidates.add('in-transit');
    candidates.add('in transit');
    candidates.add('in_transit');
  }
  if (lower === 'cancelled' || lower === 'canceled') {
    candidates.add('canceled');
    candidates.add('cancelled');
  }
  const list = Array.from(candidates).slice(0, 10);
  console.log('[useOrderManagement] buildStatusVariants', { input: s, variants: list });
  return list;
};

const useOrderManagement = (status) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchOrders = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setLoading(true);
      }

      let q;
      const ordersRef = collection(db, 'orders');
      
      if (status === 'dashboard') {
        // For dashboard, get all orders sorted by date (requires createdAt index only)
        q = query(
          ordersRef,
          orderBy('createdAt', 'desc'),
          limit(ITEMS_PER_PAGE)
        );
      } else {
        // For specific status pages, AVOID orderBy and match variants using IN
        const variants = buildStatusVariants(status);
        console.log('[useOrderManagement] Status mode, building query without orderBy', variants);
        if (variants.length > 0) {
          q = query(ordersRef, where('status', 'in', variants), limit(ITEMS_PER_PAGE));
        } else {
          q = query(ordersRef, limit(ITEMS_PER_PAGE));
        }
      }

      // If loading more, start after the last document
      if (status === 'dashboard') {
        if (isLoadMore && lastVisible) {
          q = query(q, startAfter(lastVisible));
        }
      }

      console.log('[useOrderManagement] Fetching orders', { status, isLoadMore, lastVisible: !!lastVisible });
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (err) {
        if (status !== 'dashboard') {
          console.warn('[useOrderManagement] IN query failed, falling back to multiple == filters', err?.message);
          const variants = buildStatusVariants(status).slice(0, 3);
          const docs = [];
          for (const v of variants) {
            try {
              const qEq = query(collection(db, 'orders'), where('status', '==', v), limit(ITEMS_PER_PAGE));
              const snap = await getDocs(qEq);
              docs.push(...snap.docs);
            } catch (e) {
              console.warn('[useOrderManagement] == query failed for variant', v, e?.message);
            }
          }
          querySnapshot = { docs };
        } else {
          throw err;
        }
      }
      let newOrders = [];
      
      querySnapshot.forEach((doc) => {
        newOrders.push({ id: doc.id, ...doc.data() });
      });
      
      // For status pages (no orderBy in query), sort client-side by createdAt desc if available
      if (status !== 'dashboard') {
        newOrders = newOrders.sort((a, b) => {
          const aTime = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });
      }

      // Last-resort: if no docs and expecting a status, fetch recent and filter client-side for diagnostics
      if ((querySnapshot?.docs?.length ?? 0) === 0 && status !== 'dashboard') {
        console.warn('[useOrderManagement] No docs for status. Diagnostic fetch of recent orders to filter client-side');
        try {
          const diagQ = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(20));
          const diagSnap = await getDocs(diagQ);
          const variants = buildStatusVariants(status);
          const filtered = diagSnap.docs.filter(d => {
            const val = String(d.data()?.status ?? '');
            return variants.includes(val) || variants.includes(val.toLowerCase());
          });
          newOrders = filtered.map(d => ({ id: d.id, ...d.data() }));
          console.log('[useOrderManagement] Diagnostic filtered orders count', newOrders.length);
        } catch (e) {
          console.warn('[useOrderManagement] Diagnostic fetch failed', e?.message);
        }
      }

      // Update last visible document for pagination
      if (status === 'dashboard') {
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastVisible(lastDoc);
      }

      // If no more documents, set hasMore to false
      if (status === 'dashboard') {
        if (querySnapshot.docs.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } else {
        // No cursor without orderBy; treat as a single page
        setHasMore(false);
      }

      // If loading more, append to existing orders, otherwise replace
      setOrders(prevOrders => isLoadMore ? [...prevOrders, ...newOrders] : newOrders);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Refresh orders
  const refreshOrders = () => {
    setLastVisible(null);
    fetchOrders(false);
  };

  // Load more orders
  const loadMore = () => {
    if (!loading && !isLoadingMore && hasMore) {
      fetchOrders(true);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOrders(false);
    // Reset lastVisible when status changes
    return () => {
      setLastVisible(null);
    };
  }, [status]);

  return {
    orders,
    loading,
    error,
    hasMore,
    isLoadingMore,
    refreshOrders,
    loadMore,
  };
};

export default useOrderManagement;
