import { redirect } from "next/navigation";
import { requireRole } from "@/server/lib/auth";
import ResultPageClient from "./ResultPageClient";

export const dynamic = "force-dynamic";

export default async function ResultPage() {
  try {
    await requireRole(["customer"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  return <ResultPageClient />;
}
