import type { Metadata } from "next";
import { PortfolioView } from "@/components/portfolio/portfolio-view";

export const metadata: Metadata = { title: "Portfolio · Basis" };

export default function PortfolioPage() {
  return <PortfolioView />;
}
