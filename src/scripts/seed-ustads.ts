import { connectDB, disconnectDB } from "../server/lib/mongodb";
import { User, Worker } from "../server/models";
import { hashPassword } from "../server/lib/auth/password";

interface UstadSeedData {
  name: string;
  email: string;
  phone: string;
  category: "electrician" | "plumber" | "ac_technician" | "carpenter";
  skills: string[];
  ustad_score: number;
  completed_jobs: number;
  confirmed_jobs: number;
  response_rate: number;
  cancellation_rate: number;
  average_rating: number;
  verified: boolean;
  verification_level: "identity_reviewed" | "documents_verified";
  emergency_available: boolean;
  emergency_capabilities: string[];
  lat: number;
  lng: number;
}

const DEFAULT_PASSWORD = "Password123";

// Realistic technicians in Lahore / Rawalpindi / Karachi regions
const SEED_WORKERS: UstadSeedData[] = [
  // --- ELECTRICIANS ---
  {
    name: "Muhammad Imran",
    email: "imran.electrician@ustad.ai",
    phone: "03001234567",
    category: "electrician",
    skills: ["electrical_fault", "switch_repair", "breaker_issue", "short_circuit", "wiring", "fan_installation"],
    ustad_score: 94,
    completed_jobs: 142,
    confirmed_jobs: 138,
    response_rate: 98,
    cancellation_rate: 1,
    average_rating: 4.9,
    verified: true,
    verification_level: "documents_verified",
    emergency_available: true,
    emergency_capabilities: ["short_circuit", "fuse_repair", "power_outage", "sparks"],
    lat: 31.5204, // Lahore - Gulberg
    lng: 74.3587,
  },
  {
    name: "Tariq Mahmood",
    email: "tariq.electric@ustad.ai",
    phone: "03111234567",
    category: "electrician",
    skills: ["ups_wiring", "generator_wiring", "breaker_issue", "switch_repair", "light_fitting"],
    ustad_score: 87,
    completed_jobs: 68,
    confirmed_jobs: 63,
    response_rate: 92,
    cancellation_rate: 3,
    average_rating: 4.7,
    verified: true,
    verification_level: "identity_reviewed",
    emergency_available: true,
    emergency_capabilities: ["breaker_issue", "power_outage"],
    lat: 31.5304,
    lng: 74.3487,
  },
  {
    name: "Kashif Ali",
    email: "kashif.electric@ustad.ai",
    phone: "03221234567",
    category: "electrician",
    skills: ["fan_installation", "switch_repair", "light_fitting", "dimmer_fix"],
    ustad_score: 79,
    completed_jobs: 24,
    confirmed_jobs: 22,
    response_rate: 88,
    cancellation_rate: 4,
    average_rating: 4.4,
    verified: false,
    verification_level: "identity_reviewed",
    emergency_available: false,
    emergency_capabilities: [],
    lat: 31.5104,
    lng: 74.3687,
  },

  // --- PLUMBERS ---
  {
    name: "Ustad Aslam",
    email: "aslam.plumber@ustad.ai",
    phone: "03331234567",
    category: "plumber",
    skills: ["water_leak", "pipe_leakage", "tap_repair", "faucet_repair", "motor_pump", "drain_cleaning", "geyser_fitting"],
    ustad_score: 96,
    completed_jobs: 215,
    confirmed_jobs: 210,
    response_rate: 99,
    cancellation_rate: 1,
    average_rating: 4.95,
    verified: true,
    verification_level: "documents_verified",
    emergency_available: true,
    emergency_capabilities: ["burst_pipe", "water_flooding", "motor_failure"],
    lat: 31.5220,
    lng: 74.3550,
  },
  {
    name: "Naveed Akhtar",
    email: "naveed.plumbing@ustad.ai",
    phone: "03441234567",
    category: "plumber",
    skills: ["commode_repair", "muslim_shower", "tap_repair", "pipe_fitting", "tank_cleaning"],
    ustad_score: 85,
    completed_jobs: 54,
    confirmed_jobs: 50,
    response_rate: 90,
    cancellation_rate: 2,
    average_rating: 4.6,
    verified: true,
    verification_level: "identity_reviewed",
    emergency_available: false,
    emergency_capabilities: [],
    lat: 31.5180,
    lng: 74.3620,
  },
  {
    name: "Bilal Rasheed",
    email: "bilal.plumbing@ustad.ai",
    phone: "03051234567",
    category: "plumber",
    skills: ["sink_blockage", "drain_cleaning", "nalka_fix", "geyser_repair"],
    ustad_score: 81,
    completed_jobs: 31,
    confirmed_jobs: 29,
    response_rate: 85,
    cancellation_rate: 5,
    average_rating: 4.3,
    verified: true,
    verification_level: "identity_reviewed",
    emergency_available: true,
    emergency_capabilities: ["pipe_leakage"],
    lat: 31.5400,
    lng: 74.3500,
  },

  // --- AC TECHNICIANS ---
  {
    name: "Rashid Minhas (AC Expert)",
    email: "rashid.ac@ustad.ai",
    phone: "03121234567",
    category: "ac_technician",
    skills: ["ac_cooling", "gas_refilling", "ac_service", "compressor_replacement", "split_ac_installation", "leakage_fix"],
    ustad_score: 95,
    completed_jobs: 180,
    confirmed_jobs: 175,
    response_rate: 97,
    cancellation_rate: 2,
    average_rating: 4.88,
    verified: true,
    verification_level: "documents_verified",
    emergency_available: true,
    emergency_capabilities: ["gas_leak", "ac_tripping", "water_dripping"],
    lat: 31.5250,
    lng: 74.3520,
  },
  {
    name: "Zahid Qureshi",
    email: "zahid.ac@ustad.ai",
    phone: "03231234567",
    category: "ac_technician",
    skills: ["ac_service", "filter_cleaning", "gas_refilling", "inverter_pcb_repair"],
    ustad_score: 88,
    completed_jobs: 76,
    confirmed_jobs: 70,
    response_rate: 91,
    cancellation_rate: 3,
    average_rating: 4.65,
    verified: true,
    verification_level: "identity_reviewed",
    emergency_available: false,
    emergency_capabilities: [],
    lat: 31.5150,
    lng: 74.3700,
  },
  {
    name: "Hamza Farooq",
    email: "hamza.cooling@ustad.ai",
    phone: "03341234567",
    category: "ac_technician",
    skills: ["ac_service", "cooling_issue", "thermostat_fix"],
    ustad_score: 76,
    completed_jobs: 19,
    confirmed_jobs: 18,
    response_rate: 84,
    cancellation_rate: 5,
    average_rating: 4.2,
    verified: false,
    verification_level: "identity_reviewed",
    emergency_available: false,
    emergency_capabilities: [],
    lat: 31.5050,
    lng: 74.3400,
  },

  // --- CARPENTERS ---
  {
    name: "Ustad Rafiq Carpenter",
    email: "rafiq.carpenter@ustad.ai",
    phone: "03451234567",
    category: "carpenter",
    skills: ["door_lock_repair", "door_alignment", "wardrobe_hinge", "furniture_repair", "cabinet_installation", "wood_polishing"],
    ustad_score: 93,
    completed_jobs: 110,
    confirmed_jobs: 106,
    response_rate: 96,
    cancellation_rate: 1,
    average_rating: 4.85,
    verified: true,
    verification_level: "documents_verified",
    emergency_available: true,
    emergency_capabilities: ["broken_door_lock", "jammed_door"],
    lat: 31.5280,
    lng: 74.3600,
  },
  {
    name: "Sohail Butt",
    email: "sohail.wood@ustad.ai",
    phone: "03061234567",
    category: "carpenter",
    skills: ["drawer_channel", "bed_repair", "almari_repair", "door_handle"],
    ustad_score: 83,
    completed_jobs: 45,
    confirmed_jobs: 42,
    response_rate: 89,
    cancellation_rate: 3,
    average_rating: 4.5,
    verified: true,
    verification_level: "identity_reviewed",
    emergency_available: false,
    emergency_capabilities: [],
    lat: 31.5350,
    lng: 74.3450,
  },
  {
    name: "Abid Hussain",
    email: "abid.carpenter@ustad.ai",
    phone: "03171234567",
    category: "carpenter",
    skills: ["table_repair", "chair_repair", "lock_replacement"],
    ustad_score: 75,
    completed_jobs: 15,
    confirmed_jobs: 14,
    response_rate: 80,
    cancellation_rate: 6,
    average_rating: 4.1,
    verified: false,
    verification_level: "identity_reviewed",
    emergency_available: false,
    emergency_capabilities: [],
    lat: 31.5120,
    lng: 74.3580,
  },
];

async function seed() {
  await connectDB();
  console.log("🔌 Connected to MongoDB for seeding Ustads...\n");

  const passwordHash = hashPassword(DEFAULT_PASSWORD);
  let createdCount = 0;

  for (const w of SEED_WORKERS) {
    // 1. Create or update User account
    let user = await User.findOne({ email: w.email });
    if (!user) {
      user = await User.create({
        email: w.email,
        name: w.name,
        phone: w.phone,
        role: "worker",
        language: "ur",
        password_hash: passwordHash,
        location: {
          type: "Point",
          coordinates: [w.lng, w.lat],
        },
      });
    }

    // Define 10km service area polygon around ustad location
    const d = 0.09; // ~10km bounding box
    const serviceAreaPolygon = [
      [
        [w.lng - d, w.lat - d],
        [w.lng + d, w.lat - d],
        [w.lng + d, w.lat + d],
        [w.lng - d, w.lat + d],
        [w.lng - d, w.lat - d],
      ],
    ];

    // 2. Create or update Worker profile
    await Worker.findOneAndUpdate(
      { user_id: user._id },
      {
        $set: {
          user_id: user._id,
          name: w.name,
          category: w.category,
          skills: w.skills,
          is_online: true,
          is_available: true,
          emergency_available: w.emergency_available,
          verified: w.verified,
          verification_level: w.verification_level,
          suspended: false,
          active_job_id: null,
          location: {
            type: "Point",
            coordinates: [w.lng, w.lat],
          },
          location_updated_at: new Date(),
          service_area: {
            type: "Polygon",
            coordinates: serviceAreaPolygon,
          },
          ustad_score: w.ustad_score,
          completed_jobs: w.completed_jobs,
          confirmed_jobs: w.confirmed_jobs,
          response_rate: w.response_rate,
          cancellation_rate: w.cancellation_rate,
          average_rating: w.average_rating,
          emergency_capabilities: w.emergency_capabilities,
        },
      },
      { upsert: true, new: true }
    );

    createdCount++;
    console.log(`✅ [${w.category.toUpperCase()}] ${w.name} (Score: ${w.ustad_score}, Rating: ⭐${w.average_rating})`);
  }

  // Also create a test customer user for convenience
  const customerEmail = "customer@ustad.ai";
  const customer = await User.findOne({ email: customerEmail });
  if (!customer) {
    await User.create({
      email: customerEmail,
      name: "Test Customer",
      phone: "03009999999",
      role: "customer",
      language: "ur",
      password_hash: passwordHash,
      location: {
        type: "Point",
        coordinates: [74.3587, 31.5204],
      },
    });
    console.log(`\n👤 Created test customer account: ${customerEmail} (Password: ${DEFAULT_PASSWORD})`);
  }

  console.log(`\n🎉 Seeded ${createdCount} Ustads successfully into MongoDB!`);
  console.log("All accounts have default password: Password123\n");

  await disconnectDB();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
