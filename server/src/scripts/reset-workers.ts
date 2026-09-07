import { connectDB, disconnectDB } from "../lib/mongodb.js";
import { User, Worker } from "../models/index.js";
import { hashPassword } from "../lib/auth/password.js";

const PASSWORD = "Password123";

interface SeedWorker {
  name: string;
  email: string;
  phone: string;
  category: "plumber" | "electrician" | "ac_technician" | "carpenter";
  skills: string[];
  lat: number;
  lng: number;
  city: string;
  ustad_score: number;
  completed_jobs: number;
  average_rating: number;
  emergency_available: boolean;
  emergency_capabilities: string[];
}

const WORKERS: SeedWorker[] = [
  // ── PLUMBERS (4) ──
  {
    name: "Ahmad Raza",
    email: "ahmad.raza@ustad.ai",
    phone: "03214567890",
    category: "plumber",
    skills: ["pipe_leak", "faucet_repair", "drain_cleaning", "geyser_fitting", "motor_pump", "tank_cleaning"],
    lat: 24.8607, lng: 67.0011, city: "Karachi - Defence Phase 5",
    ustad_score: 92, completed_jobs: 156, average_rating: 4.8,
    emergency_available: true, emergency_capabilities: ["burst_pipe", "water_flooding"],
  },
  {
    name: "Tariq Hussain",
    email: "tariq.hussain@ustad.ai",
    phone: "03011234567",
    category: "plumber",
    skills: ["commode_repair", "tap_repair", "muslim_shower", "pipe_fitting", "sink_blockage"],
    lat: 31.5204, lng: 74.3587, city: "Lahore - Johar Town",
    ustad_score: 87, completed_jobs: 89, average_rating: 4.6,
    emergency_available: false, emergency_capabilities: [],
  },
  {
    name: "Nasir Mehmood",
    email: "nasir.plumb@ustad.ai",
    phone: "03329876543",
    category: "plumber",
    skills: ["water_leak", "pipe_leakage", "nalka_fix", "geyser_repair", "drain_cleaning"],
    lat: 33.6844, lng: 73.0479, city: "Islamabad - G-9 Markaz",
    ustad_score: 79, completed_jobs: 34, average_rating: 4.3,
    emergency_available: true, emergency_capabilities: ["burst_pipe"],
  },
  {
    name: "Kamran Shah",
    email: "kamran.shah@ustad.ai",
    phone: "03451112233",
    category: "plumber",
    skills: ["faucet_repair", "pipe_fitting", "tank_cleaning", "motor_pump"],
    lat: 34.0151, lng: 71.5249, city: "Peshawar - Hayatabad",
    ustad_score: 74, completed_jobs: 18, average_rating: 4.1,
    emergency_available: false, emergency_capabilities: [],
  },

  // ── ELECTRICIANS (4) ──
  {
    name: "Usman Ghani",
    email: "usman.ghani@ustad.ai",
    phone: "03331234567",
    category: "electrician",
    skills: ["wiring", "short_circuit", "breaker_issue", "fan_installation", "switch_repair", "light_fitting"],
    lat: 31.5204, lng: 74.3587, city: "Lahore - Gulberg III",
    ustad_score: 88, completed_jobs: 98, average_rating: 4.7,
    emergency_available: true, emergency_capabilities: ["short_circuit", "power_outage", "sparks"],
  },
  {
    name: "Bilal Ahmed",
    email: "bilal.electric@ustad.ai",
    phone: "03215556677",
    category: "electrician",
    skills: ["ups_wiring", "generator_wiring", "breaker_issue", "light_fitting", "dimmer_fix"],
    lat: 24.9056, lng: 67.0822, city: "Karachi - North Nazimabad",
    ustad_score: 91, completed_jobs: 132, average_rating: 4.8,
    emergency_available: true, emergency_capabilities: ["power_outage", "fuse_repair"],
  },
  {
    name: "Salman Yousaf",
    email: "salman.yousaf@ustad.ai",
    phone: "03008887766",
    category: "electrician",
    skills: ["appliance_repair", "inverter_installation", "wiring", "switch_repair"],
    lat: 33.6941, lng: 73.0476, city: "Islamabad - Blue Area",
    ustad_score: 82, completed_jobs: 56, average_rating: 4.5,
    emergency_available: false, emergency_capabilities: [],
  },
  {
    name: "Asad Khan",
    email: "asad.khan@ustad.ai",
    phone: "03112223344",
    category: "electrician",
    skills: ["fan_installation", "light_fitting", "switch_repair", "wiring"],
    lat: 34.0234, lng: 71.5791, city: "Peshawar - University Town",
    ustad_score: 76, completed_jobs: 22, average_rating: 4.2,
    emergency_available: false, emergency_capabilities: [],
  },

  // ── AC TECHNICIANS (4) ──
  {
    name: "Faisal Mehmood",
    email: "faisal.ac@ustad.ai",
    phone: "03009876543",
    category: "ac_technician",
    skills: ["ac_cooling", "gas_refilling", "ac_service", "split_ac_installation", "compressor_replacement", "filter_cleaning"],
    lat: 33.6844, lng: 73.0479, city: "Islamabad - F-8 Markaz",
    ustad_score: 95, completed_jobs: 203, average_rating: 4.9,
    emergency_available: true, emergency_capabilities: ["gas_leak", "ac_tripping"],
  },
  {
    name: "Waseem Akram",
    email: "waseem.ac@ustad.ai",
    phone: "03217778899",
    category: "ac_technician",
    skills: ["ac_service", "gas_refilling", "inverter_pcb_repair", "ac_installation", "deep_cleaning"],
    lat: 24.8975, lng: 67.0766, city: "Karachi - Clifton",
    ustad_score: 90, completed_jobs: 145, average_rating: 4.75,
    emergency_available: true, emergency_capabilities: ["gas_leak", "ac_tripping", "water_dripping"],
  },
  {
    name: "Adnan Malik",
    email: "adnan.ac@ustad.ai",
    phone: "03334445566",
    category: "ac_technician",
    skills: ["ac_cooling", "ac_service", "window_ac", "thermostat_fix", "cooling_issue"],
    lat: 31.5135, lng: 74.3490, city: "Lahore - DHA Phase 3",
    ustad_score: 84, completed_jobs: 67, average_rating: 4.55,
    emergency_available: false, emergency_capabilities: [],
  },
  {
    name: "Danish Khan",
    email: "danish.ac@ustad.ai",
    phone: "03456667788",
    category: "ac_technician",
    skills: ["ac_service", "filter_cleaning", "gas_refilling", "ac_installation"],
    lat: 34.0080, lng: 71.5480, city: "Peshawar - Cantt",
    ustad_score: 78, completed_jobs: 29, average_rating: 4.3,
    emergency_available: false, emergency_capabilities: [],
  },

  // ── CARPENTERS (4) ──
  {
    name: "Zubair Khan",
    email: "zubair.wood@ustad.ai",
    phone: "03115551234",
    category: "carpenter",
    skills: ["door_lock_repair", "furniture_repair", "cabinet_installation", "wardrobe_hinge", "wood_polishing", "bed_repair"],
    lat: 34.0151, lng: 71.5249, city: "Peshawar - Saddar",
    ustad_score: 85, completed_jobs: 67, average_rating: 4.6,
    emergency_available: false, emergency_capabilities: [],
  },
  {
    name: "Rafiq Ahmed",
    email: "rafiq.carpenter@ustad.ai",
    phone: "03219990011",
    category: "carpenter",
    skills: ["door_alignment", "wardrobe_hinge", "furniture_repair", "cabinet_installation", "wood_polishing"],
    lat: 31.5439, lng: 74.3385, city: "Lahore - Model Town",
    ustad_score: 93, completed_jobs: 178, average_rating: 4.85,
    emergency_available: true, emergency_capabilities: ["broken_door_lock", "jammed_door"],
  },
  {
    name: "Sohail Butt",
    email: "sohail.wood@ustad.ai",
    phone: "03002223344",
    category: "carpenter",
    skills: ["drawer_channel", "bed_repair", "almari_repair", "door_handle", "table_repair"],
    lat: 24.8730, lng: 67.0590, city: "Karachi - PECHS",
    ustad_score: 81, completed_jobs: 45, average_rating: 4.5,
    emergency_available: false, emergency_capabilities: [],
  },
  {
    name: "Imtiaz Hussain",
    email: "imtiaz.wood@ustad.ai",
    phone: "03338889900",
    category: "carpenter",
    skills: ["furniture_repair", "door_lock_repair", "chair_repair", "lock_replacement"],
    lat: 33.7020, lng: 73.0530, city: "Islamabad - F-6",
    ustad_score: 77, completed_jobs: 25, average_rating: 4.2,
    emergency_available: false, emergency_capabilities: [],
  },
];

async function resetWorkers() {
  await connectDB();
  console.log("Connected to MongoDB\n");

  const deletedWorkers = await Worker.deleteMany({});
  console.log(`Deleted ${deletedWorkers.deletedCount} workers`);

  const deletedUsers = await User.deleteMany({ role: "worker" });
  console.log(`Deleted ${deletedUsers.deletedCount} worker users\n`);

  const passwordHash = hashPassword(PASSWORD);

  for (const w of WORKERS) {
    const user = await User.create({
      role: "worker",
      name: w.name,
      email: w.email,
      password_hash: passwordHash,
      phone: w.phone,
      language: "ur",
      location: { type: "Point", coordinates: [w.lng, w.lat] },
    });

    const d = 0.09;
    const serviceArea = {
      type: "Polygon" as const,
      coordinates: [
        [
          [w.lng - d, w.lat - d],
          [w.lng + d, w.lat - d],
          [w.lng + d, w.lat + d],
          [w.lng - d, w.lat + d],
          [w.lng - d, w.lat - d],
        ],
      ],
    };

    await Worker.create({
      user_id: user._id,
      name: w.name,
      category: w.category,
      skills: w.skills,
      is_online: true,
      is_available: true,
      emergency_available: w.emergency_available,
      verified: true,
      verification_level: "documents_verified",
      suspended: false,
      active_job_id: null,
      location: { type: "Point", coordinates: [w.lng, w.lat] },
      location_updated_at: new Date(),
      service_area: serviceArea,
      ustad_score: w.ustad_score,
      completed_jobs: w.completed_jobs,
      confirmed_jobs: Math.floor(w.completed_jobs * 0.95),
      response_rate: 95,
      cancellation_rate: 2,
      average_rating: w.average_rating,
      repeat_customers: Math.floor(w.completed_jobs * 0.25),
      emergency_capabilities: w.emergency_capabilities,
    });

    console.log(`✅ [${w.category.toUpperCase()}] ${w.name} — ${w.city}`);
  }

  const existingCustomer = await User.findOne({ email: "customer@ustad.ai" });
  if (!existingCustomer) {
    await User.create({
      role: "customer",
      name: "Bilal Test",
      email: "customer@ustad.ai",
      password_hash: passwordHash,
      phone: "03001112233",
      language: "en",
      location: { type: "Point", coordinates: [74.3587, 31.5204] },
    });
    console.log("\n👤 Created test customer: customer@ustad.ai / Password123");
  }

  console.log(`\n🎉 Done! 16 workers seeded (4 per category) across Pakistan.`);
  console.log("Login: any email above with password Password123\n");

  await disconnectDB();
}

resetWorkers().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
