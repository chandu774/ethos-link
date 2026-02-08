export interface MindsetQuestion {
  id: number;
  question: string;
  options: {
    text: string;
    traits: Partial<MindsetTraits>;
  }[];
}

export interface MindsetTraits {
  analytical: number;
  creative: number;
  emotional: number;
  logical: number;
  risk_taking: number;
  collaborative: number;
}

export const mindsetQuestions: MindsetQuestion[] = [
  {
    id: 1,
    question: "When faced with a complex problem, what's your first instinct?",
    options: [
      { text: "Break it down into smaller, logical steps", traits: { analytical: 20, logical: 15 } },
      { text: "Brainstorm creative solutions", traits: { creative: 20, risk_taking: 10 } },
      { text: "Consider how it affects the people involved", traits: { emotional: 20, collaborative: 10 } },
      { text: "Look for patterns and data to analyze", traits: { analytical: 15, logical: 20 } },
    ],
  },
  {
    id: 2,
    question: "In a team project, which role do you naturally take?",
    options: [
      { text: "The one who organizes and plans everything", traits: { logical: 15, analytical: 15 } },
      { text: "The creative one who comes up with new ideas", traits: { creative: 20, risk_taking: 10 } },
      { text: "The mediator who ensures everyone works together", traits: { collaborative: 20, emotional: 15 } },
      { text: "The leader who makes final decisions", traits: { risk_taking: 15, logical: 10 } },
    ],
  },
  {
    id: 3,
    question: "How do you prefer to make important decisions?",
    options: [
      { text: "Analyze all available data thoroughly", traits: { analytical: 20, logical: 15 } },
      { text: "Trust my gut feeling", traits: { emotional: 20, risk_taking: 10 } },
      { text: "Consult with others and gather opinions", traits: { collaborative: 20, emotional: 10 } },
      { text: "Weigh pros and cons systematically", traits: { logical: 20, analytical: 10 } },
    ],
  },
  {
    id: 4,
    question: "When learning something new, you prefer:",
    options: [
      { text: "Reading documentation and structured tutorials", traits: { logical: 15, analytical: 15 } },
      { text: "Experimenting and figuring it out yourself", traits: { creative: 15, risk_taking: 15 } },
      { text: "Learning with a group or mentor", traits: { collaborative: 20, emotional: 10 } },
      { text: "Watching videos and visual demonstrations", traits: { creative: 15, emotional: 10 } },
    ],
  },
  {
    id: 5,
    question: "How do you handle unexpected changes to your plans?",
    options: [
      { text: "Adapt quickly and see it as an opportunity", traits: { risk_taking: 20, creative: 10 } },
      { text: "Analyze the impact before deciding next steps", traits: { analytical: 20, logical: 10 } },
      { text: "Discuss with others to find the best approach", traits: { collaborative: 20, emotional: 10 } },
      { text: "Feel stressed but work through it methodically", traits: { logical: 15, emotional: 10 } },
    ],
  },
  {
    id: 6,
    question: "What motivates you most in your work?",
    options: [
      { text: "Solving complex problems and challenges", traits: { analytical: 20, logical: 10 } },
      { text: "Creating something new and innovative", traits: { creative: 25, risk_taking: 5 } },
      { text: "Making a positive impact on people", traits: { emotional: 20, collaborative: 15 } },
      { text: "Achieving measurable goals and milestones", traits: { logical: 15, analytical: 15 } },
    ],
  },
  {
    id: 7,
    question: "When in a disagreement, you typically:",
    options: [
      { text: "Present logical arguments and evidence", traits: { logical: 20, analytical: 10 } },
      { text: "Try to understand the other person's perspective", traits: { emotional: 20, collaborative: 15 } },
      { text: "Propose creative compromises", traits: { creative: 15, collaborative: 15 } },
      { text: "Stand firm on your position if you believe you're right", traits: { risk_taking: 15, logical: 10 } },
    ],
  },
  {
    id: 8,
    question: "Your ideal work environment is:",
    options: [
      { text: "Quiet, structured, with clear processes", traits: { logical: 15, analytical: 15 } },
      { text: "Dynamic, flexible, with room for innovation", traits: { creative: 20, risk_taking: 10 } },
      { text: "Collaborative, with lots of team interaction", traits: { collaborative: 25, emotional: 10 } },
      { text: "Results-driven, with measurable outcomes", traits: { analytical: 15, logical: 10 } },
    ],
  },
  {
    id: 9,
    question: "How do you approach taking risks?",
    options: [
      { text: "I embrace risks as opportunities for growth", traits: { risk_taking: 25, creative: 5 } },
      { text: "I carefully calculate risks before acting", traits: { analytical: 20, logical: 15 } },
      { text: "I prefer to minimize risks whenever possible", traits: { logical: 10, emotional: 10 } },
      { text: "I consider how risks might affect others", traits: { emotional: 15, collaborative: 15 } },
    ],
  },
  {
    id: 10,
    question: "When working on a creative project, you:",
    options: [
      { text: "Start with a detailed plan and structure", traits: { logical: 15, analytical: 15 } },
      { text: "Dive in and let ideas flow naturally", traits: { creative: 25, risk_taking: 10 } },
      { text: "Collaborate with others for inspiration", traits: { collaborative: 20, creative: 10 } },
      { text: "Research extensively before starting", traits: { analytical: 20, logical: 10 } },
    ],
  },
  {
    id: 11,
    question: "How do you handle criticism of your work?",
    options: [
      { text: "Analyze it objectively for valid points", traits: { analytical: 20, logical: 15 } },
      { text: "Take it personally at first but learn from it", traits: { emotional: 20, creative: 5 } },
      { text: "Discuss it with the critic to understand better", traits: { collaborative: 20, emotional: 10 } },
      { text: "Use it as motivation to improve", traits: { risk_taking: 10, creative: 10 } },
    ],
  },
  {
    id: 12,
    question: "What's your approach to long-term planning?",
    options: [
      { text: "Create detailed roadmaps with milestones", traits: { logical: 20, analytical: 15 } },
      { text: "Have a vision but stay flexible on the path", traits: { creative: 15, risk_taking: 15 } },
      { text: "Involve others in shaping the plan", traits: { collaborative: 20, emotional: 10 } },
      { text: "Focus on immediate goals that lead to bigger ones", traits: { analytical: 15, logical: 10 } },
    ],
  },
];

export const defaultMindsetTraits: MindsetTraits = {
  analytical: 50,
  creative: 50,
  emotional: 50,
  logical: 50,
  risk_taking: 50,
  collaborative: 50,
};

export function calculateMindsetFromAnswers(answers: number[]): MindsetTraits {
  const traits: MindsetTraits = { ...defaultMindsetTraits };
  
  answers.forEach((answerIndex, questionIndex) => {
    const question = mindsetQuestions[questionIndex];
    if (question && question.options[answerIndex]) {
      const selectedTraits = question.options[answerIndex].traits;
      Object.entries(selectedTraits).forEach(([trait, value]) => {
        const traitKey = trait as keyof MindsetTraits;
        traits[traitKey] = Math.min(100, Math.max(0, traits[traitKey] + (value || 0)));
      });
    }
  });
  
  // Normalize traits to be between 0 and 100
  Object.keys(traits).forEach((key) => {
    const traitKey = key as keyof MindsetTraits;
    traits[traitKey] = Math.min(100, Math.max(0, traits[traitKey]));
  });
  
  return traits;
}
