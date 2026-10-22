import { Router, Request, Response } from "express";
import { pool } from "../config/db.js";
import {
  authenticateToken,
  requireAdmin,
  AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();

// Public: List all charities with search & category filter
router.get("/", async (req: Request, res: Response) => {
  const { search, category } = req.query;
  try {
    let query = "SELECT * FROM charities WHERE 1=1";
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR short_summary ILIKE $${params.length})`;
    }
    if (category && category !== "All") {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += " ORDER BY is_featured DESC, total_raised_cents DESC";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public/Subscriber: Independent direct donation (PRD Section 08.1)
router.post("/:id/donate", async (req: Request, res: Response) => {
  const { amount_cents, donor_email, user_id } = req.body;
  if (!amount_cents || amount_cents < 100) {
    return res.status(400).json({ error: "Minimum donation is $1.00" });
  }
  try {
    await pool.query(
      `INSERT INTO charity_donations (user_id, donor_email, charity_id, amount_cents, donation_type)
       VALUES ($1, $2, $3, $4, 'independent_donation')`,
      [
        user_id || null,
        donor_email || "anonymous@donor.org",
        req.params.id,
        amount_cents,
      ],
    );
    const updated = await pool.query(
      `UPDATE charities SET total_raised_cents = total_raised_cents + $1 WHERE id = $2 RETURNING *`,
      [amount_cents, req.params.id],
    );
    res.status(201).json({
      message: "Thank you for your direct contribution!",
      charity: updated.rows[0],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Create Charity
router.post(
  "/",
  authenticateToken as any,
  requireAdmin as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      name,
      category,
      short_summary,
      description,
      banner_url,
      is_featured,
      upcoming_events,
    } = req.body;
    const slug =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now().toString().slice(-3);
    try {
      const result = await pool.query(
        `INSERT INTO charities (name, slug, category, short_summary, description, banner_url, is_featured, upcoming_events)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          name,
          slug,
          category || "Community Impact",
          short_summary,
          description,
          banner_url,
          !!is_featured,
          JSON.stringify(upcoming_events || []),
        ],
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Admin: Update Charity
router.put(
  "/:id",
  authenticateToken as any,
  requireAdmin as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      name,
      category,
      short_summary,
      description,
      banner_url,
      is_featured,
      upcoming_events,
    } = req.body;
    try {
      const result = await pool.query(
        `UPDATE charities
       SET name = $1, category = $2, short_summary = $3, description = $4, banner_url = $5, is_featured = $6, upcoming_events = $7
       WHERE id = $8 RETURNING *`,
        [
          name,
          category,
          short_summary,
          description,
          banner_url,
          !!is_featured,
          JSON.stringify(upcoming_events || []),
          req.params.id,
        ],
      );
      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Admin: Delete Charity
router.delete(
  "/:id",
  authenticateToken as any,
  requireAdmin as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await pool.query("DELETE FROM charities WHERE id = $1", [req.params.id]);
      res.json({ message: "Charity deleted." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
