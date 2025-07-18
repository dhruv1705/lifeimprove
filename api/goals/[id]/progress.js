const connectDB = require('../../lib/mongodb.js');
const Goal = require('../../models/Goal.js');
const { verifyToken } = require('../../lib/auth-middleware.js');

const handler = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    await connectDB();

    // Find goal and verify ownership
    const goal = await Goal.findOne({ _id: id, userId: req.userId });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const { currentValue, progress } = req.body;

    // Update progress based on goal type
    if (goal.type === 'numeric' || goal.type === 'habit') {
      if (currentValue !== undefined) {
        goal.currentValue = currentValue;
      }
    } else if (goal.type === 'milestone') {
      if (progress !== undefined) {
        goal.progress = Math.min(Math.max(progress, 0), 100);
      }
    }

    // Save will automatically recalculate progress for numeric/habit goals
    await goal.save();

    return res.status(200).json({ 
      message: 'Progress updated successfully',
      goal 
    });
  } catch (error) {
    console.error('Progress update error:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
};

module.exports = verifyToken(handler);