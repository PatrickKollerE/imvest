import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserIdFromRequest, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserIdFromRequest(req);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getFirstOrganizationIdForUser(userId);
    if (!orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const evaluations = await prisma.evaluation.findMany({
      where: {
        organizationId: orgId,
        createdByUserId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        createdAt: true,
        calculationMethod: true,
        purchasePriceCents: true,
        expectedMonthlyRentCents: true,
        equityCents: true,
        interestRatePct: true,
        loanTermYears: true,
        monthlyOtherCostsCents: true,
        grossYieldPct: true,
        netYieldPct: true,
        monthlyCashflowCents: true,
        recommendation: true,
        resultJson: true,
      },
    });

    // Transform the data for frontend consumption
    const transformedEvaluations = evaluations.map(evaluation => ({
      id: evaluation.id,
      createdAt: evaluation.createdAt,
      calculationMethod: evaluation.calculationMethod || 'basic',
      purchasePrice: evaluation.purchasePriceCents / 100,
      expectedMonthlyRent: evaluation.expectedMonthlyRentCents / 100,
      equity: evaluation.equityCents ? evaluation.equityCents / 100 : null,
      interestRate: evaluation.interestRatePct,
      loanTermYears: evaluation.loanTermYears,
      monthlyOtherCosts: evaluation.monthlyOtherCostsCents / 100,
      grossYieldPct: evaluation.grossYieldPct,
      netYieldPct: evaluation.netYieldPct,
      monthlyCashflow: evaluation.monthlyCashflowCents / 100,
      recommendation: evaluation.recommendation,
      resultJson: evaluation.resultJson,
    }));

    return NextResponse.json(transformedEvaluations);
  } catch (error) {
    console.error("Failed to fetch evaluations:", error);
    return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 });
  }
}
