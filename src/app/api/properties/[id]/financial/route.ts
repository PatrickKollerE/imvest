import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id: propertyId } = await params;
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	// Get time range from query params
	const url = new URL(req.url);
	const timeRange = url.searchParams.get('timeRange') || 'all';

	// Verify property belongs to user's organization
	const property = await prisma.property.findFirst({
		where: {
			id: propertyId,
			organizationId
		}
	});

	if (!property) {
		return NextResponse.json({ error: "Property not found" }, { status: 404 });
	}

	// Calculate date range
	const dateFilter: { gte?: Date } = {};
	if (timeRange !== 'all') {
		const now = new Date();
		let startDate: Date;
		
		if (timeRange === 'ytd') {
			startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
		} else if (timeRange === 'last5years') {
			startDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
		} else {
			startDate = new Date(now.getFullYear(), 0, 1);
		}
		
		dateFilter.gte = startDate;
	}

	try {
		// Fetch financial data with date filtering
		const [incomeStats, expenseStats, recentIncomes, recentExpenses] = await Promise.all([
			prisma.income.aggregate({
				where: { 
					propertyId,
					...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
				},
				_sum: { amountCents: true },
				_count: true,
			}),
			prisma.expense.aggregate({
				where: { 
					propertyId,
					...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
				},
				_sum: { amountCents: true },
				_count: true,
			}),
			prisma.income.findMany({
				where: { 
					propertyId,
					...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
				},
				orderBy: { date: "desc" },
				take: 5,
			}),
			prisma.expense.findMany({
				where: { 
					propertyId,
					...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
				},
				orderBy: { date: "desc" },
				take: 5,
			}),
		]);

		const result = {
			totalIncome: incomeStats._sum.amountCents || 0,
			totalExpenses: expenseStats._sum.amountCents || 0,
			incomeCount: incomeStats._count,
			expenseCount: expenseStats._count,
			recentIncomes: recentIncomes,
			recentExpenses: recentExpenses,
		};

		return NextResponse.json(result);
	} catch (error) {
		console.error("Error fetching financial data:", error);
		return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 });
	}
}
