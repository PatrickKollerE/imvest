"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';

type Income = {
	id: string;
	propertyId: string;
	amountCents: number;
	note: string | null;
	date: Date;
	type: string;
};

type Expense = {
	id: string;
	propertyId: string;
	amountCents: number;
	note: string | null;
	date: Date;
	category: string;
};

type IncomeExpensesTabProps = {
	propertyId: string;
	incomes: Income[];
	expenses: Expense[];
};

export default function IncomeExpensesTab({ propertyId, incomes, expenses }: IncomeExpensesTabProps) {
	const [activeTab, setActiveTab] = useState<"income" | "expenses">("income");
	const [showForm, setShowForm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const t = useTranslations();

	// Filter out future dates as a safety measure
	const today = new Date();
	today.setHours(23, 59, 59, 999); // End of today
	
	const filteredIncomes = incomes.filter(income => new Date(income.date) <= today);
	const filteredExpenses = expenses.filter(expense => new Date(expense.date) <= today);
	
	const allTransactions = [...filteredIncomes.map(i => ({ ...i, type: 'income' as const })), ...filteredExpenses.map(e => ({ ...e, type: 'expense' as const }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	
	// Filter transactions based on active tab
	const filteredTransactions = allTransactions.filter(transaction => {
		if (activeTab === "income") {
			return transaction.type === 'income';
		} else if (activeTab === "expenses") {
			return transaction.type === 'expense';
		}
		return true; // Show all if neither tab is selected
	});

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		const data = {
			amountCents: Number(formData.get("amount")) * 100,
			note: formData.get("description"),
			date: formData.get("date"),
			category: formData.get("category"),
		};

		try {
			const endpoint = activeTab === "income" ? "/api/incomes" : "/api/expenses";
			const res = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ propertyId, ...data }),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Failed to create transaction");
			}

			window.location.reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-4">
				<div className="flex space-x-4">
					<button
						onClick={() => setActiveTab("income")}
						className={`px-4 py-2 rounded ${
							activeTab === "income" 
								? "bg-green-100 text-green-800 border border-green-300" 
								: "bg-gray-100 text-gray-600"
						}`}
					>
						{t('incomeExpenses.income')} ({incomes.length})
					</button>
					<button
						onClick={() => setActiveTab("expenses")}
						className={`px-4 py-2 rounded ${
							activeTab === "expenses" 
								? "bg-red-100 text-red-800 border border-red-300" 
								: "bg-gray-100 text-gray-600"
						}`}
					>
						{t('incomeExpenses.expenses')} ({expenses.length})
					</button>
				</div>
				<div className="flex space-x-2">
					<button
						onClick={() => window.open(`/api/export/csv?propertyId=${propertyId}&type=${activeTab}`, '_blank')}
						className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
					>
						{activeTab === "income" ? t('incomeExpenses.exportIncome') : t('incomeExpenses.exportExpenses')}
					</button>
					<button
						onClick={() => setShowForm(!showForm)}
						className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
					>
						{showForm ? t('common.cancel') : (activeTab === "income" ? t('incomeExpenses.addIncome') : t('incomeExpenses.addExpense'))}
					</button>
				</div>
			</div>

			{showForm && (
				<form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium mb-1">{t('incomeExpenses.amount')} ({t('common.currencySymbol')})</label>
							<input
								name="amount"
								type="number"
								step="0.01"
								required
								className="w-full border rounded px-3 py-2"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">{t('incomeExpenses.category')}</label>
							<select
								name="category"
								required
								className="w-full border rounded px-3 py-2"
							>
								{activeTab === "income" ? (
									<>
										<option value="rent">{t('incomeExpenses.categories.rent')}</option>
										<option value="deposit">{t('incomeExpenses.categories.deposit')}</option>
										<option value="other">{t('incomeExpenses.categories.other')}</option>
									</>
								) : (
									<>
										<option value="maintenance">{t('incomeExpenses.categories.maintenance')}</option>
										<option value="utilities">{t('incomeExpenses.categories.utilities')}</option>
										<option value="insurance">{t('incomeExpenses.categories.insurance')}</option>
										<option value="taxes">{t('incomeExpenses.categories.taxes')}</option>
										<option value="management">{t('incomeExpenses.categories.management')}</option>
										<option value="loanInterest">{t('incomeExpenses.categories.loanInterest')}</option>
										<option value="loanAmortization">{t('incomeExpenses.categories.loanAmortization')}</option>
										<option value="other">{t('incomeExpenses.categories.other')}</option>
									</>
								)}
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">{t('incomeExpenses.description')}</label>
							<input
								name="description"
								type="text"
								required
								className="w-full border rounded px-3 py-2"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">{t('incomeExpenses.date')}</label>
							<input
								name="date"
								type="date"
								required
								defaultValue={new Date().toISOString().split('T')[0]}
								className="w-full border rounded px-3 py-2"
							/>
						</div>
					</div>
					<div className="mt-4 flex gap-2">
						<button
							type="submit"
							disabled={loading}
							className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
						>
							{loading ? t('common.loading') : (activeTab === "income" ? t('incomeExpenses.addIncome') : t('incomeExpenses.addExpense'))}
						</button>
						<button
							type="button"
							onClick={() => setShowForm(false)}
							className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
						>
							{t('common.cancel')}
						</button>
					</div>
					{error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
				</form>
			)}

			<div className="space-y-2">
				{filteredTransactions.map((transaction) => (
					<div key={transaction.id} className={`border rounded p-3 ${transaction.type === 'income' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
						<div className="flex justify-between items-center">
							<div>
								<div className="font-medium">{transaction.note || t('incomeExpenses.noDescription')}</div>
								<div className="text-sm text-gray-600">
									{transaction.type === 'income' ? transaction.type : transaction.category} • {new Date(transaction.date).toLocaleDateString()}
								</div>
							</div>
							<div className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
								{transaction.type === 'income' ? '+' : '-'}€{(transaction.amountCents / 100).toLocaleString()}
							</div>
						</div>
					</div>
				))}
				{filteredTransactions.length === 0 && (
					<div className="text-center py-8 text-gray-500">
						{t('incomeExpenses.noTransactions')}. {t('incomeExpenses.addFirstTransaction', { type: activeTab === "income" ? t('incomeExpenses.income').toLowerCase() : t('incomeExpenses.expenses').toLowerCase() })}.
					</div>
				)}
			</div>
		</div>
	);
}
