import type { Metadata } from "next";
import AppNavigation from "@/components/app-navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Agriculture Advisor",
  description:
    "Careful, transparent farming information and a rule-based agricultural assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppNavigation />
        {children}
      </body>
    </html>
  );
}
