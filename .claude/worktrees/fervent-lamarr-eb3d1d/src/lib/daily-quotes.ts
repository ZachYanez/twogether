const DAILY_QUOTES = [
  "The most precious gift we can offer others is our presence.",
  "Connection is why we're here; it is what gives purpose and meaning to our lives.",
  "Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.",
  "The greatest thing you'll ever learn is just to love and be loved in return.",
  "In every moment of genuine connection, we create something sacred together.",
  "Presence is the most precious gift we can give to another human being.",
  "Love is not just looking at each other, it's looking in the same direction.",
  "The quality of our relationships determines the quality of our lives.",
  "When we focus on what matters most, everything else becomes background noise.",
  "True intimacy is built in the quiet moments when phones are down and hearts are open.",
  "The art of being together is learning to be fully present with one another.",
  "Every shared silence is a conversation, every glance an exchange of souls.",
  "In a world full of distractions, choosing to be present is choosing to love.",
  "The deepest connections happen when we put down our devices and pick up our hearts.",
  "Real relationships are built one undistracted moment at a time.",
  "The most radical thing you can do is be fully present with someone you love.",
  "When we give our attention freely, we give our love completely.",
  "Connection isn't about being perfect together; it's about being real together.",
  "The spaces between us disappear when we choose presence over productivity.",
  "Love grows in the garden of undivided attention.",
  "The best conversations happen when the world gets quiet and hearts get loud.",
  "Being together isn't about doing everything; it's about being everything to each other.",
  "In the silence of shared presence, we find the loudest expressions of love.",
  "Every moment of genuine attention is a love letter written in time.",
  "The most beautiful thing about love is how it multiplies when we're fully present.",
  "True connection happens when we stop performing and start being.",
  "The greatest luxury in modern life is someone's undivided attention.",
  "When we choose presence, we choose to see the miracle in ordinary moments.",
  "Love is spelled T-I-M-E, and time is spelled P-R-E-S-E-N-C-E.",
  "The heart speaks clearest when the world grows quiet around us.",
  "In every moment we're fully present, we create a memory that lasts forever.",
];

export function getDailyQuote(): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}