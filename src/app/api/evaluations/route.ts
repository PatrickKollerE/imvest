import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateInvestment, calculateROI, calculateAdvancedROI } from "@/lib/roi";
import { getCurrentUserIdFromRequest, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";
import type { $Enums, Prisma } from "@/generated/prisma";

function getRecommendation(roiResult: any): "GREEN" | "YELLOW" | "RED" {
	// Simplified binary recommendation: BUY/DON'T BUY
	if (roiResult.cashOnCashReturn > 0.06 && roiResult.dscr > 1.1 && roiResult.cashflowAfterTax > 0 && roiResult.netYieldPct > 2) {
		return "GREEN"; // BUY
	}
	return "RED"; // DON'T BUY
}

export async function POST(req: NextRequest) {
	// For public evaluation, authentication is optional
	const userId = await getCurrentUserIdFromRequest(req);
	let orgId = null;
	
	// Only require authentication if user is logged in (for saving evaluations)
	if (userId) {
		orgId = await getFirstOrganizationIdForUser(userId);
		if (!orgId) {
			// Create a default organization for the user if they don't have one
			try {
				const defaultOrg = await prisma.organization.create({
					data: {
						name: "Default Organization",
					}
				});
				
				// Create membership
				await prisma.membership.create({
					data: {
						userId: userId,
						organizationId: defaultOrg.id,
						role: "OWNER"
					}
				});
				
				orgId = defaultOrg.id;
			} catch (error) {
				console.error("Failed to create default organization:", error);
				return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
			}
		}
	}

	const body = await req.json();
	const calculationMethod = body.calculationMethod || 'basic';
	
	let result;
	
	if (calculationMethod === 'advanced') {
		// Advanced calculation using comprehensive ROI function
		const advancedInput = {
			purchasePrice: Number(body.purchasePrice || body.purchasePriceCents / 100),
			monthlyRent: Number(body.expectedMonthlyRent || body.expectedMonthlyRentCents / 100),
			equity: Number(body.equity || body.equityCents / 100 || 0),
			interestRatePct: Number(body.interestRate || body.interestRatePct),
			propertySizeSqm: Number(body.propertySizeSqm || 100),
			
			// Advanced parameters with defaults
			acquisitionCostRate: Number(body.acquisitionCostRate || 0),
			vacancyRate: Number(body.vacancyRate || 0),
			maintenanceRate: Number(body.maintenanceRate || 0.01),
			propertyMgmtRate: Number(body.propertyMgmtRate || 0),
			insuranceAndTaxesAnnual: Number(body.insuranceAndTaxesAnnual || 0),
			loanType: body.loanType || "annuity",
			loanTermYears: Number(body.loanTermYears || 10),
			rateResetYears: body.rateResetYears ? Number(body.rateResetYears) : null,
			appreciationRate: Number(body.appreciationRate || 0),
			marginalTaxRate: body.marginalTaxRate ? Number(body.marginalTaxRate) : undefined,
			depreciationAnnual: Number(body.depreciationAnnual || 0),
			otherAnnualOpex: Number(body.otherAnnualOpex || 0),
			oneTimeCosts: Number(body.oneTimeCosts || 0),
			financeCosts: Boolean(body.financeCosts),
		};
		
		const advancedResult = calculateAdvancedROI(advancedInput);
		
		// Convert advanced result to expected format
		result = {
			grossYieldPct: advancedResult.grossYieldPct,
			netYieldPct: advancedResult.netYieldPct,
			monthlyCashflowCents: advancedResult.monthlyCashflowCents,
			recommendation: advancedResult.recommendation,
			advancedMetrics: {
				cashOnCashReturn: advancedResult.cashOnCashReturn,
				capRate: advancedResult.capRate,
				totalROI: advancedResult.totalROI,
				pricePerSqm: advancedResult.pricePerSqm,
				ltvRatio: advancedResult.ltvRatio,
				dscr: advancedResult.dscr,
				paybackPeriodYears: advancedResult.paybackPeriodYears
			},
			detailedBreakdown: {
				acquisitionCosts: advancedResult.acquisitionCosts,
				financedBase: advancedResult.financedBase,
				loanAmount: advancedResult.loanAmount,
				grossAnnualRent: advancedResult.grossAnnualRent,
				economicVacancy: advancedResult.economicVacancy,
				effectiveGrossIncome: advancedResult.effectiveGrossIncome,
				maintenanceAnnual: advancedResult.maintenanceAnnual,
				propertyMgmtAnnual: advancedResult.propertyMgmtAnnual,
				interestAnnual: advancedResult.interestAnnual,
				repaymentAnnual: advancedResult.repaymentAnnual,
				totalAnnualOpex: advancedResult.totalAnnualOpex,
				netOperatingIncome: advancedResult.netOperatingIncome,
				cashflowAnnual: advancedResult.cashflowAnnual,
				cashflowAfterTax: advancedResult.cashflowAfterTax,
				taxAnnual: advancedResult.taxAnnual,
				marketValueY1: advancedResult.marketValueY1,
			}
		};
	} else {
		// Basic calculation using existing function
		const purchasePrice = Number(body.purchasePrice || body.purchasePriceCents / 100);
		const monthlyRent = Number(body.expectedMonthlyRent || body.expectedMonthlyRentCents / 100);
		const equity = Number(body.equity || body.equityCents / 100 || 0);
		const interestRate = Number(body.interestRate || body.interestRatePct);
		const loanTermYears = Number(body.loanTermYears || 25);
		const monthlyOtherCosts = Number(body.operatingMonthlyExpenses || body.monthlyOtherCostsCents / 100 || 0);
		
		const input = {
			purchasePriceCents: purchasePrice * 100,
			expectedMonthlyRentCents: monthlyRent * 100,
			equityCents: equity * 100,
			interestRatePct: interestRate,
			loanTermYears: loanTermYears,
			monthlyOtherCostsCents: monthlyOtherCosts * 100,
		};
		
		const basicResult = evaluateInvestment(input);
		
		// Add basic detailed breakdown
		const loanAmount = Math.max(purchasePrice - equity, 0);
		const annualOtherCosts = monthlyOtherCosts * 12;
		const annualRent = monthlyRent * 12;
		const monthlyInterest = loanAmount * (interestRate / 100 / 12);
		const annualInterest = monthlyInterest * 12;
		
		result = {
			...basicResult,
			detailedBreakdown: {
				acquisitionCosts: 0,
				financedBase: purchasePrice,
				loanAmount: loanAmount,
				grossAnnualRent: annualRent,
				economicVacancy: 0,
				effectiveGrossIncome: annualRent,
				maintenanceAnnual: 0,
				propertyMgmtAnnual: 0,
				interestAnnual: annualInterest,
				repaymentAnnual: 0,
				totalAnnualOpex: annualOtherCosts,
				netOperatingIncome: annualRent - annualOtherCosts,
				cashflowAnnual: (basicResult.monthlyCashflowCents / 100) * 12,
				cashflowAfterTax: (basicResult.monthlyCashflowCents / 100) * 12,
				taxAnnual: 0,
				marketValueY1: purchasePrice,
			}
		};
	}
	
	// Only save to database if user is authenticated and saveCalculation flag is set
	if (body.saveCalculation) {
		if (!userId) {
			return NextResponse.json({ error: "Authentication required to save calculations" }, { status: 401 });
		}
		if (!orgId) {
			return NextResponse.json({ error: "No organization found for user" }, { status: 400 });
		}
		// Prepare common data for database save
		const baseData = {
			organizationId: orgId,
			createdByUserId: userId,
			calculationMethod: calculationMethod,
			purchasePriceCents: Number(body.purchasePrice || body.purchasePriceCents || 0) * 100,
			expectedMonthlyRentCents: Number(body.expectedMonthlyRent || body.expectedMonthlyRentCents || 0) * 100,
			equityCents: body.equity != null ? Number(body.equity || body.equityCents || 0) * 100 : null,
			interestRatePct: Number(body.interestRate || body.interestRatePct || 0),
			loanTermYears: Number(body.loanTermYears || 25),
			monthlyOtherCostsCents: Number(body.operatingMonthlyExpenses || body.monthlyOtherCostsCents || 0) * 100,
			grossYieldPct: result.grossYieldPct,
			netYieldPct: result.netYieldPct,
			monthlyCashflowCents: result.monthlyCashflowCents,
			recommendation: result.recommendation as $Enums.Recommendation,
			resultJson: result as unknown as Prisma.InputJsonValue,
		};
		
		await prisma.evaluation.create({
			data: baseData,
		});
	}
	
	// Return the calculated result with detailed breakdown, not just the database record
	return NextResponse.json(result, { status: 201 });
}


