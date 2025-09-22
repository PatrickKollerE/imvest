"use client";

import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/currency';

interface PropertyData {
  id: string;
  address: string;
  city: string | null;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCashflow: number;
}

interface DashboardPieChartsProps {
  properties: PropertyData[];
  locale: string;
}

// Simple pie chart component using CSS and SVG
function PieChart({ 
  data, 
  title, 
  colors, 
  total 
}: { 
  data: Array<{ label: string; value: number; color: string }>; 
  title: string; 
  colors: string[];
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="border rounded p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
        <div className="flex items-center justify-center h-32 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Ensure we have at least one segment to show
  const chartData = data.length > 0 ? data : [{ label: 'No data', value: 1, color: colors[0] }];
  const chartTotal = data.length > 0 ? total : 1;

  let cumulativePercentage = 0;
  const segments = chartData.map((item, index) => {
    const percentage = (item.value / chartTotal) * 100;
    const radius = 50;
    const centerX = 60;
    const centerY = 60;
    
    // For single entry, draw a full circle
    if (chartData.length === 1) {
      return (
        <circle
          key={index}
          cx={centerX}
          cy={centerY}
          r={radius}
          fill={item.color}
          stroke="white"
          strokeWidth="1"
        />
      );
    }
    
    const startAngle = cumulativePercentage * 3.6; // 3.6 degrees per 1%
    const endAngle = (cumulativePercentage + percentage) * 3.6;
    
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);
    
    const largeArcFlag = percentage > 50 ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    cumulativePercentage += percentage;
    
    return (
      <path
        key={index}
        d={pathData}
        fill={item.color}
        stroke="white"
        strokeWidth="1"
      />
    );
  });

  return (
    <div className="border rounded p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      <div className="flex items-center justify-center">
        <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
          {segments}
        </svg>
      </div>
      <div className="mt-3 space-y-1">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center text-xs">
            <div 
              className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate flex-1">{item.label}</span>
            <span className="text-gray-600 ml-2">
              {((item.value / chartTotal) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPieCharts({ properties, locale }: DashboardPieChartsProps) {
  const t = useTranslations();
  
  // Colors for the pie charts
  const colors = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // yellow
    '#8B5CF6', // purple
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#F97316', // orange
  ];

  // Helper function to assign unique colors
  const assignColors = (items: any[]) => {
    const usedColors = new Set<string>();
    return items.map((item, index) => {
      // Find next available color
      let colorIndex = index;
      while (usedColors.has(colors[colorIndex % colors.length])) {
        colorIndex++;
      }
      const color = colors[colorIndex % colors.length];
      usedColors.add(color);
      return { ...item, color };
    });
  };

  // Prepare data for income pie chart
  const incomeData = assignColors(
    properties
      .filter(p => p.monthlyIncome > 0)
      .map((property) => ({
        label: `${property.address}${property.city ? `, ${property.city}` : ''}`,
        value: property.monthlyIncome,
      }))
  );

  const totalIncome = incomeData.reduce((sum, item) => sum + item.value, 0);

  // Prepare data for expenses pie chart
  const expenseData = assignColors(
    properties
      .filter(p => p.monthlyExpenses > 0)
      .map((property) => ({
        label: `${property.address}${property.city ? `, ${property.city}` : ''}`,
        value: property.monthlyExpenses,
      }))
  );

  const totalExpenses = expenseData.reduce((sum, item) => sum + item.value, 0);

  // Prepare data for cashflow pie chart (positive and negative)
  const positiveCashflowData = assignColors(
    properties
      .filter(p => p.monthlyCashflow > 0)
      .map((property) => ({
        label: `${property.address}${property.city ? `, ${property.city}` : ''}`,
        value: property.monthlyCashflow,
      }))
  );

  const negativeCashflowData = assignColors(
    properties
      .filter(p => p.monthlyCashflow < 0)
      .map((property) => ({
        label: `${property.address}${property.city ? `, ${property.city}` : ''}`,
        value: Math.abs(property.monthlyCashflow),
      }))
  );

  const totalPositiveCashflow = positiveCashflowData.reduce((sum, item) => sum + item.value, 0);
  const totalNegativeCashflow = negativeCashflowData.reduce((sum, item) => sum + item.value, 0);
  const totalCashflow = totalPositiveCashflow + totalNegativeCashflow;

  // Combine positive and negative cashflow for the pie chart
  const cashflowData = [...positiveCashflowData, ...negativeCashflowData];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <PieChart
        data={incomeData}
        title={`${t('dashboard.monthlyIncome')} (${formatCurrency(totalIncome, locale)})`}
        colors={colors}
        total={totalIncome}
      />
      <PieChart
        data={expenseData}
        title={`${t('dashboard.monthlyExpenses')} (${formatCurrency(totalExpenses, locale)})`}
        colors={colors}
        total={totalExpenses}
      />
      <PieChart
        data={cashflowData}
        title={`${t('dashboard.netCashflow')} (${formatCurrency(totalPositiveCashflow - totalNegativeCashflow, locale)})`}
        colors={colors}
        total={totalCashflow}
      />
    </div>
  );
}
