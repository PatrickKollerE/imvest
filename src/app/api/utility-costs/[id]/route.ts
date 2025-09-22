import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserIdFromRequest, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id: utilityCostId } = await params;
	const userId = await getCurrentUserIdFromRequest(req);
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	const body = await req.json();
	const { 
		year, 
		totalAmountCents, 
		allocationMethod,
		category,
		generatedStatementUrl
	} = body;

	try {
		// Verify utility cost belongs to user's organization
		const existingUtilityCost = await prisma.utilityCost.findFirst({
			where: { 
				id: utilityCostId,
				property: {
					organizationId
				}
			},
		});

		if (!existingUtilityCost) {
			return NextResponse.json({ error: "Utility cost not found" }, { status: 404 });
		}

		// Check if the new combination would create a duplicate (excluding current record)
		const duplicateCheck = await prisma.utilityCost.findFirst({
			where: {
				propertyId: existingUtilityCost.propertyId,
				year,
				category,
				id: { not: utilityCostId } // Exclude current record
			}
		});

		if (duplicateCheck) {
			return NextResponse.json({ 
				error: "A utility cost with this property, year, and category already exists" 
			}, { status: 400 });
		}

		const updatedUtilityCost = await prisma.utilityCost.update({
			where: { id: utilityCostId },
			data: {
				year,
				totalAmountCents,
				allocationMethod,
				category,
				generatedStatementUrl: generatedStatementUrl || null,
			},
		});

		return NextResponse.json(updatedUtilityCost);
	} catch (error) {
		console.error("Error updating utility cost:", error);
		return NextResponse.json({ error: "Failed to update utility cost" }, { status: 500 });
	}
}

export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id: utilityCostId } = await params;
	const userId = await getCurrentUserIdFromRequest(req);
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	try {
		// Verify utility cost belongs to user's organization
		const utilityCost = await prisma.utilityCost.findFirst({
			where: { 
				id: utilityCostId,
				property: {
					organizationId
				}
			},
		});

		if (!utilityCost) {
			return NextResponse.json({ error: "Utility cost not found" }, { status: 404 });
		}

		await prisma.utilityCost.delete({
			where: { id: utilityCostId },
		});

		return NextResponse.json({ message: "Utility cost deleted successfully" });
	} catch (error) {
		console.error("Error deleting utility cost:", error);
		return NextResponse.json({ error: "Failed to delete utility cost" }, { status: 500 });
	}
}
