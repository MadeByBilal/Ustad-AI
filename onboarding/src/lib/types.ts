export type UserRole = "customer" | "worker";

export type WorkerCategory = "plumber" | "electrician" | "ac_technician" | "carpenter";

export type OnboardingStep =
  | "welcome"
  | "role"
  | "phone"
  | "password"
  | "location"
  | "category"
  | "service-area"
  | "profile"
  | "complete";

export interface OnboardingData {
  role: UserRole | null;
  phone: string;
  password: string;
  name: string;
  location: string;
  category: WorkerCategory | null;
  serviceArea: string;
}

export const CATEGORY_INFO: Record<WorkerCategory, { label: string; icon: string; description: string }> = {
  plumber: {
    label: "Plumber",
    icon: "🔧",
    description: "Pipes, leaks, fixtures, and water systems",
  },
  electrician: {
    label: "Electrician",
    icon: "⚡",
    description: "Wiring, outlets, switches, and electrical panels",
  },
  ac_technician: {
    label: "AC Technician",
    icon: "❄️",
    description: "Air conditioning, cooling, and HVAC systems",
  },
  carpenter: {
    label: "Carpenter",
    icon: "🪚",
    description: "Furniture, doors, frames, and woodwork",
  },
};

export const CUSTOMER_STEPS: OnboardingStep[] = ["welcome", "role", "phone", "password", "location", "profile", "complete"];
export const WORKER_STEPS: OnboardingStep[] = ["welcome", "role", "phone", "password", "location", "category", "service-area", "profile", "complete"];
