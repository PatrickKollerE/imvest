import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";

export async function POST(req: Request) {
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	const body = await req.json();
	const { 
		propertyId, 
		year, 
		totalAmountCents, 
		allocationMethod 
	} = body;

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
		const utilityCost = await prisma.utilityCost.create({
			data: {
				propertyId,
				year,
				totalAmountCents,
				allocationMethod,
			},
		});

		return NextResponse.json(utilityCost, { status: 201 });
	} catch (error) {
		console.error("Error creating utility cost:", error);
		return NextResponse.json({ error: "Failed to create utility cost" }, { status: 500 });
	}
}
