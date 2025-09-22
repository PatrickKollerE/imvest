import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";

export async function GET(req: Request) {
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	const { searchParams } = new URL(req.url);
	const propertyId = searchParams.get("propertyId");
	const type = searchParams.get("type"); // "income", "expenses", or "all"

	if (!propertyId) {
		return NextResponse.json({ error: "Property ID required" }, { status: 400 });
	}

	// Verify property belongs to user's organization
	const property = await prisma.property.findFirst({
		where: { 
			id: propertyId,
			organizationId 
		},
	});

	if (!property) {
		return NextResponse.json({ error: "Property not found" }, { status: 404 });
	}

	try {
		let data: Array<Record<string, unknown>> = [];
		let filename = "";

		if (type === "income" || type === "all") {
			const incomes = await prisma.income.findMany({
				where: { propertyId },
				orderBy: { date: "desc" },
			});
			data = [...data, ...incomes.map(income => ({
				type: "Income",
				amount: (income.amountCents / 100).toFixed(2),
				description: income.note || '',
				category: income.type,
				date: income.date.toISOString().split('T')[0],
			}))];
		}

		if (type === "expenses" || type === "all") {
			const expenses = await prisma.expense.findMany({
				where: { propertyId },
				orderBy: { date: "desc" },
			});
			data = [...data, ...expenses.map(expense => ({
				type: "Expense",
				amount: (expense.amountCents / 100).toFixed(2),
				description: expense.note || '',
				category: expense.category,
				date: expense.date.toISOString().split('T')[0],
			}))];
		}

		// Sort by date descending
		data.sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

		// Generate CSV
		const headers = ["Type", "Amount (€)", "Description", "Category", "Date"];
		const csvContent = [
			headers.join(","),
			...			data.map(row => [
				row.type,
				row.amount,
				`"${String(row.description).replace(/"/g, '""')}"`,
				row.category,
				row.date,
			].join(","))
		].join("\n");

		filename = `property-${propertyId}-${type || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;

		return new NextResponse(csvContent, {
			headers: {
				"Content-Type": "text/csv",
				"Content-Disposition": `attachment; filename="${filename}"`,
			},
		});
	} catch (error) {
		console.error("Error generating CSV:", error);
		return NextResponse.json({ error: "Failed to generate CSV" }, { status: 500 });
	}
}
