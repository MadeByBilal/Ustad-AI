import {
  connectDB,
  disconnectDB,
} from "../lib/mongodb";
import {
  Job,
  JobEvent,
  Message,
  Offer,
  Review,
  Session,
  Upload,
  User,
  Worker,
  type WorkerCategory,
} from "../models";

interface City {
  name: string;
  center: [number, number];
  areas: string[];
}

const CITIES: City[] = [
  {
    name: "Karachi",
    center: [67.0011, 24.8607],
    areas: ["Gulshan-e-Iqbal", "Clifton", "North Nazimabad", "DHA", "Malir", "Korangi"],
  },
  {
    name: "Lahore",
    center: [74.3436, 31.5497],
    areas: ["Gulberg", "Model Town", "Johar Town", "DHA", "Township", "Cantt"],
  },
  {
    name: "Islamabad",
    center: [73.0479, 33.6844],
    areas: ["F-10", "G-9", "I-8", "E-11", "Bahria Town", "DHA Phase 2"],
  },
];

interface WorkerSeed {
  name: string;
  category: WorkerCategory;
  city: string;
  area: string;
  skills: string[];
  emergency?: boolean;
  online?: boolean;
  available?: boolean;
}

const WORKERS: WorkerSeed[] = [
  // Plumbers
  { name: "Muhammad Imran", category: "plumber", city: "Karachi", area: "Gulshan-e-Iqbal", skills: ["pipe fitting", "faucet repair", "leak detection", "geyser installation"], online: true },
  { name: "Shakeel Ahmed", category: "plumber", city: "Karachi", area: "Clifton", skills: ["bathroom plumbing", "drain cleaning", "water tank installation"], available: false },
  { name: "Faisal Khan", category: "plumber", city: "Lahore", area: "Gulberg", skills: ["faucet repair", "pipe fitting", "drain cleaning"], online: true },
  { name: "Nadeem Akhtar", category: "plumber", city: "Lahore", area: "Model Town", skills: ["water tank installation", "leak detection", "geyser installation"] },
  { name: "Rashid Mehmood", category: "plumber", city: "Islamabad", area: "F-10", skills: ["pipe fitting", "bathroom plumbing", "faucet repair"], online: true },
  { name: "Umar Farooq", category: "plumber", city: "Islamabad", area: "G-9", skills: ["drain cleaning", "leak detection", "water tank installation"] },
  // Electricians
  { name: "Bilal Hussain", category: "electrician", city: "Karachi", area: "North Nazimabad", skills: ["wiring", "fault finding", "switchboard installation"], online: true },
  { name: "Asif Raza", category: "electrician", city: "Karachi", area: "DHA", skills: ["inverter installation", "appliance repair", "lighting"], emergency: true, online: true },
  { name: "Kamran Ali", category: "electrician", city: "Lahore", area: "Johar Town", skills: ["wiring", "fuse repair", "lighting"], online: true },
  { name: "Tariq Javed", category: "electrician", city: "Lahore", area: "DHA", skills: ["fault finding", "switchboard installation", "inverter installation"], emergency: true },
  { name: "Zafar Iqbal", category: "electrician", city: "Islamabad", area: "I-8", skills: ["appliance repair", "wiring", "fuse repair"] },
  { name: "Salman Butt", category: "electrician", city: "Islamabad", area: "E-11", skills: ["lighting", "switchboard installation", "fault finding"], emergency: true, online: true },
  // AC technicians
  { name: "Waseem Akram", category: "ac_technician", city: "Karachi", area: "Malir", skills: ["ac repair", "compressor service", "gas refilling"], online: true },
  { name: "Rizwan Malik", category: "ac_technician", city: "Karachi", area: "Korangi", skills: ["ac installation", "deep cleaning", "split ac"] },
  { name: "Adil Shah", category: "ac_technician", city: "Lahore", area: "Township", skills: ["ac repair", "gas refilling", "window ac"], online: true },
  { name: "Hamza Sheikh", category: "ac_technician", city: "Lahore", area: "Cantt", skills: ["ac installation", "deep cleaning", "split ac"], available: false },
  { name: "Imtiaz Ahmed", category: "ac_technician", city: "Islamabad", area: "Bahria Town", skills: ["ac repair", "compressor service", "split ac"] },
  { name: "Danish Khalid", category: "ac_technician", city: "Islamabad", area: "DHA Phase 2", skills: ["window ac", "deep cleaning", "ac installation"], online: true },
  // Carpenters
  { name: "Sohail Ahmed", category: "carpenter", city: "Karachi", area: "Gulshan-e-Iqbal", skills: ["furniture making", "door repair", "wood polishing"], online: true },
  { name: "Usman Mirza", category: "carpenter", city: "Karachi", area: "Clifton", skills: ["kitchen cabinets", "wardrobe installation", "custom furniture"] },
  { name: "Javed Anwar", category: "carpenter", city: "Lahore", area: "Gulberg", skills: ["door repair", "cabinet repair", "furniture making"] },
  { name: "Arif Lodhi", category: "carpenter", city: "Lahore", area: "Model Town", skills: ["custom furniture", "kitchen cabinets", "wood polishing"], online: true },
  { name: "Naeem Qureshi", category: "carpenter", city: "Islamabad", area: "F-10", skills: ["wardrobe installation", "door repair", "cabinet repair"] },
  { name: "Tahir Mahmood", category: "carpenter", city: "Islamabad", area: "G-9", skills: ["furniture making", "custom furniture", "wood polishing"], online: true },
];

const CUSTOMERS = [
  { name: "Ahmed Raza", phone: "03001234567", city: "Karachi", area: "Gulshan-e-Iqbal" },
  { name: "Sana Malik", phone: "03019876543", city: "Lahore", area: "Johar Town" },
  { name: "Hassan Qureshi", phone: "03339876540", city: "Islamabad", area: "F-10" },
];

const EMERGENCY_CAPABILITIES = [
  "power outage",
  "short circuit",
  "fuse blowout",
  "wiring fire risk",
];

const REVIEW_TAGS = [
  "on time",
  "clean work",
  "fair price",
  "polite behavior",
  "finished quickly",
];

function jitter(base: [number, number], spread = 0.03): [number, number] {
  const lng = base[0] + (Math.random() - 0.5) * 2 * spread;
  const lat = base[1] + (Math.random() - 0.5) * 2 * spread;
  return [Number(lng.toFixed(5)), Number(lat.toFixed(5))];
}

function serviceAreaPolygon(center: [number, number], halfSpan = 0.06) {
  const [lng, lat] = center;
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - halfSpan, lat - halfSpan],
        [lng + halfSpan, lat - halfSpan],
        [lng + halfSpan, lat + halfSpan],
        [lng - halfSpan, lat + halfSpan],
        [lng - halfSpan, lat - halfSpan],
      ],
    ],
  };
}

function weighted(choices: number[], weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < choices.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return choices[i];
  }
  return choices[choices.length - 1];
}

async function main() {
  await connectDB();
  console.log("Connected to MongoDB, clearing existing demo data...");

  try {
    await User.collection.dropIndex("location_2dsphere");
    console.log("Dropped legacy User.location 2dsphere index.");
  } catch {
    // Index already absent - nothing to do.
  }

  await Promise.all([
    Session.deleteMany({}),
    Message.deleteMany({}),
    JobEvent.deleteMany({}),
    Review.deleteMany({}),
    Offer.deleteMany({}),
    Job.deleteMany({}),
    Upload.deleteMany({}),
    Worker.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log("Cleared collections.");

  const cityByName = Object.fromEntries(CITIES.map((c) => [c.name, c]));
  const citiesUsed = new Map<string, City>();
  for (const c of CITIES) citiesUsed.set(c.name, c);

  // --- Customers ---
  const customerUsers = await User.insertMany(
    CUSTOMERS.map((c) => ({
      role: "customer",
      name: c.name,
      phone: c.phone,
      language: "ur",
      location: { type: "Point", coordinates: jitter(cityByName[c.city].center) },
    }))
  );
  console.log(`Created ${customerUsers.length} customers.`);

  // --- Worker user accounts + workers ---
  const workerUsers = await User.insertMany(
    WORKERS.map((w, i) => ({
      role: "worker",
      name: w.name,
      phone: `0301${String(i + 1).padStart(7, "0")}`,
      language: "ur",
    }))
  );
  console.log(`Created ${workerUsers.length} worker accounts.`);

  const seededWorkers = [];
  for (let i = 0; i < WORKERS.length; i++) {
    const w = WORKERS[i];
    const city = cityByName[w.city];
    const coordinates = jitter(city.center, 0.025);

    const rating = weighted([3.5, 4.0, 4.5, 5.0], [0.15, 0.3, 0.35, 0.2]);
    const completed = weighted([6, 15, 30, 55, 85, 100], [0.2, 0.25, 0.2, 0.15, 0.12, 0.08]);

    seededWorkers.push(
      await Worker.create({
        user_id: workerUsers[i]._id,
        name: w.name,
        category: w.category,
        skills: w.skills,
        is_online: w.online ?? false,
        is_available: w.available ?? true,
        emergency_available: w.emergency ?? false,
        verified: true,
        verification_level:
          Math.random() > 0.4 ? "documents_verified" : "identity_reviewed",
        suspended: false,
        location: { type: "Point", coordinates },
        location_updated_at: new Date(Date.now() - Math.floor(Math.random() * 3600000)),
        service_area: serviceAreaPolygon(city.center),
        active_job_id: null,
        ustad_score: Math.floor(70 + Math.random() * 29),
        completed_jobs: completed,
        confirmed_jobs: Math.floor(completed * 0.9),
        response_rate: Math.floor(80 + Math.random() * 21),
        cancellation_rate: Number((Math.random() * 10).toFixed(1)),
        average_rating: rating,
        repeat_customers: Math.floor(completed * (0.2 + Math.random() * 0.3)),
        emergency_capabilities: w.emergency ? EMERGENCY_CAPABILITIES.slice(0, 2 + Math.floor(Math.random() * 2)) : [],
      })
    );
  }
  console.log(`Created ${seededWorkers.length} workers.`);

  // --- Demo jobs ---
  const [ahmed, sana] = customerUsers;
  const imran = seededWorkers.find((w) => w.name === "Muhammad Imran")!;
  const asif = seededWorkers.find((w) => w.name === "Asif Raza")!;
  const kamran = seededWorkers.find((w) => w.name === "Kamran Ali")!;

  const karachiArea = cityByName.Karachi;
  const lahoreArea = cityByName.Lahore;

  // Job A: COMPLETED plumbing job (Ahmed Raza, Imran)
  const jobA = await Job.create({
    customer_id: ahmed._id,
    status: "COMPLETED",
    input: {
      type: "text",
      original_text: "Bathroom ka tap leak ho raha hai, thk karwana hai",
      transcript: "Bathroom ka tap leak ho raha hai, thk karwana hai",
      photo_ids: [],
    },
    understanding: {
      category: "plumber",
      subcategory: "faucet_repair",
      description: "Bathroom faucet leaking, needs repair",
      required_skills: ["faucet repair", "pipe fitting"],
      urgency: "normal",
      safety_flags: [],
      confidence: 0.92,
      clarification_required: false,
    },
    location: {
      type: "Point",
      coordinates: jitter(karachiArea.center, 0.02),
      address_label: "D-42, Block 13, Gulshan-e-Iqbal, Karachi",
    },
    pricing: {
      estimate_min: 800,
      estimate_max: 1500,
      customer_offer: 1200,
      worker_counter_offer: 1200,
      final_price: 1200,
      currency: "PKR",
      status: "agreed",
    },
    matching: {
      search_radius_km: 5,
      broadcast_round: 1,
      acceptance_deadline: new Date(Date.now() - 6 * 86400000),
      selection_deadline: new Date(Date.now() - 6 * 86400000 + 3600000),
      selected_worker_id: imran._id,
    },
    completion: {
      before_photo_id: null,
      after_photo_id: null,
      ai_work_confirmation: "Leak fixed, tap replaced, water flow normal",
      customer_confirmed: true,
    },
  });

  await Offer.create({
    job_id: jobA._id,
    worker_id: imran._id,
    type: "accept",
    offered_price: 1200,
    counter_price: null,
    message: "Bhai main 30 minute mein pahunch sakta hoon",
    status: "selected",
    expires_at: new Date(Date.now() - 5 * 86400000),
  });

  await Review.create({
    job_id: jobA._id,
    customer_id: ahmed._id,
    worker_id: imran._id,
    rating: 4.5,
    tags: REVIEW_TAGS.slice(0, 3),
    text: "Kaam bohat acha kiya, time par aaye aur saaf suthra kaam",
  });

  // Job B: BROADCASTING electrician job (Sana Malik)
  const jobB = await Job.create({
    customer_id: sana._id,
    status: "BROADCASTING",
    input: {
      type: "text",
      original_text: "Ghar ki wiring mein problem hai, baar baar fuse ud jata hai",
      transcript: "Ghar ki wiring mein problem hai, baar baar fuse ud jata hai",
      photo_ids: [],
    },
    understanding: {
      category: "electrician",
      subcategory: "wiring_fault",
      description: "Recurring fuse blowouts, wiring fault suspected",
      required_skills: ["wiring", "fault finding"],
      urgency: "potentially_urgent",
      safety_flags: ["fuse blowout"],
      confidence: 0.87,
      clarification_required: false,
    },
    location: {
      type: "Point",
      coordinates: jitter(lahoreArea.center, 0.02),
      address_label: "House 12, Street 8, Johar Town, Lahore",
    },
    pricing: {
      estimate_min: 2000,
      estimate_max: 4000,
      customer_offer: 3000,
      worker_counter_offer: null,
      final_price: null,
      currency: "PKR",
      status: "pending",
    },
    matching: {
      search_radius_km: 5,
      broadcast_round: 1,
      acceptance_deadline: new Date(Date.now() + 2 * 3600000),
      selection_deadline: new Date(Date.now() + 4 * 3600000),
      selected_worker_id: null,
    },
    completion: {
      before_photo_id: null,
      after_photo_id: null,
      ai_work_confirmation: null,
      customer_confirmed: false,
    },
  });

  await Offer.create([
    {
      job_id: jobB._id,
      worker_id: kamran._id,
      type: "accept",
      offered_price: 3000,
      counter_price: null,
      message: "Main wiring check kar ke bataunga, phir bhi estimate 3000 se zyada nahi",
      status: "pending",
      expires_at: new Date(Date.now() + 2 * 3600000),
    },
    {
      job_id: jobB._id,
      worker_id: seededWorkers.find((w) => w.name === "Tariq Javed")!._id,
      type: "counter_offer",
      offered_price: 3000,
      counter_price: 3500,
      message: "Fault finding ke baad full wiring check karta hoon, 3500 mein",
      status: "pending",
      expires_at: new Date(Date.now() + 2 * 3600000),
    },
  ]);

  // Job C: IN_PROGRESS emergency electrician job (Ahmed Raza, Asif Raza)
  const jobC = await Job.create({
    customer_id: ahmed._id,
    status: "IN_PROGRESS",
    input: {
      type: "text",
      original_text: "Short circuit ho gaya, bijli ja rahi hai poori ghar mein",
      transcript: "Short circuit ho gaya, bijli ja rahi hai poori ghar mein",
      photo_ids: [],
    },
    understanding: {
      category: "electrician",
      subcategory: "short_circuit",
      description: "Short circuit, full house power outage",
      required_skills: ["fault finding", "wiring"],
      urgency: "emergency",
      safety_flags: ["power outage", "short circuit"],
      confidence: 0.95,
      clarification_required: false,
    },
    location: {
      type: "Point",
      coordinates: jitter(karachiArea.center, 0.02),
      address_label: "Plot 7-C, Khayaban-e-Bukhari, DHA Phase 6, Karachi",
    },
    pricing: {
      estimate_min: 1500,
      estimate_max: 3000,
      customer_offer: 2500,
      worker_counter_offer: 2500,
      final_price: 2500,
      currency: "PKR",
      status: "agreed",
    },
    matching: {
      search_radius_km: 8,
      broadcast_round: 1,
      acceptance_deadline: new Date(Date.now() - 2 * 3600000),
      selection_deadline: new Date(Date.now() - 90 * 60000),
      selected_worker_id: asif._id,
    },
    completion: {
      before_photo_id: null,
      after_photo_id: null,
      ai_work_confirmation: null,
      customer_confirmed: false,
    },
  });

  await Worker.updateOne({ _id: asif._id }, { active_job_id: jobC._id });

  await Offer.create({
    job_id: jobC._id,
    worker_id: asif._id,
    type: "accept",
    offered_price: 2500,
    counter_price: null,
    message: "Emergency, main 20 minute mein pohanch raha hoon",
    status: "accepted",
    expires_at: new Date(Date.now() - 2 * 3600000),
  });

  // --- Job events + messages for the demo jobs ---
  const jobAEvents = [
    { from_state: "DRAFT", to_state: "ANALYZING", actor_type: "system", actor_id: "ai", metadata: { confidence: 0.92 } },
    { from_state: "ANALYZING", to_state: "BROADCASTING", actor_type: "system", actor_id: "matcher", metadata: { radius_km: 5 } },
    { from_state: "BROADCASTING", to_state: "ACCEPTED", actor_type: "worker", actor_id: String(imran._id), metadata: { offer_price: 1200 } },
    { from_state: "ACCEPTED", to_state: "EN_ROUTE", actor_type: "worker", actor_id: String(imran._id), metadata: {} },
    { from_state: "EN_ROUTE", to_state: "ARRIVED", actor_type: "worker", actor_id: String(imran._id), metadata: {} },
    { from_state: "ARRIVED", to_state: "IN_PROGRESS", actor_type: "worker", actor_id: String(imran._id), metadata: { started_at: new Date().toISOString() } },
    { from_state: "IN_PROGRESS", to_state: "AWAITING_CUSTOMER_CONFIRMATION", actor_type: "worker", actor_id: String(imran._id), metadata: {} },
    { from_state: "AWAITING_CUSTOMER_CONFIRMATION", to_state: "COMPLETED", actor_type: "customer", actor_id: String(ahmed._id), metadata: { rating: 4.5 } },
  ];
  const jobCEvents = [
    { from_state: "DRAFT", to_state: "ANALYZING", actor_type: "system", actor_id: "ai", metadata: { confidence: 0.95, urgency: "emergency" } },
    { from_state: "ANALYZING", to_state: "BROADCASTING", actor_type: "system", actor_id: "matcher", metadata: { radius_km: 8, emergency_round: true } },
    { from_state: "BROADCASTING", to_state: "ACCEPTED", actor_type: "worker", actor_id: String(asif._id), metadata: { offer_price: 2500 } },
    { from_state: "ACCEPTED", to_state: "EN_ROUTE", actor_type: "worker", actor_id: String(asif._id), metadata: {} },
    { from_state: "EN_ROUTE", to_state: "ARRIVED", actor_type: "worker", actor_id: String(asif._id), metadata: {} },
    { from_state: "ARRIVED", to_state: "IN_PROGRESS", actor_type: "worker", actor_id: String(asif._id), metadata: { started_at: new Date().toISOString() } },
  ];

  // Fix job_id assignment correctly per group
  for (const e of jobAEvents) {
    await JobEvent.create({ job_id: jobA._id, ...e });
  }
  for (const e of jobCEvents) {
    await JobEvent.create({ job_id: jobC._id, ...e });
  }

  await Message.create([
    {
      job_id: jobA._id,
      sender_id: ahmed._id,
      sender_type: "customer",
      content: "Salam Ustad sahab, kitne baje aayenge?",
    },
    {
      job_id: jobA._id,
      sender_id: imran._id,
      sender_type: "worker",
      content: "Waalikum salam bhai, main 30 minute mein pahunch jata hoon",
    },
    {
      job_id: jobA._id,
      sender_id: ahmed._id,
      sender_type: "customer",
      content: "Shukriya, kaam theek ho gaya",
    },
    {
      job_id: jobC._id,
      sender_id: ahmed._id,
      sender_type: "customer",
      content: "Ustad jaldi aayen, poori family andheri mein hai",
    },
    {
      job_id: jobC._id,
      sender_id: asif._id,
      sender_type: "worker",
      content: "Ji bhai, 20 minute mein pohanch raha hoon",
    },
  ]);

  // Job D: BROADCASTING plumbing job (Ahmed Raza) — shows on the worker
  // dashboard feed with a photo thumbnail and a live acceptance countdown
  const demoPhoto = await Upload.create({
    owner_id: ahmed._id,
    mime: "image/png",
    size: 68,
    data: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    ),
  });

  const jobD = await Job.create({
    customer_id: ahmed._id,
    status: "BROADCASTING",
    input: {
      type: "text",
      original_text: "Kitchen sink ka paani drain nahi ho raha, ruk gaya hai",
      transcript: "Kitchen sink ka paani drain nahi ho raha, ruk gaya hai",
      photo_ids: [String(demoPhoto._id)],
    },
    understanding: {
      category: "plumber",
      subcategory: "drain_cleaning",
      description: "Kitchen sink drain blocked, water not draining",
      required_skills: ["drain cleaning", "pipe fitting"],
      urgency: "normal",
      safety_flags: [],
      confidence: 0.9,
      clarification_required: false,
    },
    location: {
      type: "Point",
      coordinates: jitter(karachiArea.center, 0.02),
      address_label: "House 21, Block 6, Gulshan-e-Iqbal, Karachi",
    },
    pricing: {
      estimate_min: 1000,
      estimate_max: 2500,
      customer_offer: 1500,
      worker_counter_offer: null,
      final_price: null,
      currency: "PKR",
      status: "pending",
    },
    matching: {
      search_radius_km: 5,
      broadcast_round: 1,
      acceptance_deadline: new Date(Date.now() + 8 * 60000),
      selection_deadline: new Date(Date.now() + 16 * 60000),
      selected_worker_id: null,
    },
    completion: {
      before_photo_id: null,
      after_photo_id: null,
      ai_work_confirmation: null,
      customer_confirmed: false,
    },
  });

  await JobEvent.create({
    job_id: jobD._id,
    from_state: "DRAFT",
    to_state: "BROADCASTING",
    actor_type: "system",
    actor_id: "matcher",
    metadata: { radius_km: 5 },
  });

  console.log("Created 4 demo jobs, 3 offers, 1 review, 15 job events, 5 messages, 1 photo.");

  const counts = {
    users: await User.countDocuments(),
    workers: await Worker.countDocuments(),
    jobs: await Job.countDocuments(),
    offers: await Offer.countDocuments(),
    reviews: await Review.countDocuments(),
    job_events: await JobEvent.countDocuments(),
    messages: await Message.countDocuments(),
  };
  console.log("\nSeed complete:");
  console.table(counts);

  await disconnectDB();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});