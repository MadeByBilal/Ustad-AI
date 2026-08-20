import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import VoiceCapture from "@/components/VoiceCapture";
import CustomerApprovalPanel from "@/components/CustomerApprovalPanel";
import TrackingPreview from "@/components/tracking/TrackingPreview";

export const dynamic = "force-dynamic";

export default async function CustomerHomePage() {
  let session;
  try {
    session = await requireRole(["customer"]);
  } catch {
    redirect("/login");
    throw new Error("unreachable");
  }

  const name = session.user.name ?? "Guest";

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-urdu text-xl font-bold text-stone-900">
              السلام، {name}
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0e5f44] text-base font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="page-content">
        {/* Approval Section */}
        <CustomerApprovalPanel />

        {/* Live Tracking */}
        <TrackingPreview />

        {/* Voice Capture - Hero */}
        <div className="flex flex-col items-center py-8">
          <p className="font-urdu text-2xl font-bold text-stone-900">
            کیا خراب ہوا؟
          </p>
          <p className="mt-2 text-center text-base text-stone-500">
            Hold the button and describe the problem
          </p>
          <div className="mt-8">
            <VoiceCapture variant="dashboard" />
          </div>
        </div>
      </div>
    </div>
  );
}
