import { connectDB, disconnectDB } from "../lib/mongodb";
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
} from "../models";

/**
 * Development reset utility. The marketplace no longer ships dummy accounts
 * or demo jobs — users sign up with email + password and technicians build
 * real history. This script only clears the collections so a local database
 * can be brought back to a clean state.
 */
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

  const counts = {
    users: await User.countDocuments(),
    workers: await Worker.countDocuments(),
    jobs: await Job.countDocuments(),
    offers: await Offer.countDocuments(),
    reviews: await Review.countDocuments(),
    job_events: await JobEvent.countDocuments(),
    messages: await Message.countDocuments(),
  };
  console.log("\nReset complete (all zero expected):");
  console.table(counts);

  await disconnectDB();
}

main().catch((error) => {
  console.error("Reset failed:", error);
  process.exit(1);
});
