import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ипотечный симулятор Норвегии",
  description: "SPA-дашборд для расчета максимальной ипотеки в Норвегии.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
