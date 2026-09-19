export interface DemoChapter {
  id: string;
  timestamp: string;
  seconds: number;
  title: string;
  conceptTag: string;
}

export interface DemoTranscriptItem {
  id: string;
  time: string;
  seconds: number;
  speaker: string;
  text: string;
}

export interface DemoLecture {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  title: string;
  instructor: string;
  duration: string;
  durationSeconds: number;
  videoUrl: string;
  signLanguageVideoUrl: string;
  thumbnail: string;
  summary: string;
  keyPoints: string[];
  chapters: DemoChapter[];
  transcript: DemoTranscriptItem[];
}

export interface DemoQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  conceptTag: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface DemoQuiz {
  id: string;
  courseId: string;
  courseCode: string;
  title: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionsCount: number;
  estimatedMinutes: number;
  questions: DemoQuizQuestion[];
}

export interface ConceptMasteryItem {
  id: string;
  courseCode: string;
  name: string;
  category: string;
  mastery: number; // 0 to 100
  status: 'mastered' | 'improving' | 'gap';
  trend: 'up' | 'stable' | 'down';
  description: string;
  rules: string[];
  lectureTimestamp?: { lectureId: string; time: string; seconds: number };
  relatedNotesId?: string;
  practiceCount: number;
}

export interface DemoRecommendation {
  id: string;
  courseCode: string;
  title: string;
  type: 'review' | 'assignment' | 'recover_lecture' | 'quiz' | 'practice';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedMinutes: number;
  reason: string;
  whyDetails: {
    signals: string[];
    riskFactor: string;
    gain: string;
  };
  actionLabel: string;
  actionUrl: string;
  completed: boolean;
}

export interface DemoOpportunity {
  id: string;
  title: string;
  organization: string;
  type: 'scholarship' | 'mentorship' | 'internship' | 'fellowship';
  award: string;
  deadline: string;
  matchScore: number;
  whyMatch: string[];
  tags: string[];
  description: string;
}

export interface DemoCourse {
  id: string;
  code: string;
  name: string;
  instructor: string;
  department: string;
  semester: string;
  attendanceRate: number;
  missedClassesCount: number;
  overallMastery: number;
  color: string;
  totalLectures: number;
  pendingAssignments: number;
}

export const DEMO_COURSES: DemoCourse[] = [
  {
    id: "course-dbms",
    code: "CS301",
    name: "Database Management Systems",
    instructor: "Dr. Aris Thorne",
    department: "Computer Science & Engineering",
    semester: "Fall 2026",
    attendanceRate: 78,
    missedClassesCount: 1,
    overallMastery: 71,
    color: "from-blue-600 to-indigo-600",
    totalLectures: 14,
    pendingAssignments: 1,
  },
  {
    id: "course-os",
    code: "CS302",
    name: "Operating Systems",
    instructor: "Prof. Elena Vance",
    department: "Computer Science & Engineering",
    semester: "Fall 2026",
    attendanceRate: 85,
    missedClassesCount: 0,
    overallMastery: 76,
    color: "from-emerald-600 to-teal-600",
    totalLectures: 12,
    pendingAssignments: 1,
  },
  {
    id: "course-cn",
    code: "CS303",
    name: "Computer Networks",
    instructor: "Dr. Marcus Brody",
    department: "Computer Science & Engineering",
    semester: "Fall 2026",
    attendanceRate: 90,
    missedClassesCount: 0,
    overallMastery: 82,
    color: "from-violet-600 to-purple-600",
    totalLectures: 10,
    pendingAssignments: 0,
  },
  {
    id: "course-ml",
    code: "CS304",
    name: "Machine Learning & AI Foundations",
    instructor: "Prof. Sarah Lin",
    department: "Artificial Intelligence",
    semester: "Fall 2026",
    attendanceRate: 94,
    missedClassesCount: 0,
    overallMastery: 86,
    color: "from-amber-500 to-orange-600",
    totalLectures: 16,
    pendingAssignments: 1,
  },
];

export const DEMO_CONCEPTS: ConceptMasteryItem[] = [
  // CS301 DBMS
  {
    id: "c-sql",
    courseCode: "CS301",
    name: "SQL Queries & Aggregations",
    category: "Databases",
    mastery: 91,
    status: "mastered",
    trend: "up",
    description: "Multi-table joins, subqueries, group by, having clauses, and window functions.",
    rules: [
      "Aggregation requires GROUP BY on all unaggregated SELECT columns.",
      "HAVING filters groups post-aggregation; WHERE filters pre-aggregation.",
    ],
    practiceCount: 14,
  },
  {
    id: "c-fd",
    courseCode: "CS301",
    name: "Functional Dependencies",
    category: "Databases",
    mastery: 82,
    status: "mastered",
    trend: "stable",
    description: "Constraint between two sets of attributes: X -> Y determines Y uniquely for every X.",
    rules: [
      "Armstrong axioms: Reflexivity, Augmentation, and Transitivity.",
      "Attribute closure X+ determines candidate keys.",
    ],
    practiceCount: 9,
  },
  {
    id: "c-2nf",
    courseCode: "CS301",
    name: "Second Normal Form (2NF)",
    category: "Databases",
    mastery: 46,
    status: "gap",
    trend: "down",
    description: "A relation is in 2NF if it is in 1NF and no non-prime attribute is partially dependent on any candidate key.",
    rules: [
      "Must first satisfy 1NF (atomic values, no repeating groups).",
      "Eliminate Partial Dependency: no non-key attribute can depend on a SUBSET of a composite primary key.",
      "Remedy: Decompose into separate tables so non-key attributes depend on the entire candidate key.",
    ],
    lectureTimestamp: { lectureId: "lec-dbms-norm", time: "19:42", seconds: 1182 },
    practiceCount: 4,
  },
  {
    id: "c-3nf",
    courseCode: "CS301",
    name: "Third Normal Form (3NF)",
    category: "Databases",
    mastery: 51,
    status: "improving",
    trend: "up",
    description: "A relation is in 3NF if it is in 2NF and has no transitive dependencies for non-prime attributes.",
    rules: [
      "For every functional dependency X -> A: either X is a superkey OR A is a prime attribute.",
      "No non-key attribute determines another non-key attribute (transitive dependency).",
    ],
    lectureTimestamp: { lectureId: "lec-dbms-norm", time: "27:18", seconds: 1638 },
    practiceCount: 6,
  },
  {
    id: "c-bcnf",
    courseCode: "CS301",
    name: "Boyce-Codd Normal Form (BCNF)",
    category: "Databases",
    mastery: 70,
    status: "improving",
    trend: "up",
    description: "Stricter than 3NF: for every non-trivial functional dependency X -> Y, X must be a superkey.",
    rules: [
      "Eliminates all redundancy arising from functional dependencies.",
      "May not always preserve dependencies upon decomposition.",
    ],
    lectureTimestamp: { lectureId: "lec-dbms-norm", time: "34:50", seconds: 2090 },
    practiceCount: 5,
  },
  {
    id: "c-acid",
    courseCode: "CS301",
    name: "ACID & Transactions",
    category: "Databases",
    mastery: 83,
    status: "mastered",
    trend: "up",
    description: "Atomicity, Consistency, Isolation, and Durability guarantees in concurrency.",
    rules: [
      "Two-Phase Locking (2PL) guarantees serializability.",
      "WAL (Write-Ahead Logging) ensures Durability and recovery.",
    ],
    practiceCount: 11,
  },

  // CS302 OS
  {
    id: "c-sched",
    courseCode: "CS302",
    name: "CPU Scheduling Algorithms",
    category: "Operating Systems",
    mastery: 88,
    status: "mastered",
    trend: "up",
    description: "FCFS, SJF, Priority, Round Robin, and Multi-Level Feedback Queues.",
    rules: [
      "Round Robin fairness depends directly on time quantum sizing.",
      "SJF gives optimal average waiting time but requires burst prediction.",
    ],
    practiceCount: 10,
  },
  {
    id: "c-vm",
    courseCode: "CS302",
    name: "Virtual Memory & Paging",
    category: "Operating Systems",
    mastery: 52,
    status: "gap",
    trend: "down",
    description: "Page tables, TLB hits/misses, page fault handling, and page replacement policies.",
    rules: [
      "TLB caching accelerates virtual-to-physical address translation.",
      "Page Fault triggers OS interrupt, disk I/O, frame allocation, and table update.",
    ],
    practiceCount: 3,
  },
  {
    id: "c-deadlock",
    courseCode: "CS302",
    name: "Deadlocks & Bankers Algorithm",
    category: "Operating Systems",
    mastery: 78,
    status: "improving",
    trend: "up",
    description: "Mutual exclusion, hold and wait, no preemption, and circular wait conditions.",
    rules: [
      "Bankers algorithm calculates safe states before resource grant.",
      "Resource allocation graphs with cycles imply deadlock under single-instance resources.",
    ],
    practiceCount: 7,
  },
];

export const DEMO_LECTURES: DemoLecture[] = [
  {
    id: "lec-dbms-norm",
    courseId: "course-dbms",
    courseCode: "CS301",
    courseName: "Database Management Systems",
    title: "Lecture 4: Database Normalization & Anomaly Elimination",
    instructor: "Dr. Aris Thorne",
    duration: "42:15",
    durationSeconds: 2535,
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    signLanguageVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&q=80",
    summary: "Comprehensive guide to relational normalization. Explores update, insertion, and deletion anomalies, followed by progressive decomposition through 1NF, 2NF, 3NF, and BCNF with step-by-step schema examples.",
    keyPoints: [
      "Unnormalized schemas cause update, insert, and delete anomalies.",
      "1NF requires scalar atomic attributes; no repeated multivalued columns.",
      "2NF eliminates Partial Dependency on composite candidate keys.",
      "3NF eliminates Transitive Dependency where non-key determines non-key.",
      "BCNF enforces that the determinant in every functional dependency is a superkey.",
    ],
    chapters: [
      { id: "ch-1", timestamp: "00:00", seconds: 0, title: "Overview of Anomalies in Relational Design", conceptTag: "Functional Dependencies" },
      { id: "ch-2", timestamp: "12:35", seconds: 755, title: "First Normal Form (1NF) & Atomicity", conceptTag: "1NF" },
      { id: "ch-3", timestamp: "19:42", seconds: 1182, title: "Second Normal Form (2NF) & Partial Dependencies", conceptTag: "2NF" },
      { id: "ch-4", timestamp: "27:18", seconds: 1638, title: "Third Normal Form (3NF) & Transitivity", conceptTag: "3NF" },
      { id: "ch-5", timestamp: "34:50", seconds: 2090, title: "Boyce-Codd Normal Form (BCNF)", conceptTag: "BCNF" },
    ],
    transcript: [
      { id: "t-1", time: "00:05", seconds: 5, speaker: "Dr. Aris Thorne", text: "Welcome back everyone. Today we are addressing the single most important architectural topic in relational systems: Normalization." },
      { id: "t-2", time: "01:20", seconds: 80, speaker: "Dr. Aris Thorne", text: "When we design tables without proper constraints, we end up storing redundant data. This leads to update anomalies, insertion anomalies, and deletion anomalies." },
      { id: "t-3", time: "12:35", seconds: 755, speaker: "Dr. Aris Thorne", text: "Let us inspect First Normal Form. A table is in 1NF if and only if each attribute contains only atomic values and there are no repeating groups." },
      { id: "t-4", time: "19:42", seconds: 1182, speaker: "Dr. Aris Thorne", text: "Now pay close attention to 2NF: Second Normal Form. A table is in 2NF if it satisfies 1NF AND no non-prime attribute is partially dependent on any candidate key." },
      { id: "t-5", time: "22:15", seconds: 1335, speaker: "Dr. Aris Thorne", text: "If you have a composite primary key like (StudentID, CourseID), but CourseName depends solely on CourseID, that is a Partial Dependency. You must decompose it!" },
      { id: "t-6", time: "27:18", seconds: 1638, speaker: "Dr. Aris Thorne", text: "Third Normal Form, or 3NF, deals with transitive dependencies: where attribute A determines B, and B determines C, meaning A indirectly determines C." },
      { id: "t-7", time: "34:50", seconds: 2090, speaker: "Dr. Aris Thorne", text: "Finally, BCNF is an even stricter version. Every determinant in your functional dependencies MUST be a candidate key." },
      { id: "t-8", time: "40:10", seconds: 2410, speaker: "Dr. Aris Thorne", text: "Remember to complete Assignment 3 and review the normalization worksheet before Friday's quiz." },
    ],
  },
  {
    id: "lec-os-vm",
    courseId: "course-os",
    courseCode: "CS302",
    courseName: "Operating Systems",
    title: "Lecture 8: Virtual Memory & Multi-Level Paging",
    instructor: "Prof. Elena Vance",
    duration: "38:40",
    durationSeconds: 2320,
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    signLanguageVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    summary: "Deep dive into virtual memory management, translation lookaside buffers (TLB), inverted page tables, and LRU page replacement mechanics.",
    keyPoints: [
      "Virtual memory separates logical address space from physical RAM.",
      "Multi-level page tables conserve memory for sparse address spaces.",
      "TLB cache misses incur multi-cycle page table walks in hardware.",
      "Thrashing occurs when high page fault frequency stalls CPU processing.",
    ],
    chapters: [
      { id: "ch-os-1", timestamp: "00:00", seconds: 0, title: "Motivation for Virtual Memory", conceptTag: "Virtual Memory" },
      { id: "ch-os-2", timestamp: "11:20", seconds: 680, title: "Address Translation & TLB Structure", conceptTag: "TLB" },
      { id: "ch-os-3", timestamp: "21:05", seconds: 1265, title: "Page Fault Flowchart & Interrupt Handling", conceptTag: "Page Fault" },
      { id: "ch-os-4", timestamp: "30:45", seconds: 1845, title: "Page Replacement: FIFO, LRU, & Clock", conceptTag: "Page Replacement" },
    ],
    transcript: [
      { id: "t-os-1", time: "00:10", seconds: 10, speaker: "Prof. Elena Vance", text: "Good morning class. Today we dissect virtual memory: the architectural magic that makes processes believe they possess boundless contiguous RAM." },
      { id: "t-os-2", time: "11:20", seconds: 680, speaker: "Prof. Elena Vance", text: "Look at the Translation Lookaside Buffer. Without the TLB, every single memory reference would require two or four memory accesses just to locate the frame." },
      { id: "t-os-3", time: "21:05", seconds: 1265, speaker: "Prof. Elena Vance", text: "When a valid page is not present in RAM, the MMU triggers a Page Fault trap. The operating system pauses the process, initiates a disk read, and loads the frame." },
    ],
  },
];

export const DEMO_QUIZZES: DemoQuiz[] = [
  {
    id: "quiz-norm-mastery",
    courseId: "course-dbms",
    courseCode: "CS301",
    title: "DBMS Normalization Concept Check",
    topic: "Functional Dependencies, 2NF, 3NF & BCNF",
    difficulty: "medium",
    questionsCount: 5,
    estimatedMinutes: 10,
    questions: [
      {
        id: "q-1",
        question: "In a relation R(A, B, C, D) with composite primary key (A, B), the functional dependency B -> C exists. Which normal form is violated?",
        options: [
          "1NF",
          "2NF (Partial Dependency)",
          "3NF only",
          "None; it satisfies BCNF",
        ],
        correctIndex: 1,
        explanation: "Attribute C depends on B, which is a proper subset of the composite candidate key (A, B). This is a partial dependency, which directly violates Second Normal Form (2NF).",
        conceptTag: "2NF",
        difficulty: "medium",
      },
      {
        id: "q-2",
        question: "What is the key prerequisite for a table before evaluating Second Normal Form (2NF)?",
        options: [
          "It must already be in 1NF with atomic attributes and no repeating groups.",
          "It must have at least one foreign key.",
          "It must contain no null values anywhere.",
          "It must be decomposed into 3 separate tables.",
        ],
        correctIndex: 0,
        explanation: "2NF strictly requires the table to first satisfy 1NF. Normalization is hierarchical.",
        conceptTag: "2NF",
        difficulty: "easy",
      },
      {
        id: "q-3",
        question: "If relation R(StudentID, CourseID, ProfessorID, ProfessorOffice) has key (StudentID, CourseID) and dependencies (StudentID, CourseID) -> ProfessorID and ProfessorID -> ProfessorOffice, which anomaly is present?",
        options: [
          "Partial dependency violating 2NF",
          "Transitive dependency violating 3NF",
          "Multi-valued dependency violating 4NF",
          "Lossy decomposition error",
        ],
        correctIndex: 1,
        explanation: "The primary key determines ProfessorID, which in turn determines ProfessorOffice (non-key -> non-key). This transitive dependency violates 3NF.",
        conceptTag: "3NF",
        difficulty: "medium",
      },
      {
        id: "q-4",
        question: "Which condition guarantees that a relation is in Boyce-Codd Normal Form (BCNF)?",
        options: [
          "Every non-prime attribute is independent.",
          "For every non-trivial functional dependency X -> Y, X must be a superkey.",
          "No attributes contain multi-valued sets.",
          "All functional dependencies are reflexive.",
        ],
        correctIndex: 1,
        explanation: "BCNF states that for every non-trivial dependency X -> Y, the determinant X must be a candidate/super key.",
        conceptTag: "BCNF",
        difficulty: "hard",
      },
      {
        id: "q-5",
        question: "Which Armstrong axiom states: If X -> Y, then XZ -> YZ for any set of attributes Z?",
        options: [
          "Reflexivity",
          "Transitivity",
          "Augmentation",
          "Decomposition",
        ],
        correctIndex: 2,
        explanation: "Augmentation rule: augmenting both sides of a valid dependency with attribute set Z preserves validity.",
        conceptTag: "Functional Dependencies",
        difficulty: "easy",
      },
    ],
  },
  {
    id: "quiz-2nf-targeted",
    courseId: "course-dbms",
    courseCode: "CS301",
    title: "Targeted 2NF Recovery Checkpoint",
    topic: "Partial Dependencies Elimination",
    difficulty: "medium",
    questionsCount: 3,
    estimatedMinutes: 5,
    questions: [
      {
        id: "q-2nf-1",
        question: "A relation with a single-attribute primary key is automatically in 2NF if it satisfies 1NF. True or False?",
        options: [
          "True, because a single attribute cannot have proper non-empty subsets.",
          "False, partial dependencies can still exist with single keys.",
          "False, 2NF requires at least two candidate keys.",
          "True only if no foreign keys exist.",
        ],
        correctIndex: 0,
        explanation: "Correct! Partial dependency requires a composite key. If the primary key consists of only one column, no proper subset can exist, so it is automatically in 2NF.",
        conceptTag: "2NF",
        difficulty: "medium",
      },
      {
        id: "q-2nf-2",
        question: "How do you eliminate a partial dependency during normalization?",
        options: [
          "Combine all tables into one single wide table.",
          "Decompose the table: Move the partially dependent attributes along with the partial key subset into a new table.",
          "Convert all integer columns into string types.",
          "Add synthetic surrogate keys without changing relationships.",
        ],
        correctIndex: 1,
        explanation: "Decomposition: place the determinant and its dependent attributes in a separate relation, preserving relationships via foreign keys.",
        conceptTag: "2NF",
        difficulty: "easy",
      },
      {
        id: "q-2nf-3",
        question: "Given Orders(OrderID, ProductID, Quantity, ProductName, UnitPrice). Keys: (OrderID, ProductID). Which attributes cause 2NF violation?",
        options: [
          "Quantity",
          "ProductName and UnitPrice (they depend solely on ProductID)",
          "OrderID alone",
          "No attributes violate 2NF",
        ],
        correctIndex: 1,
        explanation: "ProductName and UnitPrice are attributes of Product, depending only on ProductID rather than the composite (OrderID, ProductID).",
        conceptTag: "2NF",
        difficulty: "medium",
      },
    ],
  },
];

export const DEMO_RECOMMENDATIONS: DemoRecommendation[] = [
  {
    id: "rec-1",
    courseCode: "CS301",
    title: "DBMS — Review 2NF Concepts",
    type: "review",
    priority: "HIGH",
    estimatedMinutes: 20,
    reason: "Your last two assessments show persistent difficulty with 2NF (current mastery: 46%). Next DBMS assessment is in 2 days.",
    whyDetails: {
      signals: [
        "Quiz attempt 'DBMS Normalization' scored 46% on 2NF questions.",
        "You missed the live segment of Lecture 4 covering Partial Dependencies.",
        "Upcoming quiz on Friday heavily weights 2NF schema decomposition.",
      ],
      riskFactor: "High exam risk: 2NF is a prerequisite for understanding 3NF and BCNF.",
      gain: "+28% projected mastery boost after reviewing the 15-minute clip & targeted quiz.",
    },
    actionLabel: "Start Learning",
    actionUrl: "/my-learning?concept=c-2nf",
    completed: false,
  },
  {
    id: "rec-2",
    courseCode: "CS301",
    title: "DBMS Assignment 3: Relational Decomposition",
    type: "assignment",
    priority: "HIGH",
    estimatedMinutes: 30,
    reason: "Due tomorrow at 11:59 PM. Worth 8% of your course grade.",
    whyDetails: {
      signals: [
        "Assignment posted 3 days ago, deadline in 24 hours.",
        "Estimated completion time: 30-45 minutes.",
        "Matches recently taught Normalization concepts.",
      ],
      riskFactor: "Late submission penalty: -10% per 24 hours.",
      gain: "Secures 8 course grade points and solidifies schema design.",
    },
    actionLabel: "Continue Assignment",
    actionUrl: "/assignments",
    completed: false,
  },
  {
    id: "rec-3",
    courseCode: "CS302",
    title: "OS — Recover Missed Virtual Memory Lecture",
    type: "recover_lecture",
    priority: "MEDIUM",
    estimatedMinutes: 15,
    reason: "You were absent from yesterday's class on Virtual Memory Paging. 15-min recovery plan ready.",
    whyDetails: {
      signals: [
        "Attendance marked 'absent' for CS302 on Sept 17.",
        "Class topic: Multi-level Paging & TLB translation.",
        "Curated 15-minute core clip generated by Synapse AI.",
      ],
      riskFactor: "Accumulating knowledge gaps in OS will affect next week's lab exam.",
      gain: "Closes the 52% Virtual Memory gap before lab session.",
    },
    actionLabel: "Catch Up (15m)",
    actionUrl: "/attendance-recovery",
    completed: false,
  },
  {
    id: "rec-4",
    courseCode: "CS303",
    title: "CN — Subnetting & CIDR Practice Checkpoint",
    type: "practice",
    priority: "LOW",
    estimatedMinutes: 15,
    reason: "Optional practice to maintain 80%+ mastery before Midterm next week.",
    whyDetails: {
      signals: [
        "Current mastery: 80% (Stable).",
        "Midterm covers Variable-Length Subnet Masking (VLSM).",
      ],
      riskFactor: "Low risk, refresher practice.",
      gain: "Reinforces speed on binary masking calculations.",
    },
    actionLabel: "Practice Now",
    actionUrl: "/assessments",
    completed: false,
  },
];

export const DEMO_MISSED_CLASS = {
  courseCode: "CS301",
  courseName: "Database Management Systems",
  instructor: "Dr. Aris Thorne",
  date: "Yesterday, Sept 17",
  topic: "Database Normalization & Dependency Preserving Decomposition",
  missedConcepts: ["1NF Atomicity", "2NF Partial Dependencies", "3NF Transitive Dependencies"],
  totalCatchupMinutes: 30,
  resources: [
    { type: "lecture", title: "15-min Core Lecture Segment (19:42 - 34:50)", url: "/lectures/lec-dbms-norm?t=1182" },
    { type: "notes", title: "Dr. Thorne's Normalization Lecture Notes (PDF summary)", url: "/notes" },
    { type: "quiz", title: "3-Question Recovery Checkpoint", url: "/assessments/quiz-2nf-targeted" },
  ],
  status: "pending",
};

export const DEMO_OPPORTUNITIES: DemoOpportunity[] = [
  {
    id: "opp-1",
    title: "Google Generation Scholarship for Computer Science",
    organization: "Google Education",
    type: "scholarship",
    award: ",000 Tuition Award + Google Mentorship",
    deadline: "Dec 15, 2026",
    matchScore: 94,
    whyMatch: [
      "Matches your Computer Science undergraduate major (Junior year).",
      "High academic standing (Cumulative GPA: 3.82 / 4.0).",
      "Demonstrated focus on Database Systems & Inclusive Software.",
    ],
    tags: ["Undergraduate", "Merit & Leadership", "Global Tech"],
    description: "Awarded to students who exemplify leadership and address barriers in computer science. Includes access to Google Scholar retreats and engineering mentors.",
  },
  {
    id: "opp-2",
    title: "ACM SIGMOD Undergraduate Research Fellowship",
    organization: "ACM Special Interest Group on Management of Data",
    type: "fellowship",
    award: ",500 Research Stipend + Conference Travel",
    deadline: "Jan 20, 2027",
    matchScore: 89,
    whyMatch: [
      "Direct match for your strong interest in Relational Databases and Concurrency.",
      "Requires completed coursework in Data Structures and DBMS (in progress with 78%+ score).",
    ],
    tags: ["Research", "Databases", "Conference Presentation"],
    description: "Provides seed funding for undergraduates conducting original research in high-performance database management systems, query optimization, or storage engines.",
  },
  {
    id: "opp-3",
    title: "Palantir Inclusive Tech Mentorship Program",
    organization: "Palantir Technologies",
    type: "mentorship",
    award: "1:1 Staff Engineer Mentorship + Early Interview Fast-Track",
    deadline: "Nov 30, 2026",
    matchScore: 91,
    whyMatch: [
      "Matches career aspirations in Full-Stack Engineering and Applied AI.",
      "Rewards active project collaboration and open study community participation.",
    ],
    tags: ["Mentorship", "Career Acceleration", "Software Engineering"],
    description: "6-month structured engineering mentorship paired with senior architects, focusing on systems design, distributed data platforms, and career readiness.",
  },
  {
    id: "opp-4",
    title: "IEEE Computer Society Student Travel Grant",
    organization: "IEEE Computer Society",
    type: "scholarship",
    award: ",800 Travel Stipend",
    deadline: "Feb 10, 2027",
    matchScore: 82,
    whyMatch: [
      "Eligible through university student chapter membership.",
      "Matches coursework in Computer Networks and Operating Systems.",
    ],
    tags: ["Travel Grant", "Networking", "Academic Conferences"],
    description: "Supports students traveling to premier computing symposiums to present poster sessions or participate in student hackathons.",
  },
];

export const DEMO_FACULTY_INSIGHTS = {
  courseCode: "CS301",
  courseName: "Database Management Systems",
  totalStudents: 62,
  doingWellCount: 41,
  monitoringCount: 14,
  interventionCount: 7,
  topicDifficulty: [
    { topic: "SQL & Joins", mastery: 84, status: "healthy" },
    { topic: "Transactions & ACID", mastery: 76, status: "healthy" },
    { topic: "Indexing & B-Trees", mastery: 72, status: "monitoring" },
    { topic: "Functional Dependencies", mastery: 68, status: "monitoring" },
    { topic: "Database Normalization (2NF/3NF)", mastery: 53, status: "critical" },
  ],
  atRiskStudents: [
    { id: "s-1", name: "Alex Chen", riskLevel: "MODERATE", signals: ["2NF mastery at 46%", "Missed yesterday's class", "1 assignment due in 24h"], attendance: "78%" },
    { id: "s-2", name: "Jordan Taylor", riskLevel: "CRITICAL", signals: ["Missed 3 consecutive lectures", "Score < 40% on Normalization", "Inactivity for 5 days"], attendance: "64%" },
    { id: "s-3", name: "Samantha Reed", riskLevel: "MODERATE", signals: ["Attendance dropped 12%", "Failed Quiz 3 checkpoint"], attendance: "74%" },
    { id: "s-4", name: "Devon Miller", riskLevel: "CRITICAL", signals: ["2 overdue worksheets", "Functional Dependencies mastery 38%"], attendance: "68%" },
  ],
};

// ==================== CLASSROOM & FEED EXTENSIONS ====================

export interface ClassroomAnnouncement {
  id: string;
  classroomId: string;
  authorName: string;
  authorRole: 'teacher' | 'ta';
  date: string;
  title: string;
  content: string;
  type: 'announcement' | 'assignment_notice' | 'exam_notice' | 'resource';
  extractedTask?: {
    id: string;
    title: string;
    deadline: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    estimatedMinutes: number;
    isAddedToTasks: boolean;
  };
}

export interface ClassroomAssignment {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  topic: string;
  dueDate: string;
  dueDateTime: string;
  maxMarks: number;
  estimatedMinutes: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'assigned' | 'submitted' | 'graded';
  submission?: {
    submittedAt: string;
    text?: string;
    marksObtained?: number;
    feedback?: string;
  };
}

export interface ClassroomResource {
  id: string;
  classroomId: string;
  title: string;
  topic: string;
  type: 'Teacher Resource' | 'Student Shared Note';
  author: string;
  date: string;
  fileType: string;
  size: string;
  readTime: string;
}

export interface Classroom {
  id: string;
  name: string;
  code: string;
  section: string;
  academicYear: string;
  classCode: string; // e.g. DBMS3A26
  teacherName: string;
  description: string;
  studentsCount: number;
  assignmentsCount: number;
  upcomingCount: number;
  averagePerformance: number;
  color: string;
  announcements: ClassroomAnnouncement[];
  assignments: ClassroomAssignment[];
  resources: ClassroomResource[];
}

export interface LearningEvent {
  id: string;
  type: 'ATTENDED_CLASS' | 'MISSED_CLASS' | 'ASSIGNMENT_CREATED' | 'ASSIGNMENT_SUBMITTED' | 'QUIZ_COMPLETED' | 'CONCEPT_ASSESSED' | 'PRACTICE_COMPLETED';
  title: string;
  courseCode: string;
  timestamp: string;
  detail: string;
}

export const DEMO_CLASSROOMS: Classroom[] = [
  {
    id: 'cls-dbms-3a',
    name: 'Database Management Systems',
    code: 'CS301',
    section: 'CSE 3A',
    academicYear: '2026-27',
    classCode: 'DBMS3A26',
    teacherName: 'Dr. Aris Rao',
    description: 'Relational database schema decomposition, functional dependencies, normal forms (1NF through BCNF), and transaction concurrency control.',
    studentsCount: 62,
    assignmentsCount: 0,
    upcomingCount: 3,
    averagePerformance: 76,
    color: 'from-blue-600 via-indigo-600 to-indigo-800',
    announcements: [
      {
        id: 'ann-1',
        classroomId: 'cls-dbms-3a',
        authorName: 'Dr. Aris Rao',
        authorRole: 'teacher',
        date: 'Today, 9:15 AM',
        title: 'DBMS Assignment 3 & Normalization Checkpoint',
        content: 'Dear students, DBMS Assignment 3 is due Monday by 11:59 PM. Make sure to complete the decomposition exercises. Also, there will be an in-class quiz on normalization this Friday.',
        type: 'assignment_notice',
        extractedTask: {
          id: 'ext-ann-1',
          title: 'DBMS Assignment 3: Relational Decomposition',
          deadline: 'Monday, 11:59 PM',
          priority: 'HIGH',
          estimatedMinutes: 30,
          isAddedToTasks: true,
        },
      },
      {
        id: 'ann-2',
        classroomId: 'cls-dbms-3a',
        authorName: 'Dr. Aris Rao',
        authorRole: 'teacher',
        date: 'Yesterday',
        title: 'Lecture 14 Video & Sign Language Sync Uploaded',
        content: 'The recording for Lecture 14 covering 2NF and 3NF partial dependencies is now available in the Lectures tab with synchronized captions and ASL stream.',
        type: 'resource',
      },
    ],
    assignments: [],
    resources: [
      {
        id: 'res-1',
        classroomId: 'cls-dbms-3a',
        title: 'Official Slides: Normalization & Functional Dependencies',
        topic: 'Normalization',
        type: 'Teacher Resource',
        author: 'Dr. Aris Rao',
        date: '3 days ago',
        fileType: 'PDF',
        size: '2.8 MB',
        readTime: '15 min read',
      },
      {
        id: 'res-2',
        classroomId: 'cls-dbms-3a',
        title: 'Student Hand-written Notes: 2NF Partial Key Tricks',
        topic: 'Normalization',
        type: 'Student Shared Note',
        author: 'Maya Lin (Classmate)',
        date: 'Yesterday',
        fileType: 'Markdown',
        size: '420 KB',
        readTime: '8 min read',
      },
      {
        id: 'res-3',
        classroomId: 'cls-dbms-3a',
        title: 'ACID Concurrency Cheat Sheet',
        topic: 'Transactions',
        type: 'Teacher Resource',
        author: 'Dr. Aris Rao',
        date: '1 week ago',
        fileType: 'PDF',
        size: '1.1 MB',
        readTime: '10 min read',
      },
    ],
  },
  {
    id: 'cls-os-3a',
    name: 'Operating Systems',
    code: 'CS302',
    section: 'CSE 3A',
    academicYear: '2026-27',
    classCode: 'OS3A26',
    teacherName: 'Prof. Sarah Jenkins',
    description: 'Process scheduling, deadlocks, virtual memory management, TLB address translation, and file system architecture.',
    studentsCount: 58,
    assignmentsCount: 0,
    upcomingCount: 2,
    averagePerformance: 81,
    color: 'from-emerald-600 via-teal-600 to-teal-800',
    announcements: [
      {
        id: 'ann-os-1',
        classroomId: 'cls-os-3a',
        authorName: 'Prof. Sarah Jenkins',
        authorRole: 'teacher',
        date: '2 days ago',
        title: 'Virtual Memory Multi-level Paging Notes Posted',
        content: 'Review the multi-level page table diagram before next Wednesday lab. Lab quiz will cover TLB hit ratios.',
        type: 'announcement',
      },
    ],
    assignments: [],
    resources: [
      {
        id: 'res-os-1',
        classroomId: 'cls-os-3a',
        title: 'Virtual Memory & Address Translation Architecture',
        topic: 'Virtual Memory',
        type: 'Teacher Resource',
        author: 'Prof. Sarah Jenkins',
        date: '4 days ago',
        fileType: 'PDF',
        size: '3.4 MB',
        readTime: '20 min read',
      },
    ],
  },
  {
    id: 'cls-cn-3a',
    name: 'Computer Networks',
    code: 'CS303',
    section: 'CSE 3A',
    academicYear: '2026-27',
    classCode: 'CN3A26',
    teacherName: 'Dr. Vikram Patel',
    description: 'OSI and TCP/IP protocol stacks, sliding window flow control, congestion control, and subnetting.',
    studentsCount: 60,
    assignmentsCount: 0,
    upcomingCount: 1,
    averagePerformance: 85,
    color: 'from-purple-600 via-violet-600 to-indigo-700',
    announcements: [],
    assignments: [],
    resources: [],
  },
];

export const DEMO_LEARNING_EVENTS: LearningEvent[] = [
  {
    id: 'evt-1',
    type: 'MISSED_CLASS',
    title: 'Missed DBMS Lecture 14',
    courseCode: 'CS301',
    timestamp: 'Yesterday, 10:00 AM',
    detail: 'Marked absent. 30-min recovery plan generated for 2NF & 3NF.',
  },
  {
    id: 'evt-2',
    type: 'ASSIGNMENT_CREATED',
    title: 'DBMS Assignment 3 Added to Tasks',
    courseCode: 'CS301',
    timestamp: 'Today, 9:16 AM',
    detail: 'Auto-synchronized from Dr. Rao announcement. Due Monday.',
  },
  {
    id: 'evt-3',
    type: 'QUIZ_COMPLETED',
    title: 'Normalization Checkpoint Attempted',
    courseCode: 'CS301',
    timestamp: 'Yesterday, 3:30 PM',
    detail: 'Score: 46% on 2NF (identified as critical knowledge gap).',
  },
];
