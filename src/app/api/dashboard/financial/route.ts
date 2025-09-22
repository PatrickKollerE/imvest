import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	const { searchParams } = new URL(req.url);
	const timeRange = searchParams.get('timeRange') || 'monthly';
	const customStartDate = searchParams.get('startDate');
	const customEndDate = searchParams.get('endDate');

	// Calculate date range based on timeRange
	const now = new Date();
	let startDate: Date;
	let endDate: Date = now;

	if (timeRange === 'custom' && customStartDate && customEndDate) {
		startDate = new Date(customStartDate);
		endDate = new Date(customEndDate);
		// Set end date to end of day
		endDate.setHours(23, 59, 59, 999);
	} else {
		switch (timeRange) {
			case 'monthly':
				startDate = new Date(now.getFullYear(), now.getMonth(), 1);
				endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
				break;
			case 'ytd':
				startDate = new Date(now.getFullYear(), 0, 1);
				break;
			case 'yearly':
				startDate = new Date(now.getFullYear(), 0, 1);
				endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
				break;
			case 'all':
			default:
				startDate = new Date(1900, 0, 1); // Very early date
				break;
		}
	}

	try {
		const [incomeAgg, expenseAgg, properties] = await Promise.all([
			prisma.income.aggregate({
				where: { 
					property: { organizationId: organizationId },
					date: {
						gte: startDate,
						lte: endDate,
					},
				},
				_sum: { amountCents: true },
			}),
			prisma.expense.aggregate({
				where: { 
					property: { organizationId: organizationId },
					date: {
						gte: startDate,
						lte: endDate,
					},
				},
				_sum: { amountCents: true },
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
								gte: startDate,
								lte: endDate,
							},
						},
						select: { amountCents: true },
					},
					expenses: {
						where: {
							date: {
								gte: startDate,
								lte: endDate,
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
			const propertyIncome = property.incomes.reduce((sum, inc) => sum + inc.amountCents, 0);
			const propertyExpenses = property.expenses.reduce((sum, exp) => sum + exp.amountCents, 0);
			const propertyCashflow = propertyIncome - propertyExpenses;
			
			return {
				id: property.id,
				address: property.address,
				city: property.city,
				monthlyIncome: propertyIncome,
				monthlyExpenses: propertyExpenses,
				monthlyCashflow: propertyCashflow,
			};
		});

		return NextResponse.json({ 
			income, 
			expenses, 
			cashflow, 
			propertyData 
		});
	} catch (error) {
		console.error("Error fetching dashboard financial data:", error);
		return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 });
	}
}
