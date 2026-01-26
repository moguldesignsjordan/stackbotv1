// src/app/driver/earnings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import {
  DollarSign,
  TrendingUp,
  Package,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface EarningsPeriod {
  deliveries: number;
  earnings: number;
  tips: number;
  bonuses: number;
  avgPerDelivery: number;
}

interface DailyEarning {
  date: string;
  deliveries: number;
  earnings: number;
  tips: number;
}

const translations = {
  es: {
    title: 'Ganancias',
    today: 'Hoy',
    thisWeek: 'Esta Semana',
    thisMonth: 'Este Mes',
    allTime: 'Total',
    totalEarnings: 'Ganancias Totales',
    deliveryFees: 'Tarifas de Entrega',
    tips: 'Propinas',
    bonuses: 'Bonos',
    deliveries: 'Entregas',
    avgPerDelivery: 'Promedio por Entrega',
    vsLastPeriod: 'vs periodo anterior',
    dailyBreakdown: 'Desglose Diario',
    noEarnings: 'Sin ganancias',
    noEarningsDesc: 'Tus ganancias aparecerán aquí',
    loading: 'Cargando ganancias...',
  },
  en: {
    title: 'Earnings',
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    allTime: 'All Time',
    totalEarnings: 'Total Earnings',
    deliveryFees: 'Delivery Fees',
    tips: 'Tips',
    bonuses: 'Bonuses',
    deliveries: 'Deliveries',
    avgPerDelivery: 'Avg per Delivery',
    vsLastPeriod: 'vs last period',
    dailyBreakdown: 'Daily Breakdown',
    noEarnings: 'No earnings',
    noEarningsDesc: 'Your earnings will appear here',
    loading: 'Loading earnings...',
  },
};

type Language = 'es' | 'en';
type Period = 'today' | 'week' | 'month' | 'all';

export default function DriverEarningsPage() {
  const [language, setLanguage] = useState<Language>('es');
  const [period, setPeriod] = useState<Period>('week');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EarningsPeriod | null>(null);
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarning[]>([]);
  const [previousPeriodEarnings, setPreviousPeriodEarnings] = useState<number>(0);

  const t = translations[language];
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchEarnings = async () => {
      setLoading(true);
      try {
        const now = new Date();
        let startDate: Date;
        let previousStartDate: Date;
        let previousEndDate: Date;

        switch (period) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            previousStartDate = new Date(startDate);
            previousStartDate.setDate(previousStartDate.getDate() - 1);
            previousEndDate = startDate;
            break;
          case 'week':
            const dayOfWeek = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            previousStartDate = new Date(startDate);
            previousStartDate.setDate(previousStartDate.getDate() - 7);
            previousEndDate = startDate;
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            previousEndDate = startDate;
            break;
          default:
            startDate = new Date(0);
            previousStartDate = new Date(0);
            previousEndDate = new Date(0);
        }

        const deliveriesQuery = query(
          collection(db, 'driver_deliveries'),
          where('driverId', '==', userId),
          where('completedAt', '>=', Timestamp.fromDate(startDate)),
          where('status', '==', 'delivered'),
          orderBy('completedAt', 'desc')
        );

        const snapshot = await getDocs(deliveriesQuery);
        
        let totalEarnings = 0;
        let totalTips = 0;
        let totalBonuses = 0;
        const dailyMap = new Map<string, DailyEarning>();

        snapshot.forEach((doc) => {
          const data = doc.data();
          const fee = data.deliveryFee || 0;
          const tip = data.tip || 0;
          const bonus = data.bonus || 0;

          totalEarnings += fee;
          totalTips += tip;
          totalBonuses += bonus;

          if (data.completedAt) {
            const date = data.completedAt.toDate();
            const dateKey = date.toISOString().split('T')[0];
            
            if (dailyMap.has(dateKey)) {
              const existing = dailyMap.get(dateKey)!;
              existing.deliveries += 1;
              existing.earnings += fee;
              existing.tips += tip;
            } else {
              dailyMap.set(dateKey, {
                date: dateKey,
                deliveries: 1,
                earnings: fee,
                tips: tip,
              });
            }
          }
        });

        if (period !== 'all') {
          const prevQuery = query(
            collection(db, 'driver_deliveries'),
            where('driverId', '==', userId),
            where('completedAt', '>=', Timestamp.fromDate(previousStartDate)),
            where('completedAt', '<', Timestamp.fromDate(previousEndDate)),
            where('status', '==', 'delivered')
          );

          const prevSnapshot = await getDocs(prevQuery);
          let prevTotal = 0;
          prevSnapshot.forEach((doc) => {
            prevTotal += doc.data().deliveryFee || 0;
          });
          setPreviousPeriodEarnings(prevTotal);
        }

        const deliveryCount = snapshot.size;
        const total = totalEarnings + totalTips + totalBonuses;

        setStats({
          deliveries: deliveryCount,
          earnings: totalEarnings,
          tips: totalTips,
          bonuses: totalBonuses,
          avgPerDelivery: deliveryCount > 0 ? total / deliveryCount : 0,
        });

        const dailyArray = Array.from(dailyMap.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setDailyEarnings(dailyArray);

      } catch (error) {
        console.error('Error fetching earnings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [userId, period]);

  const formatCurrency = (amount: number) => {
    return `RD$${amount.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return language === 'es' ? 'Hoy' : 'Today';
    }
    if (dateStr === yesterday.toISOString().split('T')[0]) {
      return language === 'es' ? 'Ayer' : 'Yesterday';
    }

    return date.toLocaleDateString(language === 'es' ? 'es-DO' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPercentageChange = () => {
    if (!stats || previousPeriodEarnings === 0) return null;
    const total = stats.earnings + stats.tips + stats.bonuses;
    return ((total - previousPeriodEarnings) / previousPeriodEarnings) * 100;
  };

  const percentageChange = getPercentageChange();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#55529d] mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {(['today', 'week', 'month', 'all'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              period === p
                ? 'bg-[#55529d] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p === 'today' ? t.today :
             p === 'week' ? t.thisWeek :
             p === 'month' ? t.thisMonth : t.allTime}
          </button>
        ))}
      </div>

      <div className="bg-gradient-to-br from-[#55529d] to-[#6d6abf] rounded-2xl p-6 text-white">
        <p className="text-white/80 text-sm font-medium mb-1">{t.totalEarnings}</p>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold">
            {stats ? formatCurrency(stats.earnings + stats.tips + stats.bonuses) : 'RD$0'}
          </span>
          {percentageChange !== null && period !== 'all' && (
            <span className={`flex items-center gap-1 text-sm font-medium pb-1 ${
              percentageChange >= 0 ? 'text-green-300' : 'text-red-300'
            }`}>
              {percentageChange >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {Math.abs(percentageChange).toFixed(0)}%
              <span className="text-white/60">{t.vsLastPeriod}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/20">
          <div>
            <p className="text-white/60 text-xs mb-1">{t.deliveryFees}</p>
            <p className="font-semibold">{stats ? formatCurrency(stats.earnings) : 'RD$0'}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs mb-1">{t.tips}</p>
            <p className="font-semibold">{stats ? formatCurrency(stats.tips) : 'RD$0'}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs mb-1">{t.bonuses}</p>
            <p className="font-semibold">{stats ? formatCurrency(stats.bonuses) : 'RD$0'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.deliveries || 0}</p>
          <p className="text-xs text-gray-500">{t.deliveries}</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats ? formatCurrency(stats.avgPerDelivery) : 'RD$0'}
          </p>
          <p className="text-xs text-gray-500">{t.avgPerDelivery}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">{t.dailyBreakdown}</h2>
        
        {dailyEarnings.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">{t.noEarnings}</p>
            <p className="text-sm text-gray-500">{t.noEarningsDesc}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dailyEarnings.map((day) => (
              <div
                key={day.date}
                className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">{formatDate(day.date)}</p>
                  <p className="text-sm text-gray-500">
                    {day.deliveries} {day.deliveries === 1 ? 'entrega' : 'entregas'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{formatCurrency(day.earnings + day.tips)}</p>
                  {day.tips > 0 && (
                    <p className="text-xs text-gray-500">+{formatCurrency(day.tips)} propina</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
