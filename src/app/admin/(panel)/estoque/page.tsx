import type { Metadata } from "next";
import { StockManager } from "@/components/admin/StockManager";

export const metadata: Metadata = { title: "Estoque", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function EstoquePage() {
  return <StockManager />;
}
