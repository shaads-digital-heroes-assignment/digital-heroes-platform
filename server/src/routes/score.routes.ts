import { Router, Response } from "express";
import { pool } from "../config/db.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import { requireActiveSubscription } from "../middleware/subscription.js";
import { z } from "zod";

const router = Router();

// Get user's latest 5 scores in reverse chronological order
router.get(
  "/",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const scores = await pool.query(
        `SELECT * FROM golf_scores WHERE user_id = $1 ORDER BY played_date DESC, created_at DESC LIMIT 5`,
        [req.user!.id],
      );
      res.json(scores.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Log new score (1-45 Stableford, unique date per user, auto-retains top 5 via DB trigger)
router.post(
  "/",
  authenticateToken as any,
  requireActiveSubscription as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const schema = z.object({
      score: z.number().int().min(1).max(45),
      played_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ error: "Score must be 1–45 with a valid YYYY-MM-DD date." });

    const { score, played_date } = parsed.data;

    try {
      const dupCheck = await pool.query(
        `SELECT id FROM golf_scores WHERE user_id = $1 AND played_date = $2`,
        [req.user!.id, played_date],
      );
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({
          error:
            "A score for this date already exists. Please edit or delete the existing entry instead.",
        });
      }

      const newScore = await pool.query(
        `INSERT INTO golf_scores (user_id, score, played_date) VALUES ($1, $2, $3) RETURNING *`,
        [req.user!.id, score, played_date],
      );

      const updatedList = await pool.query(
        `SELECT * FROM golf_scores WHERE user_id = $1 ORDER BY played_date DESC, created_at DESC LIMIT 5`,
        [req.user!.id],
      );

      res.status(201).json({
        message: "Score logged! Latest 5 retained.",
        score: newScore.rows[0],
        scores: updatedList.rows,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Edit an existing score
router.put(
  "/:id",
  authenticateToken as any,
  requireActiveSubscription as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const schema = z.object({
      score: z.number().int().min(1).max(45),
      played_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: "Invalid score (1-45) or date." });

    const { score, played_date } = parsed.data;

    try {
      if (played_date) {
        const dupCheck = await pool.query(
          `SELECT id FROM golf_scores WHERE user_id = $1 AND played_date = $2 AND id != $3`,
          [req.user!.id, played_date, req.params.id],
        );
        if (dupCheck.rows.length > 0) {
          return res
            .status(409)
            .json({ error: "Another score already exists on that date." });
        }
      }

      const updated = played_date
        ? await pool.query(
            `UPDATE golf_scores SET score = $1, played_date = $2 WHERE id = $3 AND user_id = $4 RETURNING *`,
            [score, played_date, req.params.id, req.user!.id],
          )
        : await pool.query(
            `UPDATE golf_scores SET score = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
            [score, req.params.id, req.user!.id],
          );

      if (updated.rows.length === 0)
        return res.status(404).json({ error: "Score not found." });

      res.json({ message: "Score updated.", score: updated.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Delete an existing score
router.delete(
  "/:id",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await pool.query(
        `DELETE FROM golf_scores WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user!.id],
      );
      res.json({ message: "Score deleted." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Get subscriber's winning entries
router.get(
  "/my-winnings",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT dw.*, d.draw_title FROM draw_winners dw
       JOIN draws d ON d.id = dw.draw_id
       WHERE dw.user_id = $1 ORDER BY dw.created_at DESC`,
        [req.user!.id],
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Upload Winner Verification Screenshot (Section 09)
router.post(
  "/winnings/:id/proof",
  authenticateToken as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const { proof_screenshot_url } = req.body;
    try {
      const result = await pool.query(
        `UPDATE draw_winners SET proof_screenshot_url = $1, verification_status = 'under_review'
       WHERE id = $2 AND user_id = $3 RETURNING *`,
        [proof_screenshot_url, req.params.id, req.user!.id],
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
