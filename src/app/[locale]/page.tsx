import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";
import { formatCurrency } from "@/lib/currency";
import { getTranslations } from 'next-intl/server';
import Link from "next/link";
import DashboardPieCharts from "@/components/DashboardPieCharts";

async function getData() {
	const userId = await getCurrentUserId();
	if (!userId) return null;
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return { organizationId: null, totals: null, evaluations: [], propertyData: [] };

	// Get current month date range
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

	const [incomeAgg, expenseAgg, evaluations, properties] = await Promise.all([
		prisma.income.aggregate({
			where: { 
				property: { organizationId: organizationId },
				date: {
					gte: startOfMonth,
					lte: endOfMonth,
				},
			},
			_sum: { amountCents: true },
		}),
		prisma.expense.aggregate({
			where: { 
				property: { organizationId: organizationId },
				date: {
					gte: startOfMonth,
					lte: endOfMonth,
				},
			},
			_sum: { amountCents: true },
		}),
		prisma.evaluation.findMany({
			where: { organizationId },
			orderBy: { createdAt: "desc" },
			take: 5,
		}),
		prisma.property.findMany({
			where: { organizationId },
			select: {
				id: true,
				address: true,
				city: true,
				incomes: {
					where: {
						date: {
							gte: startOfMonth,
							lte: endOfMonth,
						},
					},
					select: { amountCents: true },
				},
				expenses: {
					where: {
						date: {
							gte: startOfMonth,
							lte: endOfMonth,
						},
					},
					select: { amountCents: true },
				},
			},
		}),
	]);

	const income = incomeAgg._sum.amountCents ?? 0;
	const expenses = expenseAgg._sum.amountCents ?? 0;
	const cashflow = income - expenses;

	// Calculate property-level data for pie charts
	const propertyData = properties.map(property => {
		const monthlyIncome = property.incomes.reduce((sum, inc) => sum + inc.amountCents, 0);
		const monthlyExpenses = property.expenses.reduce((sum, exp) => sum + exp.amountCents, 0);
		const monthlyCashflow = monthlyIncome - monthlyExpenses;
		
		return {
			id: property.id,
			address: property.address,
			city: property.city,
			monthlyIncome,
			monthlyExpenses,
			monthlyCashflow,
		};
	});

	return { organizationId, totals: { income, expenses, cashflow }, evaluations, propertyData };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
	const data = await getData();
	const { locale } = await params;
	const t = await getTranslations({ locale });
	
	if (!data) {
		return (
			<div className="p-6">
				<h1 className="text-xl font-semibold">{t('dashboard.welcome')}</h1>
				<p>{t('common.please')} <Link className="underline" href={`/${locale}/login`}>{t('navigation.login')}</Link>.</p>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="border rounded p-4">
					<div className="text-sm text-gray-500">{t('dashboard.monthlyIncome')}</div>
					<div className="text-xl text-green-600">{formatCurrency(data.totals?.income ?? 0, locale as string)}</div>
				</div>
				<div className="border rounded p-4">
					<div className="text-sm text-gray-500">{t('dashboard.monthlyExpenses')}</div>
					<div className="text-xl text-red-600">{formatCurrency(data.totals?.expenses ?? 0, locale as string)}</div>
				</div>
				<div className="border rounded p-4">
					<div className="text-sm text-gray-500">{t('dashboard.netCashflow')}</div>
					<div className={`text-xl font-semibold ${(data.totals?.cashflow ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
						{formatCurrency(data.totals?.cashflow ?? 0, locale as string)}
					</div>
				</div>
			</div>
			<DashboardPieCharts properties={data.propertyData} locale={locale} />
			
			<div>
				<h2 className="text-lg font-medium mb-2">{t('dashboard.recentEvaluations')}</h2>
				<div className="space-y-2">
					{data.evaluations.map((e) => (
						<div key={e.id} className="border rounded p-3 flex items-center justify-between">
							<div>
								<div className="text-sm text-gray-500">{new Date(e.createdAt).toISOString().replace('T', ' ').split('.')[0]}</div>
								<div className="text-sm">{t('evaluate.cashflow')}: {formatCurrency(e.monthlyCashflowCents, locale as string)} — {t('roi.grossYield')} {e.grossYieldPct.toFixed(1)}%</div>
							</div>
							<span className={`text-xs px-2 py-1 rounded text-white font-medium ${
								e.recommendation === 'GREEN' ? 'bg-green-500' :
								e.recommendation === 'YELLOW' ? 'bg-yellow-500' :
								e.recommendation === 'RED' ? 'bg-red-500' :
								'bg-gray-100 text-gray-800'
							}`}>{e.recommendation}</span>
						</div>
					))}
					{data.evaluations.length === 0 && <div className="text-sm text-gray-500">{t('dashboard.noEvaluations')}</div>}
				</div>
			</div>
		</div>
	);
}
