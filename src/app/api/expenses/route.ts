import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";

export async function POST(req: Request) {
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	const body = await req.json();
	const { propertyId, amountCents, description, date, category } = body;

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
		const expense = await prisma.expense.create({
			data: {
				propertyId,
				amountCents,
				note: description,
				date: new Date(date),
				category,
			},
		});

		return NextResponse.json(expense, { status: 201 });
	} catch (error) {
		console.error("Error creating expense:", error);
		return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
	}
}
