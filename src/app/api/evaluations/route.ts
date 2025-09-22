import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateInvestment } from "@/lib/roi";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";
import type { $Enums, Prisma } from "@/generated/prisma";

export async function POST(req: Request) {
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const orgId = await getFirstOrganizationIdForUser(userId);
	if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	const body = await req.json();
	const input = {
		purchasePriceCents: Number(body.purchasePriceCents),
		expectedMonthlyRentCents: Number(body.expectedMonthlyRentCents),
		equityCents: body.equityCents != null ? Number(body.equityCents) : undefined,
		interestRatePct: Number(body.interestRatePct),
		loanTermYears: Number(body.loanTermYears),
		monthlyOtherCostsCents: body.monthlyOtherCostsCents != null ? Number(body.monthlyOtherCostsCents) : 0,
	};

	const result = evaluateInvestment(input);
	const saved = await prisma.evaluation.create({
		data: {
			organizationId: orgId,
			createdByUserId: userId,
			purchasePriceCents: input.purchasePriceCents,
			expectedMonthlyRentCents: input.expectedMonthlyRentCents,
			equityCents: input.equityCents,
			interestRatePct: input.interestRatePct,
			loanTermYears: input.loanTermYears,
			monthlyOtherCostsCents: input.monthlyOtherCostsCents,
			grossYieldPct: result.grossYieldPct,
			netYieldPct: result.netYieldPct,
			monthlyCashflowCents: result.monthlyCashflowCents,
			recommendation: result.recommendation as $Enums.Recommendation,
			resultJson: result as unknown as Prisma.InputJsonValue,
		},
	});
	return NextResponse.json(saved, { status: 201 });
}


