"use client";

import { useMemo, useState } from "react";
import LimitChart from "./components/LimitChart";
import {
  DEFAULT_INTEREST_RATE,
  DEFAULT_SIFO_EXPENSES,
  calculateMortgageLimits,
  formatNokInput,
  parseNokInput,
} from "./lib/mortgage.js";

const DEFAULT_FORM = {
  grossIncome: 1_100_000,
  netIncome: 65_000,
  existingDebt: 1_561_240,
  monthlyDebtPayment: 10_889,
  propertyValue: 2_950_000,
  bankDeposits: 600_000,
  termYears: 30,
  interestRate: DEFAULT_INTEREST_RATE,
  stressAddon: 3,
  sifoExpenses: DEFAULT_SIFO_EXPENSES,
};

const BOTTLENECK_TEXT = {
  macro: "Ограничитель: макро-лимит 5x по Utlansforskriften",
  liquidity: "Ограничитель: нехватка ликвидности по стресс-тесту",
  ltv: "Ограничитель: собственный капитал и LTV 85%",
};

const RULE_LABELS = {
  macro: "Правило 1",
  liquidity: "Правило 2",
  ltv: "Правило 3",
};

const RULE_SUBTITLES = {
  macro: "5x доход",
  liquidity: "Стресс-тест",
  ltv: "LTV 85%",
};

type FormState = typeof DEFAULT_FORM;
type MoneyField = keyof Pick<
  FormState,
  | "grossIncome"
  | "netIncome"
  | "existingDebt"
  | "monthlyDebtPayment"
  | "propertyValue"
  | "bankDeposits"
  | "sifoExpenses"
>;
type DecimalField = keyof Pick<FormState, "interestRate" | "stressAddon">;

export default function Home() {
  const [form, setForm] = useState(DEFAULT_FORM);

  const limits = useMemo(() => calculateMortgageLimits(form), [form]);
  const chartData = useMemo(
    () => [
      {
        key: "macro",
        name: RULE_LABELS.macro,
        subtitle: RULE_SUBTITLES.macro,
        value: limits.macroLimit,
      },
      {
        key: "liquidity",
        name: RULE_LABELS.liquidity,
        subtitle: RULE_SUBTITLES.liquidity,
        value: limits.liquidityLimit,
      },
      {
        key: "ltv",
        name: RULE_LABELS.ltv,
        subtitle: RULE_SUBTITLES.ltv,
        value: limits.ltvLimit,
      },
    ],
    [limits],
  );

  function setMoneyField(field: MoneyField, value: number) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setDecimalField(field: DecimalField, value: string) {
    const parsed = Number(value.replace(",", "."));
    setForm((current) => ({
      ...current,
      [field]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
    }));
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#191715]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-[#ddd6c8] bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-[#6f624e]">
                Норвежская ипотека
              </p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                {formatNok(limits.approvedLoan)}
              </h1>
              <p className="mt-2 text-lg font-medium text-[#8f2f2f]">
                {BOTTLENECK_TEXT[limits.bottleneckKey]}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricBlock
                label="Одобренная сумма кредита"
                value={formatNok(limits.approvedLoan)}
              />
              <MetricBlock
                label="Максимальный бюджет покупки"
                value={formatNok(limits.purchaseBudget)}
              />
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[420px_1fr]">
          <div className="min-w-0 rounded-lg border border-[#ddd6c8] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <div>
                <h2 className="text-xl font-semibold">Входные данные</h2>
                <p className="mt-1 text-sm text-[#6f624e]">
                  Значения в NOK, ставка в процентах годовых.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <MoneyInput
                label="Брутто-доход в год"
                onChange={(value) => setMoneyField("grossIncome", value)}
                value={form.grossIncome}
              />
              <MoneyInput
                label="Чистый доход в месяц"
                onChange={(value) => setMoneyField("netIncome", value)}
                value={form.netIncome}
              />
              <MoneyInput
                label="Текущие долги"
                onChange={(value) => setMoneyField("existingDebt", value)}
                value={form.existingDebt}
              />
              <MoneyInput
                label="Ежемес. платеж по долгам"
                onChange={(value) => setMoneyField("monthlyDebtPayment", value)}
                value={form.monthlyDebtPayment}
              />
              <MoneyInput
                label="Стоимость текущего объекта"
                onChange={(value) => setMoneyField("propertyValue", value)}
                value={form.propertyValue}
              />
              <MoneyInput
                label="Банковские вклады"
                onChange={(value) => setMoneyField("bankDeposits", value)}
                value={form.bankDeposits}
              />
              <div className="rounded-lg border border-[#e5d9c7] bg-[#fffaf1] p-4">
                <p className="text-sm font-semibold text-[#6f624e]">
                  Капитал в текущей ипотеке
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatNok(limits.homeEquity)}
                </p>
                <p className="mt-1 text-sm text-[#6f624e]">
                  Общий капитал: {formatNok(limits.totalEquity)}
                </p>
              </div>
              <MoneyInput
                label="Расходы SIFO"
                onChange={(value) => setMoneyField("sifoExpenses", value)}
                value={form.sifoExpenses}
              />
              <div className="grid min-w-0 gap-4 sm:grid-cols-3">
                <NumberInput
                  label="Срок"
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      termYears: Math.max(0, Math.min(50, value)),
                    }))
                  }
                  suffix="лет"
                  value={form.termYears}
                />
                <DecimalInput
                  label="Ставка"
                  onChange={(value) => setDecimalField("interestRate", value)}
                  suffix="%"
                  value={form.interestRate}
                />
                <DecimalInput
                  label="Надбавка"
                  onChange={(value) => setDecimalField("stressAddon", value)}
                  suffix="%"
                  value={form.stressAddon}
                />
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-6">
            <section className="rounded-lg border border-[#ddd6c8] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Три банковских лимита</h2>
                  <p className="mt-1 text-sm text-[#6f624e]">
                    Красный столбец является текущим ограничителем.
                  </p>
                </div>
                <div className="text-sm text-[#4f5f43]">
                  Свободный кэш: {formatNok(limits.freeCash)}
                </div>
              </div>

              <div className="h-[340px] w-full">
                <LimitChart
                  bottleneckKey={limits.bottleneckKey}
                  data={chartData}
                />
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <RuleCard
                active={limits.bottleneckKey === "macro"}
                label="Правило 1"
                title="Макро-лимит 5x"
                value={formatNok(limits.macroLimit)}
              />
              <RuleCard
                active={limits.bottleneckKey === "liquidity"}
                label="Правило 2"
                title={`Стресс ${formatPercent(limits.stressRateAnnual)}`}
                value={formatNok(limits.liquidityLimit)}
              />
              <RuleCard
                active={limits.bottleneckKey === "ltv"}
                label="Правило 3"
                title="LTV 85%"
                value={formatNok(limits.ltvLimit)}
              />
            </section>

          </div>
        </section>
      </div>
    </main>
  );
}

function MoneyInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-semibold text-[#413a32]">{label}</span>
      <input
        className="h-14 min-w-0 w-full rounded-lg border border-[#cfc4b4] bg-[#fffdfa] px-4 text-2xl font-semibold tabular-nums text-[#191715] outline-none transition focus:border-[#3f7464] focus:ring-4 focus:ring-[#3f7464]/15"
        inputMode="numeric"
        maxLength={11}
        onChange={(event) => onChange(parseNokInput(event.target.value))}
        value={formatNokInput(value)}
      />
    </label>
  );
}

function NumberInput({
  label,
  onChange,
  suffix,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  suffix: string;
  value: number;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-semibold text-[#413a32]">{label}</span>
      <div className="flex h-14 min-w-0 w-full items-center rounded-lg border border-[#cfc4b4] bg-[#fffdfa] focus-within:border-[#3f7464] focus-within:ring-4 focus-within:ring-[#3f7464]/15">
        <input
          className="min-w-0 flex-1 bg-transparent px-3 text-2xl font-semibold tabular-nums outline-none"
          inputMode="numeric"
          onChange={(event) => onChange(parseNokInput(event.target.value))}
          value={value}
        />
        <span className="pr-3 text-sm font-semibold text-[#6f624e]">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function DecimalInput({
  label,
  onChange,
  suffix,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  suffix: string;
  value: number;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-semibold text-[#413a32]">{label}</span>
      <div className="flex h-14 min-w-0 w-full items-center rounded-lg border border-[#cfc4b4] bg-[#fffdfa] focus-within:border-[#3f7464] focus-within:ring-4 focus-within:ring-[#3f7464]/15">
        <input
          className="min-w-0 flex-1 bg-transparent px-3 text-2xl font-semibold tabular-nums outline-none"
          inputMode="decimal"
          onChange={(event) => onChange(event.target.value)}
          value={String(value).replace(".", ",")}
        />
        <span className="pr-3 text-sm font-semibold text-[#6f624e]">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#ddd6c8] bg-[#fffaf1] p-4">
      <p className="text-sm font-semibold text-[#6f624e]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function RuleCard({
  active,
  label,
  title,
  value,
}: {
  active: boolean;
  label: string;
  title: string;
  value: string;
}) {
  return (
    <article
      className={`rounded-lg border p-4 ${
        active
          ? "border-[#c43d3d] bg-[#fff3f1]"
          : "border-[#ddd6c8] bg-white"
      }`}
    >
      <p className="text-sm font-semibold text-[#6f624e]">{label}</p>
      <h3 className="mt-1 text-base font-semibold">{title}</h3>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}

function formatNok(value: number) {
  return `${formatNokInput(value)} NOK`;
}

function formatPercent(value: number) {
  return `${value.toFixed(2).replace(".", ",")}%`;
}
