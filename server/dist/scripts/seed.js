import { hashPassword } from "../lib/auth/password.js";
import { connectDB, disconnectDB } from "../lib/mongodb.js";
import { Job, JobEvent, Message, Offer, Review, Session, Upload, User, Worker, } from "../models/index.js";
/** Default password for all demo technician accounts. */
const DEMO_PASSWORD = "password123";
const CITIES = [
    { name: "Karachi", center: [67.0011, 24.8607] },
    { name: "Lahore", center: [74.3436, 31.5497] },
    { name: "Islamabad", center: [73.0479, 33.6844] },
];
const WORKERS = [
    // Plumbers
    { slug: "imran", name: "Muhammad Imran", category: "plumber", city: "Karachi", skills: ["pipe fitting", "faucet repair", "leak detection", "geyser installation"], online: true },
    { slug: "shakeel", name: "Shakeel Ahmed", category: "plumber", city: "Karachi", skills: ["bathroom plumbing", "drain cleaning", "water tank installation"], available: false },
    { slug: "faisal", name: "Faisal Khan", category: "plumber", city: "Lahore", skills: ["faucet repair", "pipe fitting", "drain cleaning"], online: true },
    { slug: "nadeem", name: "Nadeem Akhtar", category: "plumber", city: "Lahore", skills: ["water tank installation", "leak detection", "geyser installation"] },
    { slug: "rashid", name: "Rashid Mehmood", category: "plumber", city: "Islamabad", skills: ["pipe fitting", "bathroom plumbing", "faucet repair"], online: true },
    { slug: "umar", name: "Umar Farooq", category: "plumber", city: "Islamabad", skills: ["drain cleaning", "leak detection", "water tank installation"] },
    // Electricians
    { slug: "bilal", name: "Bilal Hussain", category: "electrician", city: "Karachi", skills: ["wiring", "fault finding", "switchboard installation"], online: true },
    { slug: "asif", name: "Asif Raza", category: "electrician", city: "Karachi", skills: ["inverter installation", "appliance repair", "lighting"], emergency: true, online: true },
    { slug: "kamran", name: "Kamran Ali", category: "electrician", city: "Lahore", skills: ["wiring", "fuse repair", "lighting"], online: true },
    { slug: "tariq", name: "Tariq Javed", category: "electrician", city: "Lahore", skills: ["fault finding", "switchboard installation", "inverter installation"], emergency: true },
    { slug: "zafar", name: "Zafar Iqbal", category: "electrician", city: "Islamabad", skills: ["appliance repair", "wiring", "fuse repair"] },
    { slug: "salman", name: "Salman Butt", category: "electrician", city: "Islamabad", skills: ["lighting", "switchboard installation", "fault finding"], emergency: true, online: true },
    // AC technicians
    { slug: "waseem", name: "Waseem Akram", category: "ac_technician", city: "Karachi", skills: ["ac repair", "compressor service", "gas refilling"], online: true },
    { slug: "rizwan", name: "Rizwan Malik", category: "ac_technician", city: "Karachi", skills: ["ac installation", "deep cleaning", "split ac"] },
    { slug: "adil", name: "Adil Shah", category: "ac_technician", city: "Lahore", skills: ["ac repair", "gas refilling", "window ac"], online: true },
    { slug: "hamza", name: "Hamza Sheikh", category: "ac_technician", city: "Lahore", skills: ["ac installation", "deep cleaning", "split ac"], available: false },
    { slug: "imtiaz", name: "Imtiaz Ahmed", category: "ac_technician", city: "Islamabad", skills: ["ac repair", "compressor service", "split ac"] },
    { slug: "danish", name: "Danish Khalid", category: "ac_technician", city: "Islamabad", skills: ["window ac", "deep cleaning", "ac installation"], online: true },
    // Carpenters
    { slug: "sohail", name: "Sohail Ahmed", category: "carpenter", city: "Karachi", skills: ["furniture making", "door repair", "wood polishing"], online: true },
    { slug: "usman", name: "Usman Mirza", category: "carpenter", city: "Karachi", skills: ["kitchen cabinets", "wardrobe installation", "custom furniture"] },
    { slug: "javed", name: "Javed Anwar", category: "carpenter", city: "Lahore", skills: ["door repair", "cabinet repair", "furniture making"] },
    { slug: "arif", name: "Arif Lodhi", category: "carpenter", city: "Lahore", skills: ["custom furniture", "kitchen cabinets", "wood polishing"], online: true },
    { slug: "naeem", name: "Naeem Qureshi", category: "carpenter", city: "Islamabad", skills: ["wardrobe installation", "door repair", "cabinet repair"] },
    { slug: "tahir", name: "Tahir Mahmood", category: "carpenter", city: "Islamabad", skills: ["furniture making", "custom furniture", "wood polishing"], online: true },
];
const EMERGENCY_CAPABILITIES = [
    "power outage",
    "short circuit",
    "fuse blowout",
    "wiring fire risk",
];
function jitter(base, spread = 0.03) {
    const lng = base[0] + (Math.random() - 0.5) * 2 * spread;
    const lat = base[1] + (Math.random() - 0.5) * 2 * spread;
    return [Number(lng.toFixed(5)), Number(lat.toFixed(5))];
}
function serviceAreaPolygon(center, halfSpan = 0.06) {
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
function weighted(choices, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < choices.length; i++) {
        roll -= weights[i];
        if (roll <= 0)
            return choices[i];
    }
    return choices[choices.length - 1];
}
async function seedWorkers() {
    const cityByName = Object.fromEntries(CITIES.map((c) => [c.name, c]));
    const passwordHash = hashPassword(DEMO_PASSWORD);
    const workerUsers = await User.insertMany(WORKERS.map((w, i) => ({
        role: "worker",
        name: w.name,
        email: `${w.slug}@demo.ustad`,
        password_hash: passwordHash,
        phone: `0301${String(i + 1).padStart(7, "0")}`,
        language: "ur",
    })));
    let created = 0;
    for (let i = 0; i < WORKERS.length; i++) {
        const w = WORKERS[i];
        const city = cityByName[w.city];
        const coordinates = jitter(city.center, 0.025);
        const rating = weighted([3.5, 4.0, 4.5, 5.0], [0.15, 0.3, 0.35, 0.2]);
        const completed = weighted([6, 15, 30, 55, 85, 100], [0.2, 0.25, 0.2, 0.15, 0.12, 0.08]);
        await Worker.create({
            user_id: workerUsers[i]._id,
            name: w.name,
            category: w.category,
            skills: w.skills,
            is_online: w.online ?? false,
            is_available: w.available ?? true,
            emergency_available: w.emergency ?? false,
            verified: true,
            verification_level: Math.random() > 0.4 ? "documents_verified" : "identity_reviewed",
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
            emergency_capabilities: w.emergency
                ? EMERGENCY_CAPABILITIES.slice(0, 2 + Math.floor(Math.random() * 2))
                : [],
        });
        created++;
    }
    return created;
}
async function main() {
    await connectDB();
    console.log("Connected to MongoDB, clearing all collections...");
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
    const workerCount = await seedWorkers();
    console.log(`Created ${workerCount} sample ustads.`);
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
    console.log(`\nDemo technician login: any *@demo.ustad email with password "${DEMO_PASSWORD}"`);
    console.log("Example: imran@demo.ustad / password123\n");
    await disconnectDB();
}
main().catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map