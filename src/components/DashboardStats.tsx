"use client";

import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/currency';
import DashboardTimeRangeFilter from './DashboardTimeRangeFilter';
import DashboardPieCharts from './DashboardPieCharts';
import { useState, useEffect } from 'react';

interface PropertyData {
  id: string;
  address: string;
  city: string | null;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashflow: number;
}

interface DashboardStatsProps {
  initialData: {
    income: number;
    expenses: number;
    cashflow: number;
    propertyData: PropertyData[];
  };
  locale: string;
}

export default function DashboardStats({ initialData, locale }: DashboardStatsProps) {
  const t = useTranslations();
  const [timeRange, setTimeRange] = useState<'monthly' | 'ytd' | 'yearly' | 'all' | 'custom'>('monthly');
  const [customDates, setCustomDates] = useState<{ startDate: string; endDate: string } | undefined>();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const handleTimeRangeChange = (newTimeRange: 'monthly' | 'ytd' | 'yearly' | 'all' | 'custom', dates?: { startDate: string; endDate: string }) => {
    setTimeRange(newTimeRange);
    setCustomDates(dates);
  };

  useEffect(() => {
    if (timeRange === 'monthly') {
      setData(initialData);
      return;
    }

    // Fetch data for other time ranges
    setLoading(true);
    let url = `/api/dashboard/financial?timeRange=${timeRange}`;
    
    if (timeRange === 'custom' && customDates) {
      url += `&startDate=${customDates.startDate}&endDate=${customDates.endDate}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(newData => {
        setData(newData);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      });
  }, [timeRange, customDates, initialData]);

  return (
    <div className="space-y-6">
      <DashboardTimeRangeFilter 
        timeRange={timeRange} 
        onTimeRangeChange={handleTimeRangeChange}
        locale={locale}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">
            {timeRange === 'monthly' ? t('dashboard.monthlyIncome') :
             timeRange === 'ytd' ? t('dashboard.ytdIncome') :
             timeRange === 'yearly' ? t('dashboard.yearlyIncome') :
             t('dashboard.totalIncome')}
          </div>
          <div className="text-xl text-green-600">
            {loading ? '...' : formatCurrency(data.income, locale)}
          </div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">
            {timeRange === 'monthly' ? t('dashboard.monthlyExpenses') :
             timeRange === 'ytd' ? t('dashboard.ytdExpenses') :
             timeRange === 'yearly' ? t('dashboard.yearlyExpenses') :
             t('dashboard.totalExpenses')}
          </div>
          <div className="text-xl text-red-600">
            {loading ? '...' : formatCurrency(data.expenses, locale)}
          </div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">
            {timeRange === 'monthly' ? t('dashboard.netCashflow') :
             timeRange === 'ytd' ? t('dashboard.ytdCashflow') :
             timeRange === 'yearly' ? t('dashboard.yearlyCashflow') :
             t('dashboard.totalCashflow')}
          </div>
          <div className={`text-xl font-semibold ${(data.cashflow ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {loading ? '...' : formatCurrency(data.cashflow, locale)}
          </div>
        </div>
      </div>
      
      <DashboardPieCharts properties={data.propertyData} locale={locale} />
    </div>
  );
}
