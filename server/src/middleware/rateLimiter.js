import rateLimit from 'express-rate-limit';

// Rate limit for authentication attempts (Registration & Login)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

// Rate limit for civic issue submission
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // limit each IP to 30 submissions per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Submission rate limit reached. Please wait before submitting more reports.',
  },
});
