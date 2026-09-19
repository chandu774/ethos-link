/**
 * Strict AI Quiz Generation and Multi-Stage Validation Service
 * 
 * Enforces strict Subject -> Topic -> Concept boundaries.
 * Prevents cross-topic leakage (e.g. Normalization will NEVER generate Transactions/Deadlocks).
 * Performs deterministic validation before questions are reviewed by teachers.
 */

export interface QuestionDraft {
  id?: string;
  question: string;
  options: string[];
  correct_option_index: number;
  subject: string;
  topic: string;
  concept: string;
  difficulty: "Easy" | "Medium" | "Hard";
  marks: number;
  explanation: string;
}

export interface QuizGenerationInput {
  subject: string;
  topic: string;
  concepts: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  questionCount: number;
}

export interface TopicBoundaryDefinition {
  allowedConcepts: string[];
  topicKeywords: string[];
  forbiddenKeywords: string[];
}

/**
 * Standard Academic Discipline Boundary Ontology
 */
export const TOPIC_BOUNDARIES: Record<string, Record<string, TopicBoundaryDefinition>> = {
  dbms: {
    normalization: {
      allowedConcepts: [
        "Functional Dependencies",
        "1NF",
        "2NF",
        "3NF",
        "BCNF",
        "Partial Dependency",
        "Transitive Dependency",
        "Lossless Decomposition",
        "Dependency Preservation",
        "Candidate Key",
        "Super Key",
        "Prime Attribute",
        "Non-Prime Attribute",
        "Multivalued Dependency",
        "4NF",
      ],
      topicKeywords: [
        "normal form",
        "normalization",
        "functional dependency",
        "partial dependency",
        "transitive dependency",
        "1nf",
        "2nf",
        "3nf",
        "bcnf",
        "decomposition",
        "lossless",
        "dependency preservation",
        "prime attribute",
        "candidate key",
      ],
      forbiddenKeywords: [
        "transaction",
        "acid property",
        "deadlock",
        "two-phase locking",
        "2pl",
        "write-ahead log",
        "wal",
        "concurrency control",
        "b+ tree",
        "b tree",
        "indexing",
        "hashing index",
        "sql join",
        "left outer join",
        "right outer join",
        "query optimization",
        "recovery manager",
        "checkpoint recovery",
        "dirty read",
        "phantom read",
        "serializability",
      ],
    },
    transactions: {
      allowedConcepts: [
        "ACID Properties",
        "Atomicity",
        "Consistency",
        "Isolation",
        "Durability",
        "Serializability",
        "Conflict Serializability",
        "View Serializability",
        "Two-Phase Locking (2PL)",
        "Strict 2PL",
        "Deadlock Detection",
        "Deadlock Prevention",
        "Wait-Die & Wound-Wait",
        "Timestamp Ordering",
        "Write-Ahead Logging (WAL)",
      ],
      topicKeywords: [
        "transaction",
        "acid",
        "serializability",
        "concurrency",
        "locking",
        "2pl",
        "deadlock",
        "precedence graph",
        "commit",
        "rollback",
      ],
      forbiddenKeywords: [
        "1nf",
        "2nf",
        "3nf",
        "bcnf",
        "normalization",
        "partial dependency",
        "transitive dependency",
        "b+ tree",
        "disk scheduling",
        "virtual memory",
      ],
    },
  },
  "operating systems": {
    "cpu scheduling": {
      allowedConcepts: [
        "First-Come First-Served (FCFS)",
        "Shortest Job First (SJF)",
        "Round Robin (RR)",
        "Priority Scheduling",
        "Multi-Level Queue",
        "Turnaround Time",
        "Waiting Time",
        "Response Time",
        "Preemptive vs Non-preemptive",
        "Convoy Effect",
      ],
      topicKeywords: [
        "cpu scheduling",
        "scheduler",
        "round robin",
        "sjf",
        "fcfs",
        "turnaround time",
        "waiting time",
        "quantum",
        "burst time",
        "preemption",
      ],
      forbiddenKeywords: [
        "paging",
        "virtual memory",
        "page fault",
        "segmentation",
        "tlb",
        "disk scheduling",
        "scan",
        "c-scan",
        "inode",
        "file system",
      ],
    },
    "memory management": {
      allowedConcepts: [
        "Paging",
        "Page Tables",
        "TLB (Translation Lookaside Buffer)",
        "Virtual Memory",
        "Demand Paging",
        "Page Replacement Algorithms",
        "FIFO Replacement",
        "LRU Replacement",
        "Optimal Replacement",
        "Thrashing",
        "Belady's Anomaly",
      ],
      topicKeywords: [
        "paging",
        "page table",
        "tlb",
        "virtual memory",
        "page fault",
        "lru",
        "fifo",
        "belady",
        "frame",
        "thrashing",
      ],
      forbiddenKeywords: [
        "round robin",
        "cpu burst",
        "sjf",
        "fcfs",
        "priority scheduling",
        "fork()",
        "exec()",
        "deadlock banker",
      ],
    },
  },
  "data structures and algorithms": {
    searching: {
      allowedConcepts: [
        "Linear Search",
        "Binary Search",
        "Ternary Search",
        "Search Space Reduction",
        "Time Complexity O(log n)",
        "Lower Bound & Upper Bound",
      ],
      topicKeywords: [
        "binary search",
        "linear search",
        "sorted array",
        "search space",
        "mid calculation",
        "monotonic",
      ],
      forbiddenKeywords: [
        "bubble sort",
        "quick sort",
        "merge sort",
        "heap sort",
        "dijkstra",
        "kruskal",
        "dfs",
        "bfs",
      ],
    },
    sorting: {
      allowedConcepts: [
        "Quick Sort",
        "Merge Sort",
        "Heap Sort",
        "Stability in Sorting",
        "In-place Sorting",
        "Worst-case Time Complexity",
        "Divide and Conquer",
      ],
      topicKeywords: [
        "quick sort",
        "merge sort",
        "heap sort",
        "partitioning",
        "pivot",
        "divide and conquer",
        "stability",
      ],
      forbiddenKeywords: [
        "binary search",
        "breadth first search",
        "depth first search",
        "shortest path",
        "minimum spanning tree",
      ],
    },
  },
};

/**
 * Resolves boundary definition for a given subject and topic.
 */
export function getTopicBoundary(subject: string, topic: string): TopicBoundaryDefinition | null {
  const subKey = subject.trim().toLowerCase();
  const topKey = topic.trim().toLowerCase();

  for (const [sKey, sObj] of Object.entries(TOPIC_BOUNDARIES)) {
    if (subKey.includes(sKey) || sKey.includes(subKey)) {
      for (const [tKey, def] of Object.entries(sObj)) {
        if (topKey.includes(tKey) || tKey.includes(topKey)) {
          return def;
        }
      }
    }
  }
  return null;
}

/**
 * Validates a single question against deterministic quality and topic rules.
 */
export function validateQuestion(
  q: QuestionDraft,
  expectedSubject: string,
  expectedTopic: string,
  boundary: TopicBoundaryDefinition | null
): { valid: boolean; reason?: string } {
  // 1. Question stem must not be empty and must have reasonable length
  if (!q.question || q.question.trim().length < 15) {
    return { valid: false, reason: "Question stem is too short or missing." };
  }

  // 2. Exactly 4 options
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    return { valid: false, reason: "Question must have exactly 4 options." };
  }

  // Check that all 4 options are distinct and non-empty
  const trimmedOptions = q.options.map((o) => (o || "").trim());
  if (trimmedOptions.some((o) => o.length === 0)) {
    return { valid: false, reason: "Option text cannot be empty." };
  }
  const uniqueOpts = new Set(trimmedOptions.map((o) => o.toLowerCase()));
  if (uniqueOpts.size !== 4) {
    return { valid: false, reason: "Options must be distinct (no duplicates)." };
  }

  // 3. Exactly 1 valid correct option index
  if (
    typeof q.correct_option_index !== "number" ||
    q.correct_option_index < 0 ||
    q.correct_option_index > 3
  ) {
    return { valid: false, reason: "Invalid correct option index." };
  }

  // 4. Topic relevance and forbidden off-topic keyword detection
  const fullText = `${q.question} ${trimmedOptions.join(" ")} ${q.concept || ""}`.toLowerCase();

  if (boundary) {
    // Check if any forbidden keyword appears in the question or options
    for (const forbidden of boundary.forbiddenKeywords) {
      if (fullText.includes(forbidden.toLowerCase())) {
        return {
          valid: false,
          reason: `Question contains off-topic concept '${forbidden}', which violates the '${expectedTopic}' topic boundary.`,
        };
      }
    }

    // Check if at least one topic keyword or allowed concept is present
    const hasTopicRelevance =
      boundary.topicKeywords.some((kw) => fullText.includes(kw.toLowerCase())) ||
      boundary.allowedConcepts.some((c) => fullText.includes(c.toLowerCase()));

    if (!hasTopicRelevance) {
      return {
        valid: false,
        reason: `Question lacks direct conceptual relevance to '${expectedTopic}'.`,
      };
    }
  }

  // 5. Concept must be provided
  if (!q.concept || q.concept.trim().length === 0) {
    return { valid: false, reason: "Question must be associated with a valid concept." };
  }

  return { valid: true };
}

/**
 * Curated, academically verified question bank by Subject -> Topic -> Concept
 * Used for deterministic replacement or verified fallback to guarantee 100% adherence.
 */
export const VERIFIED_ACADEMIC_QUESTIONS: Record<string, Record<string, QuestionDraft[]>> = {
  dbms: {
    normalization: [
      {
        question: "Which of the following conditions is required for a relational table to satisfy First Normal Form (1NF)?",
        options: [
          "All attribute values must be atomic and non-decomposable",
          "Every non-key attribute must be fully functionally dependent on the entire primary key",
          "There must be no transitive dependencies between non-key attributes",
          "Every determinant must be a candidate key",
        ],
        correct_option_index: 0,
        subject: "DBMS",
        topic: "Normalization",
        concept: "1NF",
        difficulty: "Easy",
        marks: 1,
        explanation: "1NF requires that each column contain only atomic (indivisible) values and there are no repeating groups.",
      },
      {
        question: "In relation R(A, B, C, D) with primary key (A, B), the functional dependency A -> C is an example of what type of dependency?",
        options: [
          "Partial Dependency",
          "Transitive Dependency",
          "Trivial Functional Dependency",
          "Multivalued Dependency",
        ],
        correct_option_index: 0,
        subject: "DBMS",
        topic: "Normalization",
        concept: "Partial Dependency",
        difficulty: "Medium",
        marks: 1,
        explanation: "A partial dependency occurs when a non-prime attribute (C) is functionally dependent on a proper subset (A) of a composite candidate key (A, B).",
      },
      {
        question: "Which normal form specifically requires eliminating partial functional dependencies on a composite primary key?",
        options: [
          "Second Normal Form (2NF)",
          "Third Normal Form (3NF)",
          "Boyce-Codd Normal Form (BCNF)",
          "Fourth Normal Form (4NF)",
        ],
        correct_option_index: 0,
        subject: "DBMS",
        topic: "Normalization",
        concept: "2NF",
        difficulty: "Easy",
        marks: 1,
        explanation: "A table is in 2NF if and only if it is in 1NF and no non-prime attribute is partially dependent on any candidate key.",
      },
      {
        question: "Consider a relation with functional dependencies: StudentID -> DeptID and DeptID -> DeptName. What dependency exists between StudentID and DeptName?",
        options: [
          "Transitive Dependency",
          "Partial Dependency",
          "Join Dependency",
          "Reflexive Dependency",
        ],
        correct_option_index: 0,
        subject: "DBMS",
        topic: "Normalization",
        concept: "Transitive Dependency",
        difficulty: "Medium",
        marks: 1,
        explanation: "Since StudentID -> DeptID and DeptID -> DeptName, StudentID -> DeptName is a transitive dependency through DeptID.",
      },
      {
        question: "A relation is in Third Normal Form (3NF) if for every non-trivial functional dependency X -> Y, which of the following holds?",
        options: [
          "X is a superkey OR Y is a prime attribute",
          "X is a candidate key AND Y is a non-prime attribute",
          "X must strictly be a composite key",
          "Y must be functionally dependent on all attributes in the schema",
        ],
        correct_option_index: 0,
        subject: "DBMS",
        topic: "Normalization",
        concept: "3NF",
        difficulty: "Medium",
        marks: 1,
        explanation: "3NF relaxes BCNF by allowing non-superkey determinants if the dependent attribute Y is prime (part of some candidate key).",
      },
      {
        question: "How does Boyce-Codd Normal Form (BCNF) differ strictly from Third Normal Form (3NF)?",
        options: [
          "BCNF requires that for every non-trivial FD X -> Y, X MUST be a superkey with no exceptions",
          "BCNF allows transitive dependencies whereas 3NF eliminates them completely",
          "BCNF applies only to relations with single-attribute primary keys",
          "BCNF guarantees dependency preservation in all decompositions whereas 3NF does not",
        ],
        correct_option_index: 0,
        subject: "DBMS",
        topic: "Normalization",
        concept: "BCNF",
        difficulty: "Hard",
        marks: 1,
        explanation: "BCNF eliminates the 3NF clause where Y can be prime. In BCNF, every determinant must strictly be a superkey.",
      },
      {
        question: "When decomposing relation R into R1 and R2, what condition mathematically guarantees that the decomposition is lossless-join?",
        options: [
          "(R1 ∩ R2) -> R1 OR (R1 ∩ R2) -> R2 must hold in F+",
          "R1 and R2 must have completely disjoint sets of attributes",
          "Both R1 and R2 must independently have the same primary key as R",
          "Every functional dependency of R must appear wholly in either R1 or R2",
        ],
        correct_option_index: 0,
        subject: "DBMS",
        topic: "Normalization",
        concept: "Lossless Decomposition",
        difficulty: "Hard",
        marks: 1,
        explanation: "A binary decomposition is lossless if and only if the common attribute(s) form a superkey for at least one of the decomposed relations.",
      },
      {
        question: "Which of the following is true regarding Dependency Preservation during relational decomposition?",
        options: [
          "3NF decomposition always achieves dependency preservation, but BCNF decomposition may not",
          "BCNF decomposition always preserves all dependencies without loss",
          "Dependency preservation is only necessary for tables with single-column keys",
          "Decomposition into 2NF never preserves any functional dependencies",
        ],
        correct_option_index: 0,
        subject: "DBMS",
        topic: "Normalization",
        concept: "Dependency Preservation",
        difficulty: "Hard",
        marks: 1,
        explanation: "It is always possible to find a 3NF decomposition that is both lossless and dependency-preserving; for BCNF, dependency preservation is not guaranteed.",
      },
      {
        question: "According to Armstrong's Axioms, if X -> Y and Y -> Z hold, then X -> Z holds. Which inference rule is this?",
        options: [
          "Transitivity Rule",
          "Augmentation Rule",
          "Reflexivity Rule",
          "Pseudo-transitivity Rule",
        ],
        correct_option_index: 0,
        subject: "DBMS",
        topic: "Normalization",
        concept: "Functional Dependencies",
        difficulty: "Easy",
        marks: 1,
        explanation: "The transitivity rule states that functional dependencies are transitive: if X determines Y and Y determines Z, then X determines Z.",
      },
      {
        question: "In relation R(A, B, C) where AB is the candidate key and B -> C is an existing functional dependency, which violation occurs?",
        options: [
          "2NF violation because C is partially dependent on AB via B",
          "1NF violation because attributes are non-atomic",
          "It is already in BCNF because AB is a candidate key",
          "4NF violation caused by multivalued dependencies",
        ],
        correct_option_index: 0,
        subject: "DBMS",
        topic: "Normalization",
        concept: "2NF",
        difficulty: "Medium",
        marks: 1,
        explanation: "Since B is a proper subset of the composite key AB, B -> C is a partial dependency violating 2NF.",
      },
    ],
  },
};

/**
 * Generates verified questions by calling the AI gateway or using verified academic item pools,
 * strictly bounded to the specified Subject, Topic, and Concepts.
 */
export async function generateAndValidateQuiz(
  input: QuizGenerationInput
): Promise<QuestionDraft[]> {
  const { subject, topic, concepts, difficulty, questionCount } = input;
  const boundary = getTopicBoundary(subject, topic);

  // Normalize target concepts
  const targetConcepts =
    concepts.length > 0
      ? concepts
      : boundary
      ? boundary.allowedConcepts.slice(0, 5)
      : ["Core Concepts", "Principles", "Analysis"];

  let candidateQuestions: QuestionDraft[] = [];

  // Attempt AI Generation via Supabase edge function
  try {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    const forbiddenText = boundary ? boundary.forbiddenKeywords.join(", ") : "Unrelated topics";

    const systemPrompt = `You are a university computer science exam author.
You MUST generate multiple-choice questions STRICTLY and EXCLUSIVELY about the requested Subject, Topic, and Concepts.

STRICT ACADEMIC BOUNDARY:
- Subject: ${subject}
- Topic: ${topic}
- Allowed Concepts: ${targetConcepts.join(", ")}
- Difficulty: ${difficulty}
- Required Count: ${questionCount}

CRITICAL RULES:
1. Every question MUST be directly about the Topic "${topic}" and one of the Allowed Concepts.
2. Under NO circumstances generate questions about unrelated topics (e.g. STRICTLY FORBIDDEN: ${forbiddenText}).
3. Exactly 4 options per question.
4. Exactly 1 correct answer.
5. 3 plausible same-domain distractors.
6. Return ONLY a valid JSON array of objects with this schema:
[
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correct_option_index": 0,
    "concept": "one of the allowed concepts",
    "difficulty": "${difficulty}",
    "marks": 1,
    "explanation": "clear explanation why correct answer is right and main distractor is wrong"
  }
]`;

    const userPrompt = `Generate exactly ${questionCount} ${difficulty}-level questions about Subject "${subject}", Topic "${topic}", strictly covering concepts: ${targetConcepts.join(", ")}.`;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (resp.ok) {
      // Read stream or json
      const reader = resp.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") break;
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) accumulated += delta;
              } catch {
                // ignore parsing individual sse chunk
              }
            }
          }
        }

        // Try extracting JSON array from accumulated text
        const jsonMatch = accumulated.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            candidateQuestions = parsed.map((item) => ({
              question: item.question,
              options: item.options,
              correct_option_index: Number(item.correct_option_index) || 0,
              subject,
              topic,
              concept: item.concept || targetConcepts[0],
              difficulty: difficulty,
              marks: Number(item.marks) || 1,
              explanation: item.explanation || "",
            }));
          }
        }
      }
    }
  } catch (err) {
    console.warn("AI generation network trigger fallback:", err);
  }

  // Multi-Stage Validation & Verified Replacement
  const validatedQuestions: QuestionDraft[] = [];
  const seenStems = new Set<string>();

  // Check candidate questions from AI
  for (const q of candidateQuestions) {
    const val = validateQuestion(q, subject, topic, boundary);
    const stemNorm = q.question?.toLowerCase().trim() || "";

    if (val.valid && !seenStems.has(stemNorm)) {
      seenStems.add(stemNorm);
      validatedQuestions.push(q);
      if (validatedQuestions.length >= questionCount) break;
    } else {
      console.warn("Question rejected by validator:", val.reason, q.question);
    }
  }

  // If candidate count is less than requested, backfill from verified academic question repository
  if (validatedQuestions.length < questionCount) {
    const sKey = subject.trim().toLowerCase();
    const tKey = topic.trim().toLowerCase();

    let verifiedPool: QuestionDraft[] = [];
    for (const [subName, topObj] of Object.entries(VERIFIED_ACADEMIC_QUESTIONS)) {
      if (sKey.includes(subName) || subName.includes(sKey)) {
        for (const [topName, qList] of Object.entries(topObj)) {
          if (tKey.includes(topName) || topName.includes(tKey)) {
            verifiedPool = qList;
            break;
          }
        }
      }
    }

    for (const vq of verifiedPool) {
      const stemNorm = vq.question.toLowerCase().trim();
      if (!seenStems.has(stemNorm)) {
        seenStems.add(stemNorm);
        validatedQuestions.push({
          ...vq,
          subject,
          topic,
          difficulty,
        });
        if (validatedQuestions.length >= questionCount) break;
      }
    }
  }

  return validatedQuestions;
}
