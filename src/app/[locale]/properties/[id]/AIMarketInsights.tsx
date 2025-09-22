"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from 'next-intl';

type Property = {
	id: string;
	address: string;
	city: string | null;
	postalCode: string | null;
	sizeSqm: number | null;
	purchasePriceCents: number | null;
	marketValueCents: number | null;
	equityCents: number | null;
	loanPrincipalCents: number | null;
	interestRatePct: number | null;
	amortizationRatePct: number | null;
	tenants: Array<{ 
		id: string; 
		name: string; 
		contactEmail: string | null;
		contactPhone: string | null;
		leaseStart: Date | null;
		leaseEnd: Date | null;
		baseRentCents: number | null;
		contractUrl: string | null;
	}>;
	incomes: Array<{ 
		id: string; 
		propertyId: string;
		amountCents: number; 
		note: string | null;
		date: Date;
		type: string;
	}>;
	expenses: Array<{ 
		id: string; 
		propertyId: string;
		amountCents: number; 
		note: string | null;
		date: Date;
		category: string;
	}>;
	utilityCosts: Array<{ 
		id: string; 
		propertyId: string;
		year: number; 
		totalAmountCents: number;
		allocationMethod: string;
		generatedStatementUrl: string | null;
		createdAt: Date;
	}>;
};

type AIMarketInsightsProps = {
	property: Property;
};

export default function AIMarketInsights({ property }: AIMarketInsightsProps) {
	const [loading, setLoading] = useState(false);
	const [insights, setInsights] = useState<{
		estimatedValue: number;
		pricePerSqm: number;
		rentalYield: number;
		recommendation: string;
		note: string;
	} | null>(null);
	const locale = useLocale();

	const handleGetAnalysis = async () => {
		setLoading(true);
		try {
			const response = await fetch(`/api/ai/market-data?address=${encodeURIComponent(property.address)}&city=${encodeURIComponent(property.city || '')}`);
			const data = await response.json();
			setInsights(data);
		} catch (error) {
			console.error('Failed to fetch market insights:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="mt-6 border rounded-lg p-6 bg-blue-50">
			<h3 className="text-lg font-medium mb-4">AI Market Insights</h3>
			<div className="text-sm text-gray-600 mb-4">
				Get AI-powered market analysis for this property location.
			</div>
			
			{!insights ? (
				<button
					onClick={handleGetAnalysis}
					disabled={loading}
					className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
				>
					{loading ? 'Analyzing...' : 'Get AI Market Analysis'}
				</button>
			) : (
				<div className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="border rounded p-4 bg-white">
							<div className="text-sm text-gray-500">Market Value</div>
							<div className="text-xl font-semibold text-blue-600">
								{formatCurrency(insights.estimatedValue, locale)}
							</div>
						</div>
						<div className="border rounded p-4 bg-white">
							<div className="text-sm text-gray-500">Price per m²</div>
							<div className="text-xl font-semibold text-green-600">
								{formatCurrency(insights.pricePerSqm, locale)}
							</div>
						</div>
						<div className="border rounded p-4 bg-white">
							<div className="text-sm text-gray-500">Rental Yield</div>
							<div className="text-xl font-semibold text-purple-600">
								{insights.rentalYield}%
							</div>
						</div>
						<div className="border rounded p-4 bg-white">
							<div className="text-sm text-gray-500">Recommendation</div>
							<div className={`text-xl font-semibold ${
								insights.recommendation === 'Strong Buy' ? 'text-green-600' :
								insights.recommendation === 'Buy' ? 'text-blue-600' :
								insights.recommendation === 'Hold' ? 'text-yellow-600' :
								insights.recommendation === 'Sell' ? 'text-red-600' : 'text-gray-600'
							}`}>
								{insights.recommendation}
							</div>
						</div>
					</div>
					
					{insights.note && (
						<div className="border rounded p-4 bg-white">
							<div className="text-sm text-gray-500 mb-2">Analysis Notes</div>
							<div className="text-sm text-gray-700">{insights.note}</div>
						</div>
					)}
					
					<button
						onClick={handleGetAnalysis}
						disabled={loading}
						className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
					>
						{loading ? 'Refreshing...' : 'Refresh Analysis'}
					</button>
				</div>
			)}
		</div>
	);
}
