import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateMortgageLimits,
  formatNokInput,
  parseNokInput,
} from "./mortgage.js";

const defaultInputs = {
  grossIncome: 1_100_000,
  netIncome: 65_000,
  existingDebt: 1_561_240,
  monthlyDebtPayment: 10_889,
  propertyValue: 2_950_000,
  bankDeposits: 600_000,
  termYears: 30,
  interestRate: 4.89,
  stressAddon: 3,
  sifoExpenses: 22_000,
};

test("calculates the three bank limits and chooses the smallest positive cap", () => {
  const result = calculateMortgageLimits(defaultInputs);

  assert.equal(result.macroLimit, 3_938_760);
  assert.equal(result.homeEquity, 1_388_760);
  assert.equal(result.totalEquity, 1_988_760);
  assert.equal(result.ltvLimit, 11_269_640);
  assert.equal(result.bottleneckKey, "macro");
  assert.equal(result.approvedLoan, 3_938_760);
  assert.equal(result.purchaseBudget, 5_927_520);
  assert.ok(result.liquidityLimit > result.macroLimit);
});

test("home equity never goes below zero when debt exceeds property value", () => {
  const result = calculateMortgageLimits({
    ...defaultInputs,
    propertyValue: 1_000_000,
    existingDebt: 1_500_000,
    bankDeposits: 200_000,
  });

  assert.equal(result.homeEquity, 0);
  assert.equal(result.totalEquity, 200_000);
  assert.equal(result.ltvLimit, 1_133_333);
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
