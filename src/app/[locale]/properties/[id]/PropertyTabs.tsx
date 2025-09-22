"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import TenantsTab from "./tabs/TenantsTab";
import IncomeExpensesTab from "./tabs/IncomeExpensesTab";
import ROITab from "./tabs/ROITab";

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
		status: 'ACTIVE' | 'INACTIVE';
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

type PropertyTabsProps = {
	property: Property;
};

export default function PropertyTabs({ property }: PropertyTabsProps) {
	const [activeTab, setActiveTab] = useState("tenants");
	const t = useTranslations();

	const tabs = [
		{ id: "tenants", label: t('tenants.title'), count: property.tenants.length },
		{ id: "income-expenses", label: t('incomeExpenses.title'), count: property.incomes.length + property.expenses.length },
		{ id: "utilities", label: t('utilities.title'), count: property.utilityCosts.length },
		{ id: "roi", label: t('roi.title'), count: 0 },
	];

	return (
		<div className="border rounded-lg">
			<div className="border-b">
				<nav className="flex space-x-8 px-6">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`py-4 px-1 border-b-2 font-medium text-sm ${
								activeTab === tab.id
									? "border-blue-500 text-blue-600"
									: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
							}`}
						>
							{tab.label}
							{tab.count > 0 && (
								<span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
									{tab.count}
								</span>
							)}
						</button>
					))}
				</nav>
			</div>

			<div className="p-6">
				{activeTab === "tenants" && <TenantsTab propertyId={property.id} tenants={property.tenants} />}
				{activeTab === "income-expenses" && (
					<IncomeExpensesTab 
						propertyId={property.id} 
						incomes={property.incomes} 
						expenses={property.expenses} 
					/>
				)}
				{activeTab === "utilities" && <div className="text-center py-8 text-gray-500">{t('utilities.title')} {t('common.loading')}...</div>}
				{activeTab === "roi" && <ROITab property={property} />}
			</div>
		</div>
	);
}
