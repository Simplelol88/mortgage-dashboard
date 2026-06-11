export const DEFAULT_INTEREST_RATE = 4.89;
export const DEFAULT_SIFO_EXPENSES = 22_000;

const MAX_INPUT_VALUE = 999_999_999;
const EXTRA_INCOME_MONTHS_FOR_MACRO = 10;

export function parseNokInput(value) {
  const digits = String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 9);

  return digits ? Number(digits) : 0;
}

export function formatNokInput(value) {
  const safeValue = clampCurrency(value);
  return String(safeValue).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function calculateMortgageLimits(inputs) {
  const grossIncome = nonNegative(inputs.grossIncome);
  const netIncome = nonNegative(inputs.netIncome);
  const existingDebt = nonNegative(inputs.existingDebt);
  const monthlyDebtPayment = nonNegative(inputs.monthlyDebtPayment);
  const rentalHouseIncome = nonNegative(inputs.rentalHouseIncome);
  const house2Income = nonNegative(inputs.house2Income);
  const rentalHouseIncomeAfterTax = currency(rentalHouseIncome * 0.78);
  const extraMonthlyIncome = currency(rentalHouseIncomeAfterTax + house2Income);
  const extraAnnualIncomeForMacro = currency(
    extraMonthlyIncome * EXTRA_INCOME_MONTHS_FOR_MACRO,
  );
  const effectiveAnnualIncome = currency(
    grossIncome + extraAnnualIncomeForMacro,
  );
  const effectiveNetMonthlyIncome = currency(netIncome + extraMonthlyIncome);
  const propertyValue = nonNegative(inputs.propertyValue);
  const bankDeposits = nonNegative(inputs.bankDeposits);
  const homeEquity = currency(propertyValue - existingDebt);
  const totalEquity = currency(homeEquity + bankDeposits);
  const termYears = Math.max(0, Number(inputs.termYears) || 0);
  const interestRate = Math.max(0, Number(inputs.interestRate) || 0);
  const stressAddon = Math.max(0, Number(inputs.stressAddon) || 0);
  const sifoExpenses = nonNegative(inputs.sifoExpenses);

  const macroLimit = currency(effectiveAnnualIncome * 5 - existingDebt);
  const freeCash = currency(
    effectiveNetMonthlyIncome - sifoExpenses - monthlyDebtPayment,
  );
  const months = termYears * 12;
  const monthlyStressRate = (interestRate + stressAddon) / 100 / 12;
  const liquidityLimit =
    freeCash <= 0 || months <= 0
      ? 0
      : currency(freeCash * annuityPrincipalFactor(monthlyStressRate, months));
  const ltvLimit = currency((totalEquity / 0.15) * 0.85);
  const approvedLoan = Math.min(macroLimit, liquidityLimit, ltvLimit);

  return {
    macroLimit,
    liquidityLimit,
    ltvLimit,
    approvedLoan,
    purchaseBudget: currency(approvedLoan + totalEquity),
    freeCash,
    homeEquity,
    totalEquity,
    rentalHouseIncomeAfterTax,
    extraMonthlyIncome,
    extraAnnualIncomeForMacro,
    effectiveAnnualIncome,
    effectiveNetMonthlyIncome,
    monthlyStressRate,
    stressRateAnnual: interestRate + stressAddon,
    bottleneckKey: findBottleneck({
      macro: macroLimit,
      liquidity: liquidityLimit,
      ltv: ltvLimit,
    }),
  };
}

function annuityPrincipalFactor(monthlyRate, months) {
  if (monthlyRate <= 0) {
    return months;
  }

  return (1 - (1 + monthlyRate) ** -months) / monthlyRate;
}

function findBottleneck(limits) {
  const entries = Object.entries(limits);
  return entries.reduce((lowest, current) =>
    current[1] < lowest[1] ? current : lowest,
  )[0];
}

function currency(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function clampCurrency(value) {
  return Math.min(MAX_INPUT_VALUE, currency(value));
}

function nonNegative(value) {
  return Math.max(0, Number(value) || 0);
}
