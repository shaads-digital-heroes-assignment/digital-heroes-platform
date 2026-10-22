import bcrypt from "bcryptjs";
import { pool } from "../src/config/db.js";

async function seed(): Promise<void> {
  try {
    const charityRes = await pool.query("SELECT id FROM charities LIMIT 1");
    if (charityRes.rows.length === 0) {
      console.error(
        "No charities found. Please ensure the Supabase SQL schema migration has been executed first.",
      );
      process.exit(1);
    }
    const charityId = charityRes.rows[0].id;

    const adminHash = await bcrypt.hash("admin123", 12);
    const subHash = await bcrypt.hash("sub123", 12);

    // Create or upgrade Admin Account with bcrypt hash
    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, selected_charity_id, charity_percentage)
       VALUES ('admin@digitalheroes.co.in', $1, 'Head Administrator', 'admin', $2, 10)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [adminHash, charityId],
    );

    // Create or upgrade Test Subscriber Account with bcrypt hash
    const subUser = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, selected_charity_id, charity_percentage)
       VALUES ('subscriber@digitalheroes.co.in', $1, 'Alex Golfer', 'subscriber', $2, 15)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [subHash, charityId],
    );

    if (subUser.rows.length > 0) {
      const userId = subUser.rows[0].id;

      await pool.query(
        `INSERT INTO subscriptions (user_id, plan_type, status, amount_cents, renewal_date)
         VALUES ($1, 'monthly', 'active', 1500, NOW() + INTERVAL '30 days')
         ON CONFLICT (user_id) DO UPDATE SET status = 'active'`,
        [userId],
      );

      const scores: number[] = [32, 38, 41, 29, 35];
      for (let i = 0; i < scores.length; i++) {
        await pool.query(
          `INSERT INTO golf_scores (user_id, score, played_date)
           VALUES ($1, $2, CURRENT_DATE - INTERVAL '${i} days')
           ON CONFLICT (user_id, played_date) DO NOTHING`,
          [userId, scores[i]],
        );
      }
    }

    console.log(
      "Test Admin and Test Subscriber successfully seeded with bcrypt hashes!",
    );
    process.exit(0);
  } catch (err: any) {
    console.error("Seeding error:", err.message);
    process.exit(1);
  }
}

seed();
