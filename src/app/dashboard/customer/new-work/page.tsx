import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import NewWorkWizard from "@/components/NewWorkWizard";

export const dynamic = "force-dynamic";

export default async function NewWorkPage() {
  await requireRole(["customer"]).catch(() => {
    redirect("/login");
    throw new Error("unreachable");
  });

  return <NewWorkWizard />;
}