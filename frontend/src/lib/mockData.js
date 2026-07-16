// Temporary mock data so the dashboard/leaderboard pages have something to
// render before Phase 3 (real /api/issues) exists. Every page importing this
// only needs one line changed later: swap this import for a fetch() call.

export const mockIssues = [
  { id: '4a1f', category: 'pothole', description: 'Large pothole on Main Street causing traffic issues', location: '28.61, 77.20', priority: 'high', status: 'open', date: '2026-06-28' },
  { id: '7c3d', category: 'garbage', description: 'Overflowing garbage bin near the market entrance', location: '28.60, 77.21', priority: 'medium', status: 'in-progress', date: '2026-06-25' },
  { id: '9e2b', category: 'streetlight', description: 'Streetlight has been out for over a week', location: '28.62, 77.19', priority: 'low', status: 'resolved', date: '2026-06-20' },
  { id: '1f8a', category: 'drainage', description: 'Blocked drain causing waterlogging after rain', location: '28.59, 77.22', priority: 'urgent', status: 'open', date: '2026-07-01' },
];

export const mockLeaderboard = [
  { rank: 1, name: 'Priya Sharma', reports: 47 },
  { rank: 2, name: 'Amit Verma', reports: 39 },
  { rank: 3, name: 'Sara Khan', reports: 31 },
  { rank: 4, name: 'Rohan Gupta', reports: 22 },
  { rank: 5, name: 'Test User', reports: 14 },
];

export const mockChartData = {
  statusBreakdown: [
    { name: 'Open', value: 18, color: '#f0b429' },
    { name: 'In Progress', value: 9, color: '#3b4252' },
    { name: 'Resolved', value: 41, color: '#22c55e' },
  ],
  resolutionByCategory: [
    { category: 'Pothole', days: 6.2 },
    { category: 'Garbage', days: 2.1 },
    { category: 'Streetlight', days: 4.8 },
    { category: 'Drainage', days: 8.5 },
  ],
};