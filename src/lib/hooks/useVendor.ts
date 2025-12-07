import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Vendor } from '@/lib/types';

export function useVendor(vendorId: string | null) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!vendorId) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onSnapshot(
      doc(db, 'vendors', vendorId),
      (snapshot) => {
        if (snapshot.exists()) {
          setVendor({ id: snapshot.id, ...snapshot.data() } as Vendor);
        } else {
          setVendor(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    
    return unsubscribe;
  }, [vendorId]);
  
  return { vendor, loading, error };
}