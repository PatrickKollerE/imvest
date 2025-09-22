import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";
import { generateNext12MonthsLoanExpenses } from "@/lib/loan-calculations";

export async function GET() {
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	try {
		const properties = await prisma.property.findMany({
			where: { organizationId },
			include: {
				tenants: true,
				incomes: { 
					select: { 
						amountCents: true, 
						date: true 
					} 
				},
				expenses: { 
					select: { 
						amountCents: true, 
						date: true 
					} 
				},
			},
			orderBy: { createdAt: "desc" },
		});

		return NextResponse.json(properties);
	} catch (error) {
		console.error("Error fetching properties:", error);
		return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
	}
}

export async function POST(req: Request) {
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	const body = await req.json();
	const {
		address,
		city,
		postalCode,
		sizeSqm,
		purchasePriceCents,
		marketValueCents,
		equityCents,
		loanPrincipalCents,
		interestRatePct,
		amortizationRatePct,
	} = body;

	try {
		const property = await prisma.property.create({
			data: {
				organizationId,
				address,
				city,
				postalCode,
				sizeSqm,
				purchasePriceCents,
				marketValueCents,
				equityCents,
				loanPrincipalCents,
				interestRatePct,
				amortizationRatePct,
			},
		});

		// Generate loan expenses if loan data is provided
		if (loanPrincipalCents && interestRatePct && amortizationRatePct) {
			const loanData = {
				loanPrincipalCents,
				interestRatePct,
				amortizationRatePct,
			};
			
			const loanExpenses = generateNext12MonthsLoanExpenses(property.id, loanData);
			
			if (loanExpenses.length > 0) {
				await prisma.expense.createMany({
					data: loanExpenses,
				});
			}
		}

		return NextResponse.json(property, { status: 201 });
	} catch (error) {
		console.error("Error creating property:", error);
		return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
	}
}
