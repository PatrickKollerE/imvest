import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserIdFromRequest, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserIdFromRequest(req);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getFirstOrganizationIdForUser(userId);
    if (!orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const evaluationId = params.id;

    // Verify the evaluation belongs to the user's organization
    const evaluation = await prisma.evaluation.findFirst({
      where: {
        id: evaluationId,
        organizationId: orgId,
        createdByUserId: userId,
      },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });
    }

    // Delete the evaluation
    await prisma.evaluation.delete({
      where: {
        id: evaluationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete evaluation:", error);
    return NextResponse.json({ error: "Failed to delete evaluation" }, { status: 500 });
  }
}
