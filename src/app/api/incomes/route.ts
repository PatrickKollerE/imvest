import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserIdFromRequest, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
	const userId = await getCurrentUserIdFromRequest(req);
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
		const income = await prisma.income.create({
			data: {
				propertyId,
				amountCents,
				note: description,
				date: new Date(date),
				type: category,
			},
		});

		return NextResponse.json(income, { status: 201 });
	} catch (error) {
		console.error("Error creating income:", error);
		return NextResponse.json({ error: "Failed to create income" }, { status: 500 });
	}
}
