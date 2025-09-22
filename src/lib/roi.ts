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

export function computeAnnuityPaymentCents(principalCents: number, annualRatePct: number, months: number): number {
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

	// For cashflow calculation, only subtract interest (not principal payments)
	const monthlyInterestCents = Math.round(loanPrincipalCents * monthlyRate(input.interestRatePct));
	const monthlyCashflowCents = input.expectedMonthlyRentCents - otherCosts - monthlyInterestCents;

	// Simplified recommendation: BUY/DON'T BUY
	let recommendation: EvaluationOutput["recommendation"] = "RED"; // Default to DON'T BUY
	if (monthlyCashflowCents >= 0 && netYieldPct >= 2.5) recommendation = "GREEN"; // BUY

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

export type AdvancedCalculationInput = {
	// Basic inputs
	purchasePrice: number;
	monthlyRent: number;
	equity: number;
	interestRatePct: number;
	propertySizeSqm: number;
	
	// Advanced inputs
	acquisitionCostRate?: number; // 0-1, default 0
	vacancyRate?: number; // 0-1, default 0
	maintenanceRate?: number; // 0-1, default 0.01
	propertyMgmtRate?: number; // 0-1, default 0
	insuranceAndTaxesAnnual?: number; // CHF/year, default 0
	loanType?: "annuity" | "interestOnly"; // default "annuity"
	loanTermYears?: number; // default 10
	rateResetYears?: number | null; // default null
	appreciationRate?: number; // 0-1, default 0
	marginalTaxRate?: number; // 0-1, default undefined
	depreciationAnnual?: number; // CHF/year, default 0
	otherAnnualOpex?: number; // CHF/year, default 0
	oneTimeCosts?: number; // CHF, default 0
	financeCosts?: boolean; // default false
};

export type AdvancedCalculationOutput = {
	// Basic metrics
	grossYieldPct: number;
	netYieldPct: number;
	monthlyCashflowCents: number;
	
	// Advanced metrics
	cashOnCashReturn: number;
	capRate: number;
	totalROI: number;
	pricePerSqm: number;
	ltvRatio: number;
	dscr: number;
	paybackPeriodYears: number;
	
	// Detailed breakdown
	acquisitionCosts: number;
	financedBase: number;
	loanAmount: number;
	grossAnnualRent: number;
	economicVacancy: number;
	effectiveGrossIncome: number;
	maintenanceAnnual: number;
	propertyMgmtAnnual: number;
	interestAnnual: number;
	repaymentAnnual: number;
	totalAnnualOpex: number;
	netOperatingIncome: number;
	cashflowAnnual: number;
	cashflowAfterTax: number;
	taxAnnual: number;
	marketValueY1: number;
	
	// Recommendations
	recommendation: "GREEN" | "YELLOW" | "RED";
};

export function calculateAdvancedROI(input: AdvancedCalculationInput): AdvancedCalculationOutput {
	// Apply defaults
	const {
		purchasePrice,
		monthlyRent,
		equity,
		interestRatePct,
		propertySizeSqm,
		acquisitionCostRate = 0,
		vacancyRate = 0,
		maintenanceRate = 0.01,
		propertyMgmtRate = 0,
		insuranceAndTaxesAnnual = 0,
		loanType = "annuity",
		loanTermYears = 10,
		rateResetYears = null,
		appreciationRate = 0,
		marginalTaxRate = undefined,
		depreciationAnnual = 0,
		otherAnnualOpex = 0,
		oneTimeCosts = 0,
		financeCosts = false,
	} = input;

	// Calculate acquisition costs
	const acquisitionCosts = purchasePrice * acquisitionCostRate;
	
	// Calculate financed base
	const financedBase = financeCosts 
		? purchasePrice + acquisitionCosts + oneTimeCosts
		: purchasePrice;
	
	// Calculate loan amount
	const loanAmount = Math.max(0, financedBase - equity);
	
	// Calculate rent metrics
	const grossAnnualRent = monthlyRent * 12;
	const economicVacancy = grossAnnualRent * vacancyRate;
	const effectiveGrossIncome = grossAnnualRent - economicVacancy;
	
	// Calculate operating expenses
	const maintenanceAnnual = purchasePrice * maintenanceRate;
	const propertyMgmtAnnual = grossAnnualRent * propertyMgmtRate;
	const totalAnnualOpex = maintenanceAnnual + propertyMgmtAnnual + insuranceAndTaxesAnnual + otherAnnualOpex;
	
	// Calculate financing
	const interestAnnual = loanAmount * (interestRatePct / 100);
	let repaymentAnnual = 0;
	if (loanType === "annuity" && loanAmount > 0) {
		const monthlyAnnuityPayment = computeAnnuityPaymentCents(loanAmount * 100, interestRatePct, loanTermYears * 12) / 100;
		const annualAnnuityPayment = monthlyAnnuityPayment * 12;
		repaymentAnnual = Math.max(0, annualAnnuityPayment - interestAnnual);
	}
	
	// Calculate NOI and cashflow
	const netOperatingIncome = effectiveGrossIncome - totalAnnualOpex;
	const cashflowAnnual = netOperatingIncome - interestAnnual - repaymentAnnual;
	
	// Calculate tax implications
	let taxAnnual = 0;
	let cashflowAfterTax = cashflowAnnual;
	if (marginalTaxRate !== undefined && marginalTaxRate > 0) {
		const taxableIncome = Math.max(0, netOperatingIncome - interestAnnual - depreciationAnnual);
		taxAnnual = taxableIncome * marginalTaxRate;
		cashflowAfterTax = cashflowAnnual - taxAnnual;
	}
	
	// Calculate market value appreciation
	const marketValueY1 = purchasePrice * (1 + appreciationRate);
	
	// Calculate key metrics
	const totalInvestment = equity + acquisitionCosts + oneTimeCosts;
	const grossYieldPct = (grossAnnualRent / purchasePrice) * 100;
	const netYieldPct = (netOperatingIncome / purchasePrice) * 100;
	const monthlyCashflowCents = cashflowAfterTax * 100 / 12;
	
	// Advanced metrics
	const cashOnCashReturn = totalInvestment > 0 ? (cashflowAfterTax / totalInvestment) * 100 : 0;
	const capRate = marketValueY1 > 0 ? (netOperatingIncome / marketValueY1) * 100 : 0;
	const totalROI = totalInvestment > 0 ? ((cashflowAfterTax + (marketValueY1 - purchasePrice)) / totalInvestment) * 100 : 0;
	const pricePerSqm = propertySizeSqm > 0 ? purchasePrice / propertySizeSqm : 0;
	const ltvRatio = marketValueY1 > 0 ? (loanAmount / marketValueY1) * 100 : 0;
	const annualDebtService = interestAnnual + repaymentAnnual;
	const dscr = annualDebtService > 0 ? netOperatingIncome / annualDebtService : 0;
	const paybackPeriodYears = cashflowAfterTax > 0 ? totalInvestment / cashflowAfterTax : 0;
	
	// Generate recommendation - simplified to BUY/DON'T BUY
	let recommendation: "GREEN" | "YELLOW" | "RED" = "RED"; // Default to DON'T BUY
	if (cashOnCashReturn > 6 && dscr > 1.1 && cashflowAfterTax > 0 && netYieldPct > 2) {
		recommendation = "GREEN"; // BUY
	}
	
	return {
		grossYieldPct,
		netYieldPct,
		monthlyCashflowCents,
		cashOnCashReturn,
		capRate,
		totalROI,
		pricePerSqm,
		ltvRatio,
		dscr,
		paybackPeriodYears,
		acquisitionCosts,
		financedBase,
		loanAmount,
		grossAnnualRent,
		economicVacancy,
		effectiveGrossIncome,
		maintenanceAnnual,
		propertyMgmtAnnual,
		interestAnnual,
		repaymentAnnual,
		totalAnnualOpex,
		netOperatingIncome,
		cashflowAnnual,
		cashflowAfterTax,
		taxAnnual,
		marketValueY1,
		recommendation,
	};
}


