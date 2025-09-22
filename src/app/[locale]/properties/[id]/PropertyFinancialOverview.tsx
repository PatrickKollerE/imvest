"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from 'next-intl';
import { formatCurrency } from "@/lib/currency";

type Income = {
	id: string;
	amountCents: number;
	date: Date;
	type: string;
	note: string | null;
};

type Expense = {
	id: string;
	amountCents: number;
	date: Date;
	type: string;
	note: string | null;
};

type TimeRange = 'ytd' | 'last5years' | 'all';

type PropertyFinancialOverviewProps = {
	propertyId: string;
	locale: string;
};

export default function PropertyFinancialOverview({ propertyId, locale }: PropertyFinancialOverviewProps) {
	const [timeRange, setTimeRange] = useState<TimeRange>('ytd');
	const [financialData, setFinancialData] = useState<{
		totalIncome: number;
		totalExpenses: number;
		incomeCount: number;
		expenseCount: number;
		recentIncomes: Income[];
		recentExpenses: Expense[];
	} | null>(null);
	const [loading, setLoading] = useState(true);
	const t = useTranslations();

	const fetchFinancialData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/properties/${propertyId}/financial?timeRange=${timeRange}`);
			if (response.ok) {
				const data = await response.json();
				setFinancialData(data);
			}
		} catch (error) {
			console.error('Error fetching financial data:', error);
		} finally {
			setLoading(false);
		}
	}, [propertyId, timeRange]);

	useEffect(() => {
		fetchFinancialData();
	}, [fetchFinancialData]);


	if (loading) {
		return (
			<div className="mb-6">
				<div className="flex justify-center items-center h-32">
					<div className="text-lg">{t('common.loading')}...</div>
				</div>
			</div>
		);
	}

	if (!financialData) {
		return (
			<div className="mb-6">
				<div className="text-center text-gray-500 py-8">
					{t('common.error')}
				</div>
			</div>
		);
	}

	const netCashflow = financialData.totalIncome - financialData.totalExpenses;

	return (
		<div className="mb-6">
			{/* Time Range Selector */}
			<div className="mb-4">
				<h3 className="text-sm font-medium text-gray-700 mb-2">{t('properties.financialOverview')}</h3>
				<div className="flex gap-2">
					<button
						onClick={() => setTimeRange('ytd')}
						className={`px-3 py-1 rounded text-sm font-medium ${
							timeRange === 'ytd'
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}
					>
						{t('properties.timeRange.ytd')}
					</button>
					<button
						onClick={() => setTimeRange('last5years')}
						className={`px-3 py-1 rounded text-sm font-medium ${
							timeRange === 'last5years'
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}
					>
						{t('properties.timeRange.last5years')}
					</button>
					<button
						onClick={() => setTimeRange('all')}
						className={`px-3 py-1 rounded text-sm font-medium ${
							timeRange === 'all'
								? 'bg-blue-600 text-white'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
						}`}
					>
						{t('properties.timeRange.all')}
					</button>
				</div>
			</div>

			{/* Financial Overview */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="border rounded p-4">
					<div className="text-sm text-gray-500">{t('properties.totalIncome')}</div>
					<div className="text-xl font-semibold text-green-600">{formatCurrency(financialData.totalIncome, locale)}</div>
					<div className="text-xs text-gray-500">{financialData.incomeCount} {t('properties.transactions')}</div>
				</div>
				<div className="border rounded p-4">
					<div className="text-sm text-gray-500">{t('properties.totalExpenses')}</div>
					<div className="text-xl font-semibold text-red-600">{formatCurrency(financialData.totalExpenses, locale)}</div>
					<div className="text-xs text-gray-500">{financialData.expenseCount} {t('properties.transactions')}</div>
				</div>
				<div className="border rounded p-4">
					<div className="text-sm text-gray-500">{t('properties.netCashflow')}</div>
					<div className={`text-xl font-semibold ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
						{formatCurrency(netCashflow, locale)}
					</div>
				</div>
			</div>
		</div>
	);
}
