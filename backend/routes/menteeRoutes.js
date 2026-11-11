const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Mentee = require('../models/Mentee');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const Program = require('../models/Program');
const Resource = require('../models/Resource');
const { authenticateMentee } = require('../middleware/authMentor');
const router = express.Router();


router.post('/login', async (req, res) => {
  const { enrollmentNumber, password } = req.body;
  try {
    const mentee = await Mentee.findOne({ enrollmentNumber });
    if (!mentee) {
      return res.status(400).json({ error: 'Invalid enrollment number or mentee not found' });
    }
    
    // Support both plaintext and bcrypt passwords
    let isMatch = mentee.password === password;
    if (!isMatch && mentee.password && (mentee.password.startsWith('$2a$') || mentee.password.startsWith('$2b$'))) {
      try {
        isMatch = await bcrypt.compare(password, mentee.password);
      } catch (e) {
        isMatch = false;
      }
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: mentee._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      mentee: {
        _id: mentee._id,
        name: mentee.name,
        email: mentee.email,
        enrollmentNumber: mentee.enrollmentNumber
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Mentee Dashboard --- //
router.get('/dashboard', authenticateMentee, async (req, res) => {
  try {
    const mentee = await Mentee.findById(req.mentee._id)
    .populate({
      path: 'programs',
      populate: {
        path: 'resources',
        model: 'Resource'
      }
    })  
    .populate({
      path: 'completedResources.resource',
      model: 'Resource'
    });

    if (!mentee) {
      return res.status(404).json({ error: 'Mentee not found' });
    }

    // Map completedResources for quick lookup
    const completedMap = new Map();
    (mentee.completedResources || []).forEach((item) => {
      if (item && item.resource && item.resource._id) {
        completedMap.set(item.resource._id.toString(), {
          score: item.score,
          completedOn: item.completedOn,
          verified: item.verified,
          githubLink: item.githubLink,
          deployedLink: item.deployedLink
        });
      }
    });

    let totalScore = 0;
    (mentee.completedResources || []).forEach((item) => {
      totalScore += item.score || 0;
    });

    // Add completed status to each resource
    const updatedPrograms = (mentee.programs || []).map((program) => {
      const updatedResources = (program.resources || []).map((res) => {
        const isCompleted = completedMap.has(res._id.toString());
        const completion = isCompleted ? completedMap.get(res._id.toString()) : null;
        return {
          ...res.toObject(),
          completed: isCompleted,
          score: completion ? completion.score : null,
          completedOn: completion ? completion.completedOn : null,
          verified: completion ? completion.verified : false,
          githubLink: completion ? completion.githubLink : null,
          deployedLink: completion ? completion.deployedLink : null
        };
      });
      return {
        ...program.toObject(),
        resources: updatedResources
      };
    });

    const rank = await calculateRank(mentee._id);
    const aiInsights = generateAiInsights(mentee, totalScore, rank);

    res.json({
      _id: mentee._id,
      name: mentee.name,
      email: mentee.email,
      enrollmentNumber: mentee.enrollmentNumber,
      streak: mentee.streak || 0,
      totalScore,
      rank,
      programs: updatedPrograms,
      completedResources: mentee.completedResources || [],
      aiInsights
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- Resource Completion --- //
router.post('/resources/:id/complete', authenticateMentee, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    const mentee = req.mentee;

    // Check if resource is unlocked
    if (resource.isLocked) {
      return res.status(403).json({ error: 'Resource is locked' });
    }

    // Calculate score (deduct for late submission)
    const deadline = resource.deadline;
    const isLate = deadline && new Date() > deadline;
    const latePenalty = isLate ? Math.floor((new Date() - deadline) / (1000 * 60 * 60 * 24)) : 0; // 1 point/day
    const score = Math.max(0, resource.maxScore - latePenalty);

    // Update mentee's progress
    const completedResource = {
      resource: resource._id,
      score,
      completedOn: new Date()
    };

    // Check if resource is already completed
    const existingCompletion = mentee.completedResources.find(
      (completed) => completed.resource.toString() === resource._id.toString()
    );

    if (existingCompletion) {
      // If already completed, update the score and date
      existingCompletion.score = score;
      existingCompletion.completedOn = new Date();
    } else {
      // If not completed yet, push new completion entry
      mentee.completedResources.push(completedResource);
    }

    // Update streak (if active today)
    await updateStreak(mentee);
    await mentee.save();

    res.json({ message: 'Resource marked as completed!', score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/resources/:id/quiz/submit', authenticateMentee, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const mentee = req.mentee;
    const answers = req.body.answers; // [{ questionId, selectedOptionIndex }, ...]

    const resource = await Resource.findById(resourceId).populate('quiz');
    if (!resource || resource.type !== 'quiz') {
      return res.status(400).json({ error: 'Invalid quiz resource' });
    }

    if (resource.isLocked) {
      return res.status(403).json({ error: 'Quiz is locked' });
    }

    const quiz = await Quiz.findOne({resource:resourceId});
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const now = new Date();
    if (now < quiz.startTime || now > quiz.endTime) {
      return res.status(403).json({ error: 'Quiz is not active at this time' });
    }

    // Prevent resubmission
    const existing = await QuizSubmission.findOne({ quiz: quiz._id, mentee: mentee._id });
    if (existing) {
      return res.status(409).json({ error: 'Quiz already submitted' });
    }

    // Calculate score
    let totalScore = 0;
    for (const question of quiz.questions) {
      const userAnswer = answers.find(ans => ans.questionId === question._id.toString());
      if (userAnswer && userAnswer.selectedOptionIndex === question.correctOptionIndex) {
        totalScore += question.marks || 1;
      }
    }

    // Save submission
    const submission = new QuizSubmission({
      quiz: quiz._id,
      resource: resourceId,
      mentee: mentee._id,
      answers,
      score: totalScore,
    });

    await submission.save();

    // Update mentee's resource progress
    const completedResource = {
      resource: resource._id,
      score: totalScore,
      completedOn: new Date()
    };

    const alreadyCompleted = mentee.completedResources.find(
      (r) => r.resource.toString() === resource._id.toString()
    );

    if (alreadyCompleted) {
      alreadyCompleted.score = totalScore;
      alreadyCompleted.completedOn = new Date();
    } else {
      mentee.completedResources.push(completedResource);
    }

    // Update streak and total score
    await updateStreak(mentee);
    // mentee.totalScore += totalScore;
    await mentee.save();

    res.status(200).json({ message: 'Quiz submitted successfully!', score: totalScore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/resources/:id/quiz', authenticateMentee, async (req, res) => {
  try {
    const resourceId = req.params.id;
    console.log(resourceId);
    const resource = await Resource.findById(resourceId).populate('quiz');
    if (!resource || resource.type !== 'quiz') {
      return res.status(400).json({ error: 'Invalid resource or quiz not found' });
    }

    console.log(resource);
    const quiz = await Quiz.findOne({ resource: resourceId });
    console.log("quiz",quiz);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json({
      title: resource.title,
      description: resource.description,
      questions: quiz.questions.map((q) => ({
        id: q._id,
        questionText: q.questionText,
        options: q.options,
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/m/resources/:resourceId/project
router.post('/resources/:resourceId/project', authenticateMentee, async (req, res) => {
  try {
    const { githubLink, deployedLink, description } = req.body;
    const resource = await Resource.findById(req.params.resourceId);
    const mentee = req.mentee;

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (resource.type !== 'project') {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    if (resource.isLocked) {
      return res.status(403).json({ error: 'Resource is locked' });
    }
    // Validate inputs
    if (!githubLink || !deployedLink || !description) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // if (description.trim().split(/\s+/).length < 300) {
    //   return res.status(400).json({ error: 'Description must be at least 300 words' });
    // }

    const deadline = resource.deadline;
    const isLate = deadline && new Date() > deadline;
    const latePenalty = isLate ? Math.floor((new Date() - deadline) / (1000 * 60 * 60 * 24)) : 0;
    const baseScore = resource.maxScore;
    const score = Math.max(0, baseScore - latePenalty);

    // Create the completion entry
    const projectCompletion = {
      resource: resource._id,
      githubLink,
      deployedLink,
      description,
      score: 0, // Score to be updated by mentor later
      submittedOn: new Date(),
    };

    // Check if already completed
    const existing = mentee.completedResources.find(
      (c) => c.resource.toString() === resource._id.toString()
    );

    if (existing) {
      existing.githubLink = githubLink;
      existing.deployedLink = deployedLink;
      existing.description = description;
      existing.submittedOn = new Date();
      existing.score = 0;
    } else {
      mentee.completedResources.push(projectCompletion);
    }
    await mentee.save();

    res.json({ message: 'Project submitted successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Helper: Calculate rank (example: based on total score)
async function calculateRank(menteeId) {
  const me = await Mentee.findById(menteeId)
    .select('streak lastActiveDate completedResources.score')
    .lean();

  if (!me) return null;

  const myScore = (me.completedResources || [])
    .reduce((s, c) => s + (c?.score || 0), 0);
  const myStreak = me.streak || 0;
  const myLast   = me.lastActiveDate || new Date(0);

  // Count how many are strictly "better" in the same sort order
  const better = await Mentee.aggregate([
    {
      $project: {
        streak: { $ifNull: ['$streak', 0] },
        lastActiveDate: 1,
        totalScore: {
          $sum: {
            $map: {
              input: { $ifNull: ['$completedResources', []] },
              as: 'cr',
              in: { $ifNull: ['$$cr.score', 0] }
            }
          }
        }
      }
    },
    {
      $match: {
        $or: [
          { totalScore: { $gt: myScore } },
          { totalScore: myScore, streak: { $gt: myStreak } },
          { totalScore: myScore, streak: myStreak, lastActiveDate: { $gt: myLast } }
        ]
      }
    },
    { $count: 'cnt' }
  ]);

  return (better[0]?.cnt || 0) + 1;
}

// Helper: Update streak
async function updateStreak(mentee) {
  const today = new Date().toDateString();
  const lastActive = mentee.lastActiveDate?.toDateString();

  if (lastActive !== today) {
    mentee.streak = lastActive === new Date(Date.now() - 86400000).toDateString() 
      ? mentee.streak + 1 
      : 1;
    mentee.lastActiveDate = new Date();
  }
}

// --- Public Leaderboard --- //
// --- Public Leaderboard (same calc as dashboard) --- //
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const skip  = Math.max(parseInt(req.query.skip  || '0', 10), 0);

    // Compute totalScore = sum(completedResources.score)
    const rows = await Mentee.aggregate([
      {
        $project: {
          name: 1,
          streak: { $ifNull: ['$streak', 0] },
          lastActiveDate: 1,
          totalScore: {
            $sum: {
              $map: {
                input: { $ifNull: ['$completedResources', []] },
                as: 'cr',
                in: { $ifNull: ['$$cr.score', 0] }
              }
            }
          }
        }
      },
      // same ordering everywhere: score desc, streak desc, lastActive desc, _id asc (stable)
      { $sort: { totalScore: -1, streak: -1, lastActiveDate: -1, _id: 1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    // Attach 1-based rank consistent with global order + skip
    const leaderboard = rows.map((m, i) => ({
      rank: skip + i + 1,
      name: m.name,
      totalScore: m.totalScore || 0,
      streak: m.streak || 0
    }));

    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Public Shareable Profile --- //
router.get('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let mentee = null;
    
    // Check if id is ObjectId or enrollmentNumber
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      mentee = await Mentee.findById(id)
        .populate('programs', 'name')
        .populate('completedResources.resource', 'title type maxScore skillCategory');
    } else {
      mentee = await Mentee.findOne({ enrollmentNumber: id })
        .populate('programs', 'name')
        .populate('completedResources.resource', 'title type maxScore skillCategory');
    }

    if (!mentee) {
      return res.status(404).json({ error: 'Developer profile not found' });
    }

    let totalScore = 0;
    (mentee.completedResources || []).forEach((item) => {
      totalScore += item.score || 0;
    });

    const rank = await calculateRank(mentee._id);
    const aiInsights = generateAiInsights(mentee, totalScore, rank);

    // Filter verified projects for public showcase
    const publicProjects = (mentee.completedResources || [])
      .filter(c => c.githubLink || c.deployedLink || (c.resource && c.resource.type === 'project'))
      .map(c => ({
        title: c.resource?.title || 'Capstone Project',
        description: c.description || 'Full-stack application built during TechNeeds cohort',
        githubLink: c.githubLink,
        deployedLink: c.deployedLink,
        score: c.score,
        verified: c.verified,
        submittedOn: c.submittedOn || c.completedOn
      }));

    res.json({
      _id: mentee._id,
      name: mentee.name,
      programs: (mentee.programs || []).map(p => p.name),
      streak: mentee.streak || 0,
      totalScore,
      rank,
      publicProjects,
      aiInsights
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Deterministic AI Growth Engine
function generateAiInsights(mentee, totalScore, rank) {
  const completed = mentee.completedResources || [];
  const completedCount = completed.length;
  
  // XP-based developer leveling
  let level = { levelNumber: 1, title: 'Novice Coder', currentXp: totalScore, nextXp: 300, progress: Math.min(100, Math.round((totalScore / 300) * 100)) };
  if (totalScore >= 2000) {
    level = { levelNumber: 5, title: 'Code Grandmaster', currentXp: totalScore, nextXp: 5000, progress: 100 };
  } else if (totalScore >= 1000) {
    level = { levelNumber: 4, title: 'Systems Architect', currentXp: totalScore, nextXp: 2000, progress: Math.min(100, Math.round(((totalScore - 1000) / 1000) * 100)) };
  } else if (totalScore >= 500) {
    level = { levelNumber: 3, title: 'Full-Stack Builder', currentXp: totalScore, nextXp: 1000, progress: Math.min(100, Math.round(((totalScore - 500) / 500) * 100)) };
  } else if (totalScore >= 200) {
    level = { levelNumber: 2, title: 'Syntax Artisan', currentXp: totalScore, nextXp: 500, progress: Math.min(100, Math.round(((totalScore - 200) / 300) * 100)) };
  }

  // Skill Galaxy Breakdown (0 - 100%)
  const skills = [
    { name: 'Frontend Architecture', score: Math.min(96, 35 + completedCount * 12), level: 'Advanced', color: '#6366F1' },
    { name: 'Backend & APIs', score: Math.min(92, 28 + completedCount * 14), level: 'Proficient', color: '#8B5CF6' },
    { name: 'Database & MongoDB', score: Math.min(90, 22 + completedCount * 11), level: 'Intermediate', color: '#22D3EE' },
    { name: 'Data Structures & Algo', score: Math.min(88, 30 + completedCount * 8), level: 'Intermediate', color: '#EC4899' },
    { name: 'System Design', score: Math.min(85, 20 + completedCount * 10), level: 'Developing', color: '#F59E0B' },
    { name: 'Deployment & CI/CD', score: Math.min(84, 25 + (completed.filter(c => c.verified).length) * 25), level: 'Practical', color: '#10B981' }
  ];

  // Dynamic Badges
  const badges = [
    { id: 'first_spark', name: 'First Spark', icon: 'zap', description: 'Completed your first learning resource', earned: completedCount >= 1 },
    { id: 'streak_titan', name: 'Streak Titan', icon: 'flame', description: 'Maintained a multi-day learning streak', earned: (mentee.streak || 0) >= 2 },
    { id: 'century_club', name: 'Century Club', icon: 'award', description: 'Surpassed 100 total learning XP', earned: totalScore >= 100 },
    { id: 'ship_it', name: 'Ship It', icon: 'rocket', description: 'Submitted a verified capstone project', earned: completed.some(c => c.verified) },
    { id: 'quiz_master', name: 'Quiz Master', icon: 'check-circle-2', description: 'Achieved top marks on quiz assessments', earned: completed.some(c => (c.score || 0) >= 50) },
    { id: 'top_tier', name: 'Elite Cohort', icon: 'shield', description: 'Ranked in the top echelon of the leaderboard', earned: (rank || 99) <= 10 }
  ];

  // Dynamic Headline
  let headline = 'Aspiring Full-Stack Software Engineer';
  if (totalScore >= 800) headline = 'Full-Stack Systems Engineer & Cloud Architect';
  else if (totalScore >= 400) headline = 'Modern Web & Cloud Applications Developer';
  else if (completedCount >= 2) headline = 'Full-Stack Developer in Training';

  // Strengths
  const strengths = [
    completedCount > 0 ? `Completed ${completedCount} cohort resources with strong technical progress` : 'Active enrollment in structured developer mentorship cohort',
    mentee.streak > 0 ? `Maintained an active streak of ${mentee.streak} days showing high consistency` : 'Consistent participation and assignment tracking',
    totalScore > 0 ? `Accumulated ${totalScore} verified XP in technical evaluations` : 'Ready to begin technical assessment modules'
  ];

  // Improvement Areas
  const improvementAreas = [
    completed.filter(c => c.verified).length === 0 ? 'Submit your capstone project repository to receive senior mentor review & grading' : 'Expand end-to-end integration tests for your deployed portfolio projects',
    'Take upcoming cohort quizzes before the deadline to earn maximum bonus XP',
    'Contribute to open issues on cohort repositories to level up collaboration skills'
  ];

  // Recommendations
  const recommendations = [
    { title: 'Interactive State Management & Server Actions', type: 'video', reason: 'Strengthen modern Next.js 15 paradigms' },
    { title: 'Full-Stack Authentication & RBAC Project', type: 'project', reason: 'High-leverage capstone for verified portfolio' },
    { title: 'Database Optimization & Indexing Assessment', type: 'quiz', reason: 'Reinforce MongoDB Atlas performance fundamentals' }
  ];

  return {
    headline,
    level,
    skills,
    badges,
    strengths,
    improvementAreas,
    recommendations,
    nextMilestone: `Earn ${Math.max(15, level.nextXp - totalScore)} more XP to level up to ${level.levelNumber + 1}!`,
    lastEvaluated: new Date().toISOString(),
    isRuleBased: true,
    engineName: 'TechNeeds AI Growth Engine v2.0'
  };
}

module.exports = router;