import { ExpenseCategory } from '@/generated/prisma';

export interface LoanCalculation {
  monthlyInterestPayment: number;
  monthlyAmortizationPayment: number;
  totalMonthlyPayment: number;
}

export interface PropertyLoanData {
  loanPrincipalCents: number;
  interestRatePct: number;
  amortizationRatePct: number;
}

/**
 * Calculate monthly loan payments based on principal, interest rate, and amortization rate
 */
export function calculateMonthlyLoanPayments(loanData: PropertyLoanData): LoanCalculation {
  const { loanPrincipalCents, interestRatePct, amortizationRatePct } = loanData;
  
  if (!loanPrincipalCents || !interestRatePct || !amortizationRatePct) {
    return {
      monthlyInterestPayment: 0,
      monthlyAmortizationPayment: 0,
      totalMonthlyPayment: 0,
    };
  }

  const principal = loanPrincipalCents / 100; // Convert to regular currency
  const monthlyInterestRate = interestRatePct / 100 / 12; // Monthly interest rate
  const monthlyAmortizationRate = amortizationRatePct / 100 / 12; // Monthly amortization rate

  const monthlyInterestPayment = principal * monthlyInterestRate;
  const monthlyAmortizationPayment = principal * monthlyAmortizationRate;
  const totalMonthlyPayment = monthlyInterestPayment + monthlyAmortizationPayment;

  return {
    monthlyInterestPayment,
    monthlyAmortizationPayment,
    totalMonthlyPayment,
  };
}

/**
 * Generate loan expense records for a given date range
 */
export function generateLoanExpenses(
  propertyId: string,
  loanData: PropertyLoanData,
  startDate: Date,
  endDate: Date
): Array<{
  propertyId: string;
  date: Date;
  amountCents: number;
  category: ExpenseCategory;
  note: string;
}> {
  const calculations = calculateMonthlyLoanPayments(loanData);
  
  if (calculations.totalMonthlyPayment === 0) {
    return [];
  }

  const expenses = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Generate interest expense
    if (calculations.monthlyInterestPayment > 0) {
      expenses.push({
        propertyId,
        date: new Date(currentDate),
        amountCents: Math.round(calculations.monthlyInterestPayment * 100),
        category: 'LOAN_INTEREST' as ExpenseCategory,
        note: `Monthly loan interest payment`,
      });
    }

    // Generate amortization expense
    if (calculations.monthlyAmortizationPayment > 0) {
      expenses.push({
        propertyId,
        date: new Date(currentDate),
        amountCents: Math.round(calculations.monthlyAmortizationPayment * 100),
        category: 'LOAN_AMORTIZATION' as ExpenseCategory,
        note: `Monthly loan amortization payment`,
      });
    }

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return expenses;
}

/**
 * Generate loan expenses for the next 12 months from a given start date
 */
export function generateNext12MonthsLoanExpenses(
  propertyId: string,
  loanData: PropertyLoanData,
  startDate: Date = new Date()
): Array<{
  propertyId: string;
  date: Date;
  amountCents: number;
  category: ExpenseCategory;
  note: string;
}> {
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  
  return generateLoanExpenses(propertyId, loanData, startDate, endDate);
}
