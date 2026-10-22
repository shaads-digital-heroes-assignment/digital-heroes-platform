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

    // Create an Admin Account
    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, selected_charity_id, charity_percentage)
       VALUES ('admin@digitalheroes.co.in', 'admin123', 'Head Administrator', 'admin', $1, 10)
       ON CONFLICT (email) DO NOTHING`,
      [charityId],
    );

    // Create a Test Subscriber Account
    const subUser = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, selected_charity_id, charity_percentage)
       VALUES ('subscriber@digitalheroes.co.in', 'sub123', 'Alex Golfer', 'subscriber', $1, 15)
       ON CONFLICT (email) DO NOTHING RETURNING id`,
      [charityId],
    );

    if (subUser.rows.length > 0) {
      const userId = subUser.rows[0].id;

      // Give test subscriber an active subscription
      await pool.query(
        `INSERT INTO subscriptions (user_id, plan_type, status, amount_cents, renewal_date)
         VALUES ($1, 'monthly', 'active', 1500, NOW() + INTERVAL '30 days')
         ON CONFLICT (user_id) DO UPDATE SET status = 'active'`,
        [userId],
      );

      // Give test subscriber 5 valid scores (1-45 Stableford range)
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

    console.log("Test Admin and Test Subscriber successfully seeded!");
    process.exit(0);
  } catch (err: any) {
    console.error("Seeding error:", err.message);
    process.exit(1);
  }
}

seed();
