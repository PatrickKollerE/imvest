"use client";

import { calculateROI } from "@/lib/roi";
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

type ROITabProps = {
	property: Property;
};

export default function ROITab({ property }: ROITabProps) {
	const locale = useLocale();
	
	// Calculate ROI metrics
	const totalIncome = property.incomes.reduce((sum, income) => sum + income.amountCents, 0);
	const totalExpenses = property.expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
	const netCashflow = totalIncome - totalExpenses;
	
	const purchasePrice = property.purchasePriceCents || 0;
	const marketValue = property.marketValueCents || purchasePrice;
	const equity = property.equityCents || 0;
	const loanPrincipal = property.loanPrincipalCents || 0;
	
	const roiData = calculateROI({
		purchasePrice,
		marketValue,
		equity,
		loanPrincipal,
		interestRatePct: property.interestRatePct || 0,
		amortizationRatePct: property.amortizationRatePct || 0,
		monthlyRent: property.tenants.reduce((sum, tenant) => sum + (tenant.baseRentCents || 0), 0),
		monthlyExpenses: totalExpenses / 12, // Approximate monthly
		propertySizeSqm: property.sizeSqm || 0,
	});

	return (
		<div>
			<div className="mb-6">
				<h3 className="text-lg font-medium mb-4">ROI Analysis</h3>
				
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<div className="border rounded p-4">
						<div className="text-sm text-gray-500">Cash-on-Cash Return</div>
						<div className="text-2xl font-semibold text-green-600">
							{(roiData.cashOnCashReturn * 100).toFixed(1)}%
						</div>
					</div>
					<div className="border rounded p-4">
						<div className="text-sm text-gray-500">Cap Rate</div>
						<div className="text-2xl font-semibold text-blue-600">
							{(roiData.capRate * 100).toFixed(1)}%
						</div>
					</div>
					<div className="border rounded p-4">
						<div className="text-sm text-gray-500">Total ROI</div>
						<div className="text-2xl font-semibold text-purple-600">
							{(roiData.totalROI * 100).toFixed(1)}%
						</div>
					</div>
					<div className="border rounded p-4">
						<div className="text-sm text-gray-500">Price per m²</div>
						<div className="text-2xl font-semibold text-gray-600">
							{formatCurrency(roiData.pricePerSqm, locale)}
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="border rounded p-4">
						<h4 className="font-medium mb-3">Financial Summary</h4>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span>Purchase Price:</span>
								<span>{formatCurrency(purchasePrice, locale)}</span>
							</div>
							<div className="flex justify-between">
								<span>Market Value:</span>
								<span>{formatCurrency(marketValue, locale)}</span>
							</div>
							<div className="flex justify-between">
								<span>Equity:</span>
								<span>{formatCurrency(equity, locale)}</span>
							</div>
							<div className="flex justify-between">
								<span>Loan Principal:</span>
								<span>{formatCurrency(loanPrincipal, locale)}</span>
							</div>
							<div className="flex justify-between border-t pt-2">
								<span>Monthly Rent:</span>
								<span className="font-medium">{formatCurrency(roiData.monthlyRent, locale)}</span>
							</div>
							<div className="flex justify-between">
								<span>Monthly Expenses:</span>
								<span className="font-medium">{formatCurrency(roiData.monthlyExpenses, locale)}</span>
							</div>
							<div className="flex justify-between border-t pt-2">
								<span>Net Cashflow:</span>
								<span className={`font-medium ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
									{formatCurrency(netCashflow, locale)}
								</span>
							</div>
						</div>
					</div>

					<div className="border rounded p-4">
						<h4 className="font-medium mb-3">Performance Metrics</h4>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span>Gross Yield:</span>
								<span>{(roiData.grossYield * 100).toFixed(1)}%</span>
							</div>
							<div className="flex justify-between">
								<span>Net Yield:</span>
								<span>{(roiData.netYield * 100).toFixed(1)}%</span>
							</div>
							<div className="flex justify-between">
								<span>LTV Ratio:</span>
								<span>{(roiData.ltvRatio * 100).toFixed(1)}%</span>
							</div>
							<div className="flex justify-between">
								<span>DSCR:</span>
								<span>{roiData.dscr.toFixed(2)}</span>
							</div>
							<div className="flex justify-between">
								<span>Payback Period:</span>
								<span>{roiData.paybackPeriodYears.toFixed(1)} years</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="border rounded p-4 bg-blue-50">
				<h4 className="font-medium mb-2">Investment Recommendation</h4>
				<div className="text-sm text-gray-700">
					{roiData.cashOnCashReturn > 0.08 ? (
						<span className="text-green-600 font-medium">✓ Strong investment opportunity</span>
					) : roiData.cashOnCashReturn > 0.05 ? (
						<span className="text-yellow-600 font-medium">⚠ Moderate investment opportunity</span>
					) : (
						<span className="text-red-600 font-medium">✗ Consider other investments</span>
					)}
					<p className="mt-2">
						Based on current metrics, this property shows a {roiData.cashOnCashReturn > 0.08 ? 'strong' : roiData.cashOnCashReturn > 0.05 ? 'moderate' : 'weak'} potential for returns.
					</p>
				</div>
			</div>
		</div>
	);
}
