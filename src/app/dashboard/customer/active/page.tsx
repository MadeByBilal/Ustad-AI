import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import ActiveJobTracking from "@/components/ActiveJobTracking";

export const dynamic = "force-dynamic";

export default async function ActiveJobPage() {
  try {
    await requireRole(["customer"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  return (
    <div className="h-screen">
      <ActiveJobTracking />
    </div>
  );
}
