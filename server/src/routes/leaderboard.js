import { Router } from 'express';
import { Issue } from '../models/Issue.js';

const router = Router();

// Public endpoint — no requireAuth, since the Leaderboard page itself is
// public and this only exposes names + counts, nothing sensitive.
router.get('/', async (req, res) => {
  try {
    const leaderboard = await Issue.aggregate([
      // Group all issues by who reported them, counting each citizen's total
      { $group: { _id: '$reportedBy', totalReports: { $sum: 1 } } },
      { $sort: { totalReports: -1 } },
      { $limit: 10 },
      // Join against the users collection to get each citizen's display name
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $project: { _id: 0, name: '$user.name', totalReports: 1 } },
    ]);

    res.json(leaderboard);
  } catch (err) {
    console.error('[leaderboard]', err);
    res.status(500).json({ message: 'Error fetching leaderboard.', error: err.message });
  }
});

export default router;