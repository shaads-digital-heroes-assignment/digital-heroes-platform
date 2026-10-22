import { Response, NextFunction } from "express";
import { pool } from "../config/db.js";
import { AuthenticatedRequest } from "./auth.js";

// PRD Section 04: Non-subscribers receive restricted access
export const requireActiveSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user)
      return res.status(401).json({ error: "Authentication required" });

    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' AND renewal_date > NOW()`,
      [req.user.id],
    );
    if (result.rows.length === 0 && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Active subscription required for this action." });
    }
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
