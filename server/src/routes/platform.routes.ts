import { Router, Response } from "express";
import { pool } from "../config/db.js";
import {
  authenticateToken,
  requireAdmin,
  AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

// ==========================================
// SUBSCRIBER DASHBOARD & SUBSCRIPTION ROUTES
// ==========================================
router.get(
  "/dashboard",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userRes = await pool.query(
        `SELECT u.id, u.email, u.full_name, u.role, u.selected_charity_id, u.charity_percentage, u.created_at,
              c.name as charity_name, c.category as charity_category, c.banner_url as charity_banner
       FROM users u
       LEFT JOIN charities c ON u.selected_charity_id = c.id
       WHERE u.id = $1`,
        [req.user!.id],
      );
      const subRes = await pool.query(
        `SELECT * FROM subscriptions WHERE user_id = $1`,
        [req.user!.id],
      );
      const scoresRes = await pool.query(
        `SELECT * FROM golf_scores WHERE user_id = $1 ORDER BY played_date DESC, created_at DESC LIMIT 5`,
        [req.user!.id],
      );
      const winningsRes = await pool.query(
        `SELECT dw.*, d.draw_title, d.winning_numbers, d.published_at
       FROM draw_winners dw
       JOIN draws d ON dw.draw_id = d.id
       WHERE dw.user_id = $1
       ORDER BY dw.created_at DESC`,
        [req.user!.id],
      );
      const drawsCountRes = await pool.query(
        `SELECT COUNT(*) as total FROM draws WHERE status = 'published'`,
      );

      res.json({
        user: userRes.rows[0],
        subscription: subRes.rows[0] || null,
        scores: scoresRes.rows,
        winnings: winningsRes.rows,
        publishedDrawsCount: parseInt(drawsCountRes.rows[0].total) || 0,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ==============================================================================================
// Activate or switch Monthly ($15) / Yearly ($144 discounted) Subscription (PRD Section 04 & 08)
// ==============================================================================================
router.post(
  "/subscribe",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const { plan_type } = req.body; // 'monthly' | 'yearly'
    if (!["monthly", "yearly"].includes(plan_type)) {
      return res.status(400).json({ error: "Invalid plan type." });
    }

    const amountCents = plan_type === "monthly" ? 1500 : 14400; // $15/mo or $144/yr (20% discount)
    const intervalSql = plan_type === "monthly" ? "30 days" : "365 days";

    try {
      const subRes = await pool.query(
        `INSERT INTO subscriptions (user_id, plan_type, status, amount_cents, stripe_session_id, start_date, renewal_date, updated_at)
       VALUES ($1, $2, 'active', $3, $4, NOW(), NOW() + INTERVAL '${intervalSql}', NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET plan_type = EXCLUDED.plan_type,
           status = 'active',
           amount_cents = EXCLUDED.amount_cents,
           renewal_date = NOW() + INTERVAL '${intervalSql}',
           updated_at = NOW()
       RETURNING *`,
        [req.user!.id, plan_type, amountCents, "stripe_sim_" + Date.now()],
      );

      // ========================================================================================
      // Calculate & credit user's selected charity contribution automatically (PRD Section 08.1)
      // ========================================================================================
      const userRes = await pool.query(
        `SELECT selected_charity_id, charity_percentage, email FROM users WHERE id = $1`,
        [req.user!.id],
      );
      const user = userRes.rows[0];
      if (user && user.selected_charity_id) {
        const charityShareCents = Math.round(
          (amountCents * (user.charity_percentage || 10)) / 100,
        );
        await pool.query(
          `INSERT INTO charity_donations (user_id, donor_email, charity_id, amount_cents, donation_type)
         VALUES ($1, $2, $3, $4, 'subscription_split')`,
          [
            req.user!.id,
            user.email,
            user.selected_charity_id,
            charityShareCents,
          ],
        );
        await pool.query(
          `UPDATE charities SET total_raised_cents = total_raised_cents + $1 WHERE id = $2`,
          [charityShareCents, user.selected_charity_id],
        );
      }

      res.json({
        message: `Subscribed to ${plan_type} plan!`,
        subscription: subRes.rows[0],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ==============================================
// Cancel subscription lifecycle (PRD Section 04)
// ==============================================
router.post(
  "/subscribe/cancel",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await pool.query(
        `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE user_id = $1 RETURNING *`,
        [req.user!.id],
      );
      res.json({
        message: "Subscription cancelled.",
        subscription: result.rows[0],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// =============================================================================
// Update selected Charity & Contribution Percentage (>= 10%) (PRD Section 08.1)
// =============================================================================
router.put(
  "/charity-preferences",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const { selected_charity_id, charity_percentage } = req.body;
    if (Number(charity_percentage) < 10 || Number(charity_percentage) > 100) {
      return res
        .status(400)
        .json({ error: "Minimum charity contribution is 10%." });
    }
    try {
      const updated = await pool.query(
        `UPDATE users SET selected_charity_id = $1, charity_percentage = $2 WHERE id = $3 RETURNING *`,
        [selected_charity_id, Number(charity_percentage), req.user!.id],
      );
      res.json({
        message: "Charity preferences updated!",
        user: updated.rows[0],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ===================================================
// Upload Winner Proof Screenshot URL (PRD Section 09)
// ===================================================
router.post(
  "/winnings/:id/proof",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const { proof_screenshot_url } = req.body;
    if (!proof_screenshot_url)
      return res.status(400).json({ error: "Screenshot URL is required." });
    try {
      const updated = await pool.query(
        `UPDATE draw_winners
       SET proof_screenshot_url = $1, verification_status = 'under_review'
       WHERE id = $2 AND user_id = $3 RETURNING *`,
        [proof_screenshot_url, req.params.id, req.user!.id],
      );
      if (updated.rows.length === 0)
        return res.status(404).json({ error: "Winning record not found." });
      res.json({
        message: "Proof uploaded and submitted for Admin review!",
        winning: updated.rows[0],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ==========================================
// ADMIN DASHBOARD CONTROL SURFACES (Section 11)
// ==========================================
router.get(
  "/admin/overview",
  authenticateToken as any,
  requireAdmin as any,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const usersRes = await pool.query(`
      SELECT u.id, u.email, u.full_name, u.role, u.charity_percentage, u.selected_charity_id, u.created_at,
             c.name as charity_name,
             s.plan_type, s.status as subscription_status, s.renewal_date,
             (SELECT json_agg(gs ORDER BY gs.played_date DESC) FROM golf_scores gs WHERE gs.user_id = u.id) as scores
      FROM users u
      LEFT JOIN charities c ON u.selected_charity_id = c.id
      LEFT JOIN subscriptions s ON u.id = s.user_id
      ORDER BY u.created_at DESC
    `);

      const drawsRes = await pool.query(
        `SELECT * FROM draws ORDER BY created_at DESC`,
      );
      const winnersRes = await pool.query(`
      SELECT dw.*, u.full_name, u.email, d.draw_title, d.winning_numbers
      FROM draw_winners dw
      JOIN users u ON dw.user_id = u.id
      JOIN draws d ON dw.draw_id = d.id
      ORDER BY dw.created_at DESC
    `);
      const charityTotalRes = await pool.query(
        `SELECT COALESCE(SUM(total_raised_cents), 0) as total FROM charities`,
      );
      const activeSubsCount = usersRes.rows.filter(
        (u: any) => u.subscription_status === "active",
      ).length;

      res.json({
        metrics: {
          totalUsers: usersRes.rows.length,
          activeSubscribers: activeSubsCount,
          totalPrizePoolCents: activeSubsCount * 1000,
          totalCharityRaisedCents: parseInt(charityTotalRes.rows[0].total) || 0,
          totalDrawsPublished: drawsRes.rows.filter(
            (d: any) => d.status === "published",
          ).length,
        },
        users: usersRes.rows,
        draws: drawsRes.rows,
        winners: winnersRes.rows,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ============================================================================
// Admin: Edit user profile, subscription status, or scores (PRD Section 11.01)
// ============================================================================
router.put(
  "/admin/users/:id",
  authenticateToken as any,
  requireAdmin as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const { full_name, role, subscription_status, plan_type } = req.body;
    try {
      await pool.query(
        `UPDATE users SET full_name = $1, role = $2 WHERE id = $3`,
        [full_name, role, req.params.id],
      );
      if (subscription_status) {
        await pool.query(
          `INSERT INTO subscriptions (user_id, plan_type, status, amount_cents, renewal_date)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')
         ON CONFLICT (user_id) DO UPDATE SET status = $3, plan_type = $2, updated_at = NOW()`,
          [
            req.params.id,
            plan_type || "monthly",
            subscription_status,
            plan_type === "yearly" ? 14400 : 1500,
          ],
        );
      }
      res.json({ message: "User updated successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ======================================
// Admin: Edit or delete any user's score
// ======================================
router.put(
  "/admin/scores/:id",
  authenticateToken as any,
  requireAdmin as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const { score, played_date } = req.body;
    try {
      const result = await pool.query(
        `UPDATE golf_scores SET score = $1, played_date = $2 WHERE id = $3 RETURNING *`,
        [Number(score), played_date, req.params.id],
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// =================================================================================================
// Admin: Verify Winner Proof (Approve/Reject) & Mark Payout (Pending/Paid) (PRD Section 09 & 11.04)
// =================================================================================================
router.put(
  "/admin/winners/:id",
  authenticateToken as any,
  requireAdmin as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const { verification_status, payment_status, admin_notes } = req.body;
    try {
      const updated = await pool.query(
        `UPDATE draw_winners
       SET verification_status = COALESCE($1, verification_status),
           payment_status = COALESCE($2, payment_status),
           admin_notes = COALESCE($3, admin_notes)
       WHERE id = $4 RETURNING *`,
        [verification_status, payment_status, admin_notes, req.params.id],
      );
      res.json({
        message: "Winner verification & payout updated.",
        winner: updated.rows[0],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
