import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";

export async function PUT(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id: propertyId } = await params;
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	// Verify property belongs to user's organization
	const existingProperty = await prisma.property.findFirst({
		where: {
			id: propertyId,
			organizationId
		}
	});

	if (!existingProperty) {
		return NextResponse.json({ error: "Property not found" }, { status: 404 });
	}

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
		const updatedProperty = await prisma.property.update({
			where: { id: propertyId },
			data: {
				address: address !== undefined ? address : existingProperty.address,
				city: city !== undefined ? city : existingProperty.city,
				postalCode: postalCode !== undefined ? postalCode : existingProperty.postalCode,
				sizeSqm: sizeSqm !== undefined ? sizeSqm : existingProperty.sizeSqm,
				purchasePriceCents: purchasePriceCents !== undefined ? purchasePriceCents : existingProperty.purchasePriceCents,
				marketValueCents: marketValueCents !== undefined ? marketValueCents : existingProperty.marketValueCents,
				equityCents: equityCents !== undefined ? equityCents : existingProperty.equityCents,
				loanPrincipalCents: loanPrincipalCents !== undefined ? loanPrincipalCents : existingProperty.loanPrincipalCents,
				interestRatePct: interestRatePct !== undefined ? interestRatePct : existingProperty.interestRatePct,
				amortizationRatePct: amortizationRatePct !== undefined ? amortizationRatePct : existingProperty.amortizationRatePct,
			},
		});

		return NextResponse.json(updatedProperty);
	} catch (error) {
		console.error("Error updating property:", error);
		return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
	}
}

export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id: propertyId } = await params;
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	// Verify property belongs to user's organization
	const existingProperty = await prisma.property.findFirst({
		where: {
			id: propertyId,
			organizationId
		}
	});

	if (!existingProperty) {
		return NextResponse.json({ error: "Property not found" }, { status: 404 });
	}

	try {
		// Delete property and all related data (tenants, incomes, expenses, etc.)
		await prisma.property.delete({
			where: { id: propertyId },
		});

		return NextResponse.json({ message: "Property deleted successfully" });
	} catch (error) {
		console.error("Error deleting property:", error);
		return NextResponse.json({ error: "Failed to delete property" }, { status: 500 });
	}
}
