"use client";

import { useEffect, useState } from "react";
import { formatNokInput } from "../lib/mortgage.js";

type RechartsModule = typeof import("recharts");

type ChartDatum = {
  key: string;
  name: string;
  subtitle: string;
  value: number;
};

export default function LimitChart({
  bottleneckKey,
  data,
}: {
  bottleneckKey: string;
  data: ChartDatum[];
}) {
  const [recharts, setRecharts] = useState<RechartsModule | null>(null);

  useEffect(() => {
    let active = true;

    import("recharts").then((module) => {
      if (active) {
        setRecharts(module);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (!recharts) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-[#e5d9c7] bg-[#fffaf1] text-sm font-semibold text-[#6f624e]">
        Загрузка графика...
      </div>
    );
  }

  const {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
  } = recharts;

  return (
    <ResponsiveContainer height="100%" width="100%">
      <BarChart data={data} margin={{ bottom: 12, left: 8, right: 8, top: 8 }}>
        <CartesianGrid stroke="#e9e1d3" strokeDasharray="3 3" />
        <XAxis
          axisLine={false}
          dataKey="name"
          tick={{ fill: "#4b443a", fontSize: 13 }}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          tick={{ fill: "#4b443a", fontSize: 12 }}
          tickFormatter={formatCompactNok}
          tickLine={false}
          width={72}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "rgba(143, 47, 47, 0.08)" }}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {data.map((entry) => (
            <Cell
              fill={entry.key === bottleneckKey ? "#c43d3d" : "#3f7464"}
              key={entry.key}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { subtitle: string; value: number };
  }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="rounded-lg border border-[#ddd6c8] bg-white px-3 py-2 shadow-sm">
      <p className="text-sm font-semibold text-[#413a32]">{item.subtitle}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {formatNok(item.value)}
      </p>
    </div>
  );
}

function formatNok(value: number) {
  return `${formatNokInput(value)} NOK`;
}

function formatCompactNok(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(".", ",")} млн`;
  }

  return formatNokInput(value);
}
