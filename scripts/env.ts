// Scripts run outside Next.js, which loads .env.local automatically.
// Load it here so `npm run seed` and friends see the same values the app does.
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });
