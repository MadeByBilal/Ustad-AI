import { redirect } from "next/navigation";
import { requireRole } from "@/server/lib/auth";
import NewWorkWizard from "@/client/components/NewWorkWizard";

export const dynamic = "force-dynamic";

export default async function NewWorkPage() {
  await requireRole(["customer"]).catch(() => {
    redirect("/login");
    throw new Error("unreachable");
  });

  return <NewWorkWizard />;
}