export const DEFAULT_INTEREST_RATE = 4.89;
export const DEFAULT_SIFO_EXPENSES = 22_000;
export const SPAREBANK_RATE_URL =
  "https://www.sparebank1.no/nb/smn/privat/lofavor/lofavor-prisliste/lofavor-prisliste-nye-priser.html";
export const SIFO_REFERENCE_URL =
  "https://www.oslomet.no/om/sifo/referansebudsjettet";

const MAX_INPUT_VALUE = 999_999_999;

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

export function calculateFallbackSifo({ adults = 2, includeCar = false } = {}) {
  const adultCount = Math.max(0, Math.floor(Number(adults) || 0));
  if (adultCount === 0) {
    return includeCar ? 3_500 : 0;
  }

  const firstAdult = 12_000;
  const otherAdults = Math.max(0, adultCount - 1) * 10_000;
  const carCosts = includeCar ? 3_500 : 0;

  return firstAdult + otherAdults + carCosts;
}

export function calculateMortgageLimits(inputs) {
  const grossIncome = nonNegative(inputs.grossIncome);
  const netIncome = nonNegative(inputs.netIncome);
  const existingDebt = nonNegative(inputs.existingDebt);
  const monthlyDebtPayment = nonNegative(inputs.monthlyDebtPayment);
  const equity = nonNegative(inputs.equity);
  const termYears = Math.max(0, Number(inputs.termYears) || 0);
  const interestRate = Math.max(0, Number(inputs.interestRate) || 0);
  const stressAddon = Math.max(0, Number(inputs.stressAddon) || 0);
  const sifoExpenses = nonNegative(inputs.sifoExpenses);

  const macroLimit = currency(grossIncome * 5 - existingDebt);
  const freeCash = currency(netIncome - sifoExpenses - monthlyDebtPayment);
  const months = termYears * 12;
  const monthlyStressRate = (interestRate + stressAddon) / 100 / 12;
  const liquidityLimit =
    freeCash <= 0 || months <= 0
      ? 0
      : currency(freeCash * annuityPrincipalFactor(monthlyStressRate, months));
  const ltvLimit = currency((equity / 0.15) * 0.85);
  const approvedLoan = Math.min(macroLimit, liquidityLimit, ltvLimit);

  return {
    macroLimit,
    liquidityLimit,
    ltvLimit,
    approvedLoan,
    purchaseBudget: currency(approvedLoan + equity),
    freeCash,
    monthlyStressRate,
    stressRateAnnual: interestRate + stressAddon,
    bottleneckKey: findBottleneck({
      macro: macroLimit,
      liquidity: liquidityLimit,
      ltv: ltvLimit,
    }),
  };
}

export function parseSpareBankRate(html, productName = "LOfavør Boliglån Ung") {
  const text = normalizeNorwegian(toText(html));
  const product = normalizeNorwegian(productName);
  const productIndex = text.indexOf(product);

  if (productIndex === -1) {
    return null;
  }

  const productSection = text.slice(productIndex, productIndex + 900);
  const nominalRateMatch = productSection.match(
    /nom\.?\s*rente\s*fra\s*([0-9]+(?:[,.][0-9]+)?)\s*%/i,
  );

  if (!nominalRateMatch) {
    return null;
  }

  return Number(nominalRateMatch[1].replace(",", "."));
}

export async function fetchSpareBankRate(fetcher = fetch) {
  try {
    const response = await fetcher(SPAREBANK_RATE_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`SpareBank returned ${response.status}`);
    }

    const html = await response.text();
    const parsedRate = parseSpareBankRate(html);
    if (!Number.isFinite(parsedRate)) {
      throw new Error("Rate not found in SpareBank HTML");
    }

    return { value: parsedRate, source: "server", fallback: false };
  } catch (error) {
    return {
      value: DEFAULT_INTEREST_RATE,
      source: "fallback",
      fallback: true,
      error: getErrorMessage(error),
    };
  }
}

export async function fetchSifoExpenses(
  options = { adults: 2, includeCar: true },
  fetcher = fetch,
) {
  try {
    const response = await fetcher(SIFO_REFERENCE_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`SIFO returned ${response.status}`);
    }

    const payload = await response.text();
    const parsedExpenses = parseSifoExpenses(payload);
    if (!Number.isFinite(parsedExpenses)) {
      throw new Error("SIFO amount not found in public data");
    }

    return { value: parsedExpenses, source: "server", fallback: false };
  } catch (error) {
    return {
      value: calculateFallbackSifo(options),
      defaultValue: DEFAULT_SIFO_EXPENSES,
      source: "fallback",
      fallback: true,
      error: getErrorMessage(error),
    };
  }
}

function parseSifoExpenses(payload) {
  try {
    const json = JSON.parse(payload);
    const total = findFirstMonthlyTotal(json);
    return Number.isFinite(total) ? currency(total) : null;
  } catch {
    return null;
  }
}

function findFirstMonthlyTotal(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findFirstMonthlyTotal(item);
      if (Number.isFinite(nested)) {
        return nested;
      }
    }
    return null;
  }

  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (
      Number.isFinite(Number(item)) &&
      /^(monthlytotal|monthly_total|totalmonthly|total_monthly|sum|total)$/.test(
        normalizedKey,
      )
    ) {
      return Number(item);
    }

    const nested = findFirstMonthlyTotal(item);
    if (Number.isFinite(nested)) {
      return nested;
    }
  }

  return null;
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

function normalizeNorwegian(value) {
  return String(value ?? "")
    .replace(/[æä]/gi, "a")
    .replace(/[øö]/gi, "o")
    .replace(/[å]/gi, "a")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toText(html) {
  return String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&aring;/gi, "a")
    .replace(/&oslash;/gi, "o")
    .replace(/&aelig;/gi, "a");
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
