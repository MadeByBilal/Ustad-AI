import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import CustomerHomeContent from "@/components/CustomerHomeContent";

export const dynamic = "force-dynamic";

export default async function CustomerHomePage() {
  try {
    await requireRole(["customer"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  return <CustomerHomeContent />;
}
