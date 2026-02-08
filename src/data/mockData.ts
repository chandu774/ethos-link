export const communities = [
  {
    id: "gaming",
    name: "Gaming",
    icon: "🎮",
    color: "from-violet-500 to-purple-600",
    members: 12453,
    description: "Connect with fellow gamers and find your squad",
  },
  {
    id: "food",
    name: "Food & Cooking",
    icon: "🍳",
    color: "from-orange-500 to-red-500",
    members: 8921,
    description: "Share recipes and discover food enthusiasts",
  },
  {
    id: "fashion",
    name: "Fashion",
    icon: "👗",
    color: "from-pink-500 to-rose-500",
    members: 6734,
    description: "Style inspiration and fashion-forward connections",
  },
  {
    id: "fitness",
    name: "Fitness",
    icon: "💪",
    color: "from-green-500 to-emerald-600",
    members: 9876,
    description: "Find workout buddies and fitness motivation",
  },
  {
    id: "travel",
    name: "Travel",
    icon: "✈️",
    color: "from-sky-500 to-blue-600",
    members: 11234,
    description: "Explore the world with like-minded travelers",
  },
  {
    id: "music",
    name: "Music",
    icon: "🎵",
    color: "from-indigo-500 to-violet-600",
    members: 15678,
    description: "Share beats and find your musical tribe",
  },
  {
    id: "art",
    name: "Art & Design",
    icon: "🎨",
    color: "from-amber-500 to-orange-600",
    members: 7543,
    description: "Creative minds and visual storytellers",
  },
  {
    id: "tech",
    name: "Tech Enthusiasts",
    icon: "💻",
    color: "from-cyan-500 to-teal-600",
    members: 18932,
    description: "Gadgets, coding, and innovation lovers",
  },
];

export const currentUser = {
  id: "1",
  name: "Alex Chen",
  email: "alex@example.com",
  trustScore: 78,
  category: "Professional" as "Professional" | "Personal",
  joinedCommunities: ["gaming", "tech", "music"],
  mindsetTraits: [
    { name: "Curiosity", value: 85 },
    { name: "Depth", value: 72 },
    { name: "Risk", value: 58 },
    { name: "Empathy", value: 91 },
  ],
};

export const matchSuggestions = [
  {
    id: "2",
    username: "Maya Rodriguez",
    similarity: 87,
    trustScore: 82,
    community: "gaming",
  },
  {
    id: "3",
    username: "James Wu",
    similarity: 74,
    trustScore: 91,
    community: "tech",
  },
  {
    id: "4",
    username: "Sarah Kim",
    similarity: 69,
    trustScore: 76,
    community: "music",
  },
];

export const connections = [
  {
    id: "5",
    username: "David Park",
    trustScore: 88,
    connectedAt: "2024-01-15",
    lastMessage: "Looking forward to our collaboration!",
    community: "tech",
  },
  {
    id: "6",
    username: "Emma Wilson",
    trustScore: 79,
    connectedAt: "2024-01-10",
    lastMessage: "Thanks for the insights on the project.",
    community: "gaming",
  },
  {
    id: "7",
    username: "Michael Brown",
    trustScore: 85,
    connectedAt: "2024-01-05",
    lastMessage: "Let's sync next week.",
  },
];

export const aiMessages = [
  {
    id: "1",
    role: "assistant" as const,
    content: "Hello! I'm here to understand how you think and what drives you. Let's have a conversation that goes beyond surface-level interests. What's a problem you've been thinking about lately?",
  },
];
