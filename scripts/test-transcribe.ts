import fs from "fs";
import path from "path";
import { transcribeAudio } from "../src/server/lib/job/ai";

async function main() {
  const audioFilePath = process.argv[2];

  if (!audioFilePath) {
    console.log("\n❌ Usage: npx tsx scripts/test-transcribe.ts <path-to-audio-file>");
    console.log("Example: npx tsx scripts/test-transcribe.ts sample.wav\n");
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), audioFilePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`\n❌ File not found: ${resolvedPath}\n`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(resolvedPath);
  const ext = path.extname(resolvedPath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".mp3": "audio/mp3",
    ".ogg": "audio/ogg",
    ".m4a": "audio/m4a",
  };
  const mime = mimeMap[ext] || "audio/octet-stream";

  console.log(`\n🎙️  Testing AssemblyAI with file: ${resolvedPath} (${buffer.length} bytes, ${mime})...`);
  console.log("⏳ Uploading and transcribing (this takes ~5-15 seconds)...");

  try {
    const text = await transcribeAudio(buffer, mime);
    console.log("\n✅ Transcription Successful!");
    console.log("-----------------------------------------");
    console.log(`Transcribed Text: "${text}"`);
    console.log("-----------------------------------------\n");
  } catch (err: any) {
    console.error("\n❌ Transcription Failed!");
    console.error(err.message || err);
    console.log();
    process.exit(1);
  }
}

main();
