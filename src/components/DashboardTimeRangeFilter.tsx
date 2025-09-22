"use client";

import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface DashboardTimeRangeFilterProps {
  timeRange: 'monthly' | 'ytd' | 'yearly' | 'all' | 'custom';
  onTimeRangeChange: (timeRange: 'monthly' | 'ytd' | 'yearly' | 'all' | 'custom', customDates?: { startDate: string; endDate: string }) => void;
  locale: string;
}

export default function DashboardTimeRangeFilter({ timeRange, onTimeRangeChange, locale }: DashboardTimeRangeFilterProps) {
  const t = useTranslations();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const timeRanges = [
    { key: 'monthly' as const, label: t('dashboard.timeRange.monthly') },
    { key: 'ytd' as const, label: t('dashboard.timeRange.ytd') },
    { key: 'yearly' as const, label: t('dashboard.timeRange.yearly') },
    { key: 'all' as const, label: t('dashboard.timeRange.all') },
    { key: 'custom' as const, label: t('dashboard.timeRange.custom') },
  ];

  const handleCustomDateSubmit = () => {
    if (startDate && endDate) {
      onTimeRangeChange('custom', { startDate, endDate });
      setShowCustomPicker(false);
    }
  };

  const handleTimeRangeClick = (range: 'monthly' | 'ytd' | 'yearly' | 'all' | 'custom') => {
    if (range === 'custom') {
      setShowCustomPicker(!showCustomPicker);
    } else {
      setShowCustomPicker(false);
      onTimeRangeChange(range);
    }
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) return '';
    
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString(locale, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  return (
    <div className="mb-6">
      <div className="flex gap-2 flex-wrap items-center">
        {timeRanges.map((range) => (
          <div key={range.key} className="flex items-center gap-2">
            <button
              onClick={() => handleTimeRangeClick(range.key)}
              className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                timeRange === range.key
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {range.label}
            </button>
            {timeRange === 'custom' && range.key === 'custom' && startDate && endDate && (
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {formatDateRange()}
              </span>
            )}
          </div>
        ))}
      </div>
      
      {showCustomPicker && (
        <div className="mt-3 inline-flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Start"
            />
            <span className="text-xs text-gray-500">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="End"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleCustomDateSubmit}
              disabled={!startDate || !endDate}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.apply')}
            </button>
            <button
              onClick={() => {
                setShowCustomPicker(false);
                setStartDate('');
                setEndDate('');
              }}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
