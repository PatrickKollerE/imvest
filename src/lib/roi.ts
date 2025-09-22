export type EvaluationInput = {
	purchasePriceCents: number;
	expectedMonthlyRentCents: number;
	equityCents?: number;
	interestRatePct: number; // annual
	loanTermYears: number;
	monthlyOtherCostsCents?: number;
};

export type ForecastPoint = {
	year: number;
	remainingPrincipalCents: number;
	interestPaidCents: number;
	principalPaidCents: number;
	netWorthCents: number;
};

export type EvaluationOutput = {
	grossYieldPct: number;
	netYieldPct: number;
	monthlyCashflowCents: number;
	recommendation: "GREEN" | "YELLOW" | "RED";
	forecast: ForecastPoint[];
};

function monthlyRate(annualRatePct: number): number {
	return annualRatePct / 100 / 12;
}

function computeAnnuityPaymentCents(principalCents: number, annualRatePct: number, months: number): number {
	const r = monthlyRate(annualRatePct);
	if (r === 0) return Math.round(principalCents / months);
	const payment = (principalCents * r) / (1 - Math.pow(1 + r, -months));
	return Math.round(payment);
}

export function evaluateInvestment(input: EvaluationInput): EvaluationOutput {
	const otherCosts = input.monthlyOtherCostsCents ?? 0;
	const equity = input.equityCents ?? 0;
	const loanPrincipalCents = Math.max(input.purchasePriceCents - equity, 0);
	const months = input.loanTermYears * 12;
	const monthlyDebtServiceCents = computeAnnuityPaymentCents(loanPrincipalCents, input.interestRatePct, months);

	const annualRentCents = input.expectedMonthlyRentCents * 12;
	const grossYieldPct = (annualRentCents / input.purchasePriceCents) * 100;

	// Approximate net yield as (rent - otherCosts - interest-only first year) / price
	const firstMonthInterest = Math.round(loanPrincipalCents * monthlyRate(input.interestRatePct));
	const approxMonthlyNet = input.expectedMonthlyRentCents - otherCosts - firstMonthInterest;
	const netYieldPct = ((approxMonthlyNet * 12) / input.purchasePriceCents) * 100;

	const monthlyCashflowCents = input.expectedMonthlyRentCents - otherCosts - monthlyDebtServiceCents;

	let recommendation: EvaluationOutput["recommendation"] = "YELLOW";
	if (monthlyCashflowCents >= 0 && netYieldPct >= 3) recommendation = "GREEN";
	else if (monthlyCashflowCents < 0 && netYieldPct < 2) recommendation = "RED";

	// Build simple yearly forecast over 10 years
	const forecast: ForecastPoint[] = [];
	let remaining = loanPrincipalCents;
	for (let y = 1; y <= Math.min(10, input.loanTermYears); y++) {
		let interestPaid = 0;
		let principalPaid = 0;
		for (let m = 0; m < 12; m++) {
			if (remaining <= 0) break;
			const interest = Math.round(remaining * monthlyRate(input.interestRatePct));
			const principal = Math.min(monthlyDebtServiceCents - interest, remaining);
			interestPaid += interest;
			principalPaid += principal;
			remaining -= principal;
		}
		const netWorthCents = equity + (loanPrincipalCents - remaining);
		forecast.push({
			year: y,
			remainingPrincipalCents: Math.max(remaining, 0),
			interestPaidCents: interestPaid,
			principalPaidCents: principalPaid,
			netWorthCents,
		});
	}

	return { grossYieldPct, netYieldPct, monthlyCashflowCents, recommendation, forecast };
}

export type ROICalculationInput = {
	purchasePrice: number;
	marketValue: number;
	equity: number;
	loanPrincipal: number;
	interestRatePct: number;
	amortizationRatePct: number;
	monthlyRent: number;
	monthlyExpenses: number;
	propertySizeSqm: number;
};

export type ROICalculationOutput = {
	cashOnCashReturn: number;
	capRate: number;
	totalROI: number;
	pricePerSqm: number;
	monthlyRent: number;
	monthlyExpenses: number;
	grossYield: number;
	netYield: number;
	ltvRatio: number;
	dscr: number;
	paybackPeriodYears: number;
};

export function calculateROI(input: ROICalculationInput): ROICalculationOutput {
	const { purchasePrice, marketValue, equity, loanPrincipal, interestRatePct, amortizationRatePct, monthlyRent, monthlyExpenses, propertySizeSqm } = input;
	
	// Basic calculations
	const annualRent = monthlyRent * 12;
	const annualExpenses = monthlyExpenses * 12;
	const netOperatingIncome = annualRent - annualExpenses;
	
	// Cash-on-Cash Return = (Annual Net Income / Total Cash Invested) * 100
	const cashOnCashReturn = equity > 0 ? netOperatingIncome / equity : 0;
	
	// Cap Rate = (Net Operating Income / Property Value) * 100
	const capRate = marketValue > 0 ? netOperatingIncome / marketValue : 0;
	
	// Total ROI = (Net Operating Income + Appreciation) / Total Investment
	const appreciation = marketValue - purchasePrice;
	const totalROI = equity > 0 ? (netOperatingIncome + appreciation) / equity : 0;
	
	// Price per square meter
	const pricePerSqm = propertySizeSqm > 0 ? purchasePrice / propertySizeSqm : 0;
	
	// Gross Yield = (Annual Rent / Purchase Price) * 100
	const grossYield = purchasePrice > 0 ? annualRent / purchasePrice : 0;
	
	// Net Yield = (Net Operating Income / Purchase Price) * 100
	const netYield = purchasePrice > 0 ? netOperatingIncome / purchasePrice : 0;
	
	// Loan-to-Value Ratio = (Loan Amount / Property Value) * 100
	const ltvRatio = marketValue > 0 ? loanPrincipal / marketValue : 0;
	
	// Debt Service Coverage Ratio = Net Operating Income / Annual Debt Service
	const monthlyDebtService = loanPrincipal > 0 ? (loanPrincipal * (interestRatePct / 100 / 12)) + (loanPrincipal * (amortizationRatePct / 100 / 12)) : 0;
	const annualDebtService = monthlyDebtService * 12;
	const dscr = annualDebtService > 0 ? netOperatingIncome / annualDebtService : 0;
	
	// Payback Period = Total Investment / Annual Net Income
	const paybackPeriodYears = netOperatingIncome > 0 ? equity / netOperatingIncome : 0;
	
	return {
		cashOnCashReturn,
		capRate,
		totalROI,
		pricePerSqm,
		monthlyRent,
		monthlyExpenses,
		grossYield,
		netYield,
		ltvRatio,
		dscr,
		paybackPeriodYears
	};
}


