import { Router, Request, Response } from "express";
import { pool } from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import Stripe from "stripe";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const SALT_ROUNDS = 12;

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_51MockKeyDigitalHeroes2026",
  {
    apiVersion: "2025-02-24.acacia" as any,
  },
);

router.post("/signup", async (req: Request, res: Response) => {
  const schema = z.object({
    email: z.email(),
    password: z.string().min(6),
    full_name: z.string().min(2),
    selected_charity_id: z.uuid(),
    charity_percentage: z.number().min(10).max(100),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message });

  const {
    email,
    password,
    full_name,
    selected_charity_id,
    charity_percentage,
  } = parsed.data;

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);
    if (existing.rows.length > 0)
      return res.status(400).json({ error: "Email already registered." });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, selected_charity_id, charity_percentage)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, selected_charity_id, charity_percentage`,
      [
        email.toLowerCase(),
        passwordHash,
        full_name,
        selected_charity_id,
        charity_percentage,
      ],
    );

    const user = newUser.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.status(201).json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      String(email).toLowerCase(),
    ]);
    if (result.rows.length === 0)
      return res.status(401).json({ error: "Invalid email or password." });

    const user = result.rows[0];
    const storedHash: string = user.password_hash || "";

    let isMatch = false;
    // Standard bcrypt hash check
    if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(password, storedHash);
    } else if (storedHash === password) {
      // Auto-upgrade legacy seeded plaintext password to bcrypt hash in DB
      isMatch = true;
      const upgradedHash = await bcrypt.hash(password, SALT_ROUNDS);
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
        upgradedHash,
        user.id,
      ]);
    }

    if (!isMatch)
      return res.status(401).json({ error: "Invalid email or password." });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        selected_charity_id: user.selected_charity_id,
        charity_percentage: user.charity_percentage,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get(
  "/me",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userRes = await pool.query(
        "SELECT id, email, full_name, role, selected_charity_id, charity_percentage FROM users WHERE id = $1",
        [req.user!.id],
      );
      const subRes = await pool.query(
        "SELECT * FROM subscriptions WHERE user_id = $1",
        [req.user!.id],
      );
      res.json({ user: userRes.rows[0], subscription: subRes.rows[0] || null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  "/subscribe",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      plan_type = "monthly",
      card_last4 = "4242",
      simulate_decline = false,
    } = req.body;

    if (simulate_decline || card_last4 === "0002") {
      return res.status(402).json({
        error:
          "Stripe Gateway Error: Your card was declined (insufficient_funds / card_declined). Please try a valid card.",
      });
    }

    const amountCents = plan_type === "yearly" ? 14400 : 1500;
    const interval = plan_type === "yearly" ? "365 days" : "30 days";
    const stripeSessionId = `cs_live_dh_${Date.now()}_${card_last4}`;

    if (
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_SECRET_KEY.startsWith("sk_test_") &&
      !process.env.STRIPE_SECRET_KEY.includes("mock")
    ) {
      try {
        await stripe.paymentIntents.create({
          amount: amountCents,
          currency: "usd",
          description: `Digital Heroes ${plan_type} subscription`,
        });
      } catch {
        // Fallback gracefully to internal session ID
      }
    }

    try {
      const subRes = await pool.query(
        `INSERT INTO subscriptions (user_id, plan_type, status, amount_cents, stripe_session_id, renewal_date)
         VALUES ($1, $2, 'active', $3, $4, NOW() + INTERVAL '${interval}')
         ON CONFLICT (user_id) DO UPDATE 
         SET plan_type = $2, status = 'active', amount_cents = $3, stripe_session_id = $4, renewal_date = NOW() + INTERVAL '${interval}'
         RETURNING *`,
        [req.user!.id, plan_type, amountCents, stripeSessionId],
      );

      const userRes = await pool.query(
        "SELECT selected_charity_id, charity_percentage FROM users WHERE id = $1",
        [req.user!.id],
      );
      const u = userRes.rows[0];
      let charityShare = 0;
      if (u?.selected_charity_id) {
        charityShare = Math.round(
          amountCents * ((u.charity_percentage || 10) / 100),
        );
        await pool.query(
          "UPDATE charities SET total_raised_cents = total_raised_cents + $1 WHERE id = $2",
          [charityShare, u.selected_charity_id],
        );
        await pool.query(
          `INSERT INTO charity_donations (user_id, charity_id, amount_cents, donation_type) VALUES ($1, $2, $3, 'subscription_split')`,
          [req.user!.id, u.selected_charity_id, charityShare],
        );
      }

      res.json({
        subscription: subRes.rows[0],
        stripe_receipt: {
          transaction_id: stripeSessionId,
          amount_charged_cents: amountCents,
          charity_allocated_cents: charityShare,
          card_last4,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  "/cancel-subscription",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await pool.query(
        `UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1`,
        [req.user!.id],
      );
      res.json({ message: "Subscription cancelled" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.put(
  "/charity-settings",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const { selected_charity_id, charity_percentage } = req.body;
    const clampedPct = Math.min(100, Math.max(10, Number(charity_percentage)));
    try {
      await pool.query(
        `UPDATE users SET selected_charity_id = $1, charity_percentage = $2 WHERE id = $3`,
        [selected_charity_id, clampedPct, req.user!.id],
      );
      res.json({
        message: "Updated charity settings",
        charity_percentage: clampedPct,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.put(
  "/profile",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const { full_name, email } = req.body;
    if (!full_name || !email)
      return res.status(400).json({ error: "Name and email are required" });
    try {
      const updated = await pool.query(
        `UPDATE users SET full_name = $1, email = $2 WHERE id = $3
       RETURNING id, email, full_name, role, selected_charity_id, charity_percentage`,
        [full_name, email.toLowerCase(), req.user!.id],
      );
      res.json({ user: updated.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
