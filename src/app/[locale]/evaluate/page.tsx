"use client";
import { useState } from "react";
import { useTranslations } from 'next-intl';

export default function EvaluatePage() {
	const t = useTranslations();
	const [loading, setLoading] = useState(false);
const [result, setResult] = useState<{
	grossYieldPct?: number;
	netYieldPct?: number;
	monthlyCashflowCents?: number;
	recommendation?: string;
} | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		setResult(null);
		const form = e.currentTarget;
		const fd = new FormData(form);
		const payload = {
			purchasePriceCents: Number(fd.get("purchasePrice") || 0) * 100,
			expectedMonthlyRentCents: Number(fd.get("rent") || 0) * 100,
			equityCents: Number(fd.get("equity") || 0) * 100,
			interestRatePct: Number(fd.get("interest") || 0),
			loanTermYears: Number(fd.get("term") || 0),
			monthlyOtherCostsCents: Number(fd.get("otherCosts") || 0) * 100,
		};
		const res = await fetch("/api/evaluations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
		setLoading(false);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data.error || "Evaluation failed");
			return;
		}
		const data = await res.json();
		setResult(data);
	}

	return (
		<div className="p-6 max-w-2xl mx-auto">
			<h1 className="text-2xl font-semibold mb-4">{t('evaluate.title')}</h1>
			<form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded p-4">
				<label className="text-sm">{t('evaluate.purchasePrice')} ({t('common.currencySymbol')})
					<input name="purchasePrice" type="number" step="0.01" className="w-full border rounded px-3 py-2" required />
				</label>
				<label className="text-sm">{t('evaluate.monthlyRent')} ({t('common.currencySymbol')})
					<input name="rent" type="number" step="0.01" className="w-full border rounded px-3 py-2" required />
				</label>
				<label className="text-sm">{t('evaluate.equity')} ({t('common.currencySymbol')})
					<input name="equity" type="number" step="0.01" className="w-full border rounded px-3 py-2" />
				</label>
				<label className="text-sm">{t('evaluate.interestRate')}
					<input name="interest" type="number" step="0.01" className="w-full border rounded px-3 py-2" required />
				</label>
				<label className="text-sm">{t('evaluate.amortizationRate')}
					<input name="term" type="number" className="w-full border rounded px-3 py-2" required />
				</label>
				<label className="text-sm">{t('evaluate.monthlyExpenses')} ({t('common.currencySymbol')})
					<input name="otherCosts" type="number" step="0.01" className="w-full border rounded px-3 py-2" />
				</label>
				<button disabled={loading} className="md:col-span-2 bg-black text-white rounded py-2">{loading ? t('common.loading') : t('evaluate.evaluate')}</button>
				{error && <div className="md:col-span-2 text-red-600 text-sm">{error}</div>}
			</form>
			{result && (
				<div className="mt-6 border rounded p-4">
					<h2 className="text-lg font-medium mb-2">{t('evaluate.evaluationResults')}</h2>
					<div className="text-sm">{t('roi.grossYield')}: {result.grossYieldPct?.toFixed?.(2)}%</div>
					<div className="text-sm">{t('roi.netYield')}: {result.netYieldPct?.toFixed?.(2)}%</div>
					<div className="text-sm">{t('dashboard.netCashflow')}: {t('common.currencySymbol')}{(result.monthlyCashflowCents ?? 0)/100}</div>
					<div className="text-sm">{t('evaluate.recommendation')}: {result.recommendation}</div>
				</div>
			)}
		</div>
	);
}
