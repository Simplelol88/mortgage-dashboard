import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateFallbackSifo,
  calculateMortgageLimits,
  formatNokInput,
  parseNokInput,
  parseSpareBankRate,
} from "./mortgage.js";

const defaultInputs = {
  grossIncome: 1_100_000,
  netIncome: 65_000,
  existingDebt: 1_561_240,
  monthlyDebtPayment: 10_889,
  equity: 600_000,
  termYears: 30,
  interestRate: 4.89,
  stressAddon: 3,
  sifoExpenses: 22_000,
};

test("calculates the three bank limits and chooses the smallest positive cap", () => {
  const result = calculateMortgageLimits(defaultInputs);

  assert.equal(result.macroLimit, 3_938_760);
  assert.equal(result.ltvLimit, 3_400_000);
  assert.equal(result.bottleneckKey, "ltv");
  assert.equal(result.approvedLoan, 3_400_000);
  assert.equal(result.purchaseBudget, 4_000_000);
  assert.ok(result.liquidityLimit > result.ltvLimit);
});

test("liquidity stress test returns zero when free monthly cash is unavailable", () => {
  const result = calculateMortgageLimits({
    ...defaultInputs,
    netIncome: 25_000,
    sifoExpenses: 22_000,
    monthlyDebtPayment: 5_000,
  });

  assert.equal(result.freeCash, 0);
  assert.equal(result.liquidityLimit, 0);
  assert.equal(result.approvedLoan, 0);
  assert.equal(result.bottleneckKey, "liquidity");
});

test("input formatter keeps up to nine digits and groups thousands with spaces", () => {
  assert.equal(parseNokInput("12 345 678 901"), 123_456_789);
  assert.equal(formatNokInput(123_456_789), "123 456 789");
});

test("SpareBank parser extracts the nominal LOfavor Boliglan Ung rate", () => {
  const html = `
    <section>
      <h3>LOfavor Forstehjemslan</h3>
      <p>Nom. rente fra 4,89 %</p>
      <h3>LOfavor Boliglan Ung (under 34 ar)</h3>
      <p>Lan inntil 90 % av kjopesum</p>
      <p>Nom. rente fra 4,99 %</p>
      <p>Eff. rente fra 5,15 %</p>
    </section>
  `;

  assert.equal(parseSpareBankRate(html), 4.99);
});

test("SIFO fallback can calculate a two-adult household with car costs", () => {
  assert.equal(calculateFallbackSifo({ adults: 2, includeCar: true }), 25_500);
  assert.equal(calculateFallbackSifo({ adults: 2, includeCar: false }), 22_000);
});
