import { Router, Request, Response } from "express";
import { pool } from "../config/db.js";
import {
  authenticateToken,
  requireAdmin,
  AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

// Helper: Evaluate all active subscribers' 5 scores against 5 winning numbers
async function evaluateSubscribersAgainstDraw(
  winningNumbers: number[],
  tier5Pool: number,
  tier4Pool: number,
  tier3Pool: number,
) {
  const subsRes = await pool.query(`
    SELECT u.id as user_id, u.full_name, u.email,
           ARRAY(
             SELECT gs.score FROM golf_scores gs
             WHERE gs.user_id = u.id
             ORDER BY gs.played_date DESC, gs.created_at DESC
             LIMIT 5
           ) as scores
    FROM users u
    JOIN subscriptions s ON s.user_id = u.id
    WHERE s.status = 'active' AND s.renewal_date > NOW()
  `);

  const tier5Winners: any[] = [];
  const tier4Winners: any[] = [];
  const tier3Winners: any[] = [];

  for (const sub of subsRes.rows) {
    const userScores: number[] = sub.scores || [];
    if (userScores.length === 0) continue;

    // Unique set intersection between user's active scores and drawn numbers
    const uniqueUserScores = Array.from(new Set(userScores));
    const matched = uniqueUserScores.filter((score) =>
      winningNumbers.includes(score),
    );

    if (matched.length === 5) {
      tier5Winners.push({
        ...sub,
        match_tier: 5,
        matched_numbers: matched,
        user_scores_snapshot: userScores,
      });
    } else if (matched.length === 4) {
      tier4Winners.push({
        ...sub,
        match_tier: 4,
        matched_numbers: matched,
        user_scores_snapshot: userScores,
      });
    } else if (matched.length === 3) {
      tier3Winners.push({
        ...sub,
        match_tier: 3,
        matched_numbers: matched,
        user_scores_snapshot: userScores,
      });
    }
  }

  // Equal prize split within each tier (PRD Section 07)
  const tier5Each =
    tier5Winners.length > 0 ? Math.floor(tier5Pool / tier5Winners.length) : 0;
  const tier4Each =
    tier4Winners.length > 0 ? Math.floor(tier4Pool / tier4Winners.length) : 0;
  const tier3Each =
    tier3Winners.length > 0 ? Math.floor(tier3Pool / tier3Winners.length) : 0;

  const allWinners = [
    ...tier5Winners.map((w) => ({ ...w, prize_amount_cents: tier5Each })),
    ...tier4Winners.map((w) => ({ ...w, prize_amount_cents: tier4Each })),
    ...tier3Winners.map((w) => ({ ...w, prize_amount_cents: tier3Each })),
  ];

  return {
    allWinners,
    breakdown: {
      tier5Count: tier5Winners.length,
      tier4Count: tier4Winners.length,
      tier3Count: tier3Winners.length,
      tier5Each,
      tier4Each,
      tier3Each,
      jackpotClaimed: tier5Winners.length > 0,
      rolloverOutCents: tier5Winners.length === 0 ? tier5Pool : 0,
    },
  };
}

// Public: Get published draws & current live pool estimate
router.get("/public", async (_req: Request, res: Response) => {
  try {
    const draws = await pool.query(
      `SELECT * FROM draws WHERE status = 'published' ORDER BY published_at DESC LIMIT 6`,
    );
    const subCountRes = await pool.query(
      `SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`,
    );
    const activeSubCount = parseInt(subCountRes.rows[0].count) || 1;
    const lastPublished = await pool.query(
      `SELECT rollover_out_cents FROM draws WHERE status = 'published' ORDER BY published_at DESC LIMIT 1`,
    );
    const currentRolloverCents =
      lastPublished.rows.length > 0
        ? lastPublished.rows[0].rollover_out_cents
        : 0;

    const estimatedBasePoolCents = activeSubCount * 1000; // $10 per active sub
    const estimatedTotalPoolCents =
      estimatedBasePoolCents + currentRolloverCents;

    res.json({
      publishedDraws: draws.rows,
      livePool: {
        activeSubscribers: activeSubCount,
        basePoolCents: estimatedBasePoolCents,
        rolloverCents: currentRolloverCents,
        totalPoolCents: estimatedTotalPoolCents,
        tier5Cents:
          Math.round(estimatedBasePoolCents * 0.4) + currentRolloverCents,
        tier4Cents: Math.round(estimatedBasePoolCents * 0.35),
        tier3Cents: Math.round(estimatedBasePoolCents * 0.25),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get(
  "/",
  authenticateToken as any,
  requireAdmin as any,
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT * FROM draws ORDER BY created_at DESC`,
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Admin: Simulate a draw (Random or Algorithmic weighted by score frequency)
router.post(
  "/simulate",
  authenticateToken as any,
  requireAdmin as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      draw_type = "random",
      month_title = `${new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date())} Monthly Draw`,
      custom_numbers,
    } = req.body;

    try {
      const subCountRes = await pool.query(
        `SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`,
      );
      const activeSubCount = parseInt(subCountRes.rows[0].count) || 1;

      const contributionPerSubCents = 1000; // $10.00 per active subscriber goes to prize pool
      const basePoolCents = activeSubCount * contributionPerSubCents;

      const lastDrawRes = await pool.query(
        `SELECT rollover_out_cents FROM draws WHERE status = 'published' ORDER BY published_at DESC LIMIT 1`,
      );
      const rolloverCents =
        lastDrawRes.rows.length > 0
          ? lastDrawRes.rows[0].rollover_out_cents
          : 0;

      // PRD Section 07: 40% (5-match + rollover), 35% (4-match), 25% (3-match)
      const tier5PoolCents = Math.round(basePoolCents * 0.4) + rolloverCents;
      const tier4PoolCents = Math.round(basePoolCents * 0.35);
      const tier3PoolCents = Math.round(basePoolCents * 0.25);
      const totalPoolCents = tier5PoolCents + tier4PoolCents + tier3PoolCents;

      let winningNumbers: number[] = [];

      if (Array.isArray(custom_numbers) && custom_numbers.length === 5) {
        winningNumbers = custom_numbers.map(Number);
      } else if (draw_type === "random") {
        while (winningNumbers.length < 5) {
          const num = Math.floor(Math.random() * 45) + 1;
          if (!winningNumbers.includes(num)) winningNumbers.push(num);
        }
      } else {
        // Algorithmic: Weighted by community score frequency
        const freqRes = await pool.query(
          `SELECT score, COUNT(*) as freq FROM golf_scores GROUP BY score ORDER BY freq DESC LIMIT 12`,
        );
        const topScores = freqRes.rows.map((r: { score: number }) =>
          Number(r.score),
        );
        while (winningNumbers.length < 5 && topScores.length > 0) {
          const randIdx = Math.floor(Math.random() * topScores.length);
          const num = topScores.splice(randIdx, 1)[0];
          if (!winningNumbers.includes(num)) winningNumbers.push(num);
        }
        while (winningNumbers.length < 5) {
          const num = Math.floor(Math.random() * 45) + 1;
          if (!winningNumbers.includes(num)) winningNumbers.push(num);
        }
      }
      winningNumbers.sort((a, b) => a - b);

      const evaluation = await evaluateSubscribersAgainstDraw(
        winningNumbers,
        tier5PoolCents,
        tier4PoolCents,
        tier3PoolCents,
      );

      const drawInsert = await pool.query(
        `INSERT INTO draws (
        draw_title, draw_type, status, winning_numbers, active_subscribers_count,
        base_pool_cents, rollover_added_cents, total_pool_cents,
        tier_5_pool_cents, tier_4_pool_cents, tier_3_pool_cents,
        jackpot_claimed, rollover_out_cents
      ) VALUES ($1, $2, 'simulated', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          month_title,
          draw_type,
          winningNumbers,
          activeSubCount,
          basePoolCents,
          rolloverCents,
          totalPoolCents,
          tier5PoolCents,
          tier4PoolCents,
          tier3PoolCents,
          evaluation.breakdown.jackpotClaimed,
          evaluation.breakdown.rolloverOutCents,
        ],
      );

      res.json({
        message: "Simulation complete! Review results before publishing.",
        draw: drawInsert.rows[0],
        simulationBreakdown: evaluation.breakdown,
        simulatedWinners: evaluation.allWinners,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Admin: Publish a simulated draw & generate official winner records
router.post(
  "/:id/publish",
  authenticateToken as any,
  requireAdmin as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const drawRes = await pool.query(`SELECT * FROM draws WHERE id = $1`, [
        req.params.id,
      ]);
      if (drawRes.rows.length === 0)
        return res.status(404).json({ error: "Draw not found" });
      const draw = drawRes.rows[0];
      if (draw.status === "published")
        return res.status(400).json({ error: "Draw already published" });

      const evaluation = await evaluateSubscribersAgainstDraw(
        draw.winning_numbers,
        draw.tier_5_pool_cents,
        draw.tier_4_pool_cents,
        draw.tier_3_pool_cents,
      );

      const updatedDraw = await pool.query(
        `UPDATE draws
       SET status = 'published', jackpot_claimed = $1, rollover_out_cents = $2, published_at = NOW()
       WHERE id = $3 RETURNING *`,
        [
          evaluation.breakdown.jackpotClaimed,
          evaluation.breakdown.rolloverOutCents,
          draw.id,
        ],
      );

      for (const w of evaluation.allWinners) {
        await pool.query(
          `INSERT INTO draw_winners (draw_id, user_id, match_tier, matched_numbers, user_scores_snapshot, prize_amount_cents)
         VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            draw.id,
            w.user_id,
            w.match_tier,
            w.matched_numbers,
            w.user_scores_snapshot,
            w.prize_amount_cents,
          ],
        );
      }

      res.json({
        message: "Draw officially published!",
        draw: updatedDraw.rows[0],
        winnersRecorded: evaluation.allWinners.length,
        winners_count: evaluation.allWinners.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.get(
  "/winners",
  authenticateToken as any,
  requireAdmin as any,
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
      SELECT dw.*, u.full_name, u.email, d.draw_title
      FROM draw_winners dw
      JOIN users u ON u.id = dw.user_id
      JOIN draws d ON d.id = dw.draw_id
      ORDER BY dw.created_at DESC
    `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.put(
  "/winners/:id",
  authenticateToken as any,
  requireAdmin as any,
  async (req: Request, res: Response) => {
    const { verification_status, payment_status } = req.body;
    try {
      const result = await pool.query(
        `UPDATE draw_winners SET verification_status = $1, payment_status = $2 WHERE id = $3 RETURNING *`,
        [verification_status, payment_status, req.params.id],
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Admin: Get all users WITH their latest 5 golf scores (Section 11.01)
router.get(
  "/users",
  authenticateToken as any,
  requireAdmin as any,
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
      SELECT u.id, u.email, u.full_name, u.role, u.charity_percentage,
             s.status as subscription_status, s.plan_type,
             COALESCE(
               (SELECT json_agg(gs ORDER BY gs.played_date DESC)
                FROM (SELECT id, score, played_date FROM golf_scores WHERE user_id = u.id ORDER BY played_date DESC LIMIT 5) gs),
               '[]'::json
             ) as scores
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      ORDER BY u.created_at DESC
    `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Admin: Edit User Profile (Section 11.01)
router.put(
  "/users/:id",
  authenticateToken as any,
  requireAdmin as any,
  async (req: Request, res: Response) => {
    const { full_name, email, charity_percentage, role } = req.body;
    try {
      const result = await pool.query(
        `UPDATE users SET full_name = $1, email = $2, charity_percentage = $3, role = $4 WHERE id = $5 RETURNING *`,
        [
          full_name,
          email,
          Number(charity_percentage),
          role || "subscriber",
          req.params.id,
        ],
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.put(
  "/users/:id/subscription",
  authenticateToken as any,
  requireAdmin as any,
  async (req: Request, res: Response) => {
    const { status } = req.body;
    try {
      await pool.query(
        `INSERT INTO subscriptions (user_id, plan_type, status, amount_cents, renewal_date)
       VALUES ($1, 'monthly', $2, 1500, NOW() + INTERVAL '30 days')
       ON CONFLICT (user_id) DO UPDATE SET status = $2`,
        [req.params.id, status],
      );
      res.json({ message: "Updated" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Admin: Edit or Delete a User's Golf Score (Section 11.01)
router.put(
  "/scores/:scoreId",
  authenticateToken as any,
  requireAdmin as any,
  async (req: Request, res: Response) => {
    const score = Number(req.body.score);
    if (score < 1 || score > 45)
      return res.status(400).json({ error: "Score must be 1-45" });
    try {
      const result = await pool.query(
        `UPDATE golf_scores SET score = $1 WHERE id = $2 RETURNING *`,
        [score, req.params.scoreId],
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.delete(
  "/scores/:scoreId",
  authenticateToken as any,
  requireAdmin as any,
  async (req: Request, res: Response) => {
    try {
      await pool.query(`DELETE FROM golf_scores WHERE id = $1`, [
        req.params.scoreId,
      ]);
      res.json({ message: "Score deleted by Admin" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.get(
  "/analytics",
  authenticateToken as any,
  requireAdmin as any,
  async (_req: Request, res: Response) => {
    try {
      const uCount = await pool.query("SELECT COUNT(*) FROM users");
      const sCount = await pool.query(
        `SELECT COUNT(*) FROM subscriptions WHERE status = 'active'`,
      );
      const cTotal = await pool.query(
        "SELECT COALESCE(SUM(total_raised_cents), 0) as sum FROM charities",
      );
      const pTotal = await pool.query(
        "SELECT COALESCE(SUM(total_pool_cents), 0) as sum FROM draws",
      );
      const dCount = await pool.query(
        `SELECT COUNT(*) FROM draws WHERE status = 'published'`,
      );
      const wCount = await pool.query(`SELECT COUNT(*) FROM draw_winners`);

      res.json({
        total_users: Number(uCount.rows[0].count),
        active_subscribers: Number(sCount.rows[0].count),
        total_charity_cents: Number(cTotal.rows[0].sum),
        total_prize_pool_cents: Number(pTotal.rows[0].sum),
        published_draws: Number(dCount.rows[0].count),
        total_winners: Number(wCount.rows[0].count),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
