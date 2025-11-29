import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

type PremiumContextType = {
  isPremium: boolean;
  loading: boolean;
  checkPremiumStatus: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const checkPremiumStatus = async () => {
    if (!user) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('id, payment_status')
        .eq('user_id', user.id)
        .eq('payment_status', 'completed')
        .eq('product_type', 'premium')
        .maybeSingle();

      if (error) {
        console.error('Error checking premium status:', error);
        setIsPremium(false);
      } else {
        setIsPremium(!!data);
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshPremiumStatus = async () => {
    setLoading(true);
    await checkPremiumStatus();
  };

  useEffect(() => {
    checkPremiumStatus();
  }, [user]);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        loading,
        checkPremiumStatus,
        refreshPremiumStatus,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}
