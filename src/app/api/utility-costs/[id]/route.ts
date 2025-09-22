import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";

export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id: utilityCostId } = await params;
	const userId = await getCurrentUserId();
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
