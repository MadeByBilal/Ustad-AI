import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import VoiceCapture from "@/components/VoiceCapture";
import ActiveJobStatusBar from "@/components/ActiveJobStatusBar";

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
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <p className="font-urdu text-xl font-bold text-stone-900">
            السلام، {name}
          </p>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0e5f44] text-base font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Content - Voice Button */}
      <div className="flex flex-1 flex-col items-center justify-center px-5">
        <p className="font-urdu text-3xl font-bold text-stone-900">
          کیا خراب ہوا؟
        </p>
        <p className="mt-3 text-center text-lg text-stone-500">
          Hold the button and describe the problem
        </p>
        <div className="mt-10">
          <VoiceCapture variant="dashboard" />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <ActiveJobStatusBar />
    </div>
  );
}
