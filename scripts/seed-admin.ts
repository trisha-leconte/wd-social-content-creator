import "dotenv/config";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set");

  await dbConnect();
  await User.updateOne(
    { email: email.toLowerCase().trim() },
    { email: email.toLowerCase().trim(), passwordHash: await hashPassword(password) },
    { upsert: true }
  );
  console.log(`Account ready: ${email}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
