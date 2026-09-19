/**
 * Strict AI Quiz Generation and Multi-Stage Validation Service
 * 
 * Enforces strict Subject -> Topic -> Concept boundaries.
 * Prevents cross-topic leakage (e.g. Normalization will NEVER generate Transactions/Deadlocks).
 * Performs deterministic validation before questions are reviewed by teachers.
 */
import { supabase } from "@/integrations/supabase/client";

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
    "process scheduling": {
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
        "Gantt Chart",
        "Context Switch Overhead",
      ],
      topicKeywords: [
        "process scheduling",
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
        "context switch",
        "ready queue",
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
        "normalization",
        "sql join",
      ],
    },
    "deadlocks": {
      allowedConcepts: [
        "Mutual Exclusion",
        "Hold and Wait",
        "No Preemption",
        "Circular Wait",
        "Resource Allocation Graph (RAG)",
        "Banker's Algorithm",
        "Safe State vs Unsafe State",
        "Deadlock Prevention",
        "Deadlock Avoidance",
        "Deadlock Detection & Recovery",
      ],
      topicKeywords: [
        "deadlock",
        "banker",
        "resource allocation graph",
        "rag",
        "circular wait",
        "hold and wait",
        "safe state",
        "prevention",
        "avoidance",
      ],
      forbiddenKeywords: [
        "paging",
        "virtual memory",
        "page fault",
        "round robin",
        "sjf",
        "fcfs",
        "disk scheduling",
      ],
    },
  },
  "computer networks": {
    "computer networks": {
      allowedConcepts: [
        "OSI 7-Layer Model",
        "TCP/IP Protocol Suite",
        "IPv4 Addressing & Subnetting",
        "CIDR",
        "TCP 3-Way Handshake",
        "UDP vs TCP",
        "Flow Control & Sliding Window",
        "Congestion Control",
        "DNS (Domain Name System)",
        "HTTP & HTTPS",
        "Routing Protocols (OSPF, BGP, RIP)",
        "ARP & MAC Addressing",
        "Data Link Layer Framing & Error Detection",
      ],
      topicKeywords: [
        "network",
        "osi",
        "tcp",
        "udp",
        "ip address",
        "subnet",
        "router",
        "packet",
        "socket",
        "handshake",
        "layer",
        "ethernet",
        "dns",
        "http",
        "cidr",
        "port number",
        "congestion control",
        "sliding window",
      ],
      forbiddenKeywords: [
        "normalization",
        "1nf",
        "2nf",
        "3nf",
        "bcnf",
        "acid properties",
        "deadlock",
        "banker's algorithm",
        "paging",
        "page fault",
        "cpu scheduling",
        "round robin",
      ],
    },
    "osi model": {
      allowedConcepts: [
        "Physical Layer",
        "Data Link Layer",
        "Network Layer",
        "Transport Layer",
        "Session Layer",
        "Presentation Layer",
        "Application Layer",
        "Encapsulation & Decapsulation",
        "PDU (Protocol Data Unit)",
        "MAC Address vs IP Address",
      ],
      topicKeywords: [
        "osi",
        "layer",
        "physical layer",
        "data link",
        "network layer",
        "transport layer",
        "session layer",
        "presentation layer",
        "application layer",
        "encapsulation",
        "pdu",
      ],
      forbiddenKeywords: [
        "normalization",
        "acid properties",
        "deadlock",
        "paging",
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

  // Normalize subject aliases
  let normSubject = subKey;
  if (subKey === "os" || subKey.includes("operating sys")) normSubject = "operating systems";
  else if (subKey.includes("dbms") || subKey.includes("database")) normSubject = "dbms";
  else if (subKey.includes("cn") || subKey.includes("network")) normSubject = "computer networks";
  else if (subKey.includes("dsa") || subKey.includes("data struct")) normSubject = "data structures and algorithms";

  // Normalize topic aliases
  let normTopic = topKey;
  if (topKey.includes("process sched") || topKey.includes("cpu sched")) normTopic = "cpu scheduling";

  for (const [sKey, sObj] of Object.entries(TOPIC_BOUNDARIES)) {
    if (normSubject.includes(sKey) || sKey.includes(normSubject)) {
      for (const [tKey, def] of Object.entries(sObj)) {
        if (
          normTopic.includes(tKey) ||
          tKey.includes(normTopic) ||
          topKey.includes(tKey) ||
          tKey.includes(topKey)
        ) {
          return def;
        }
      }
    }
  }
  return null;
}

/**
 * Validates a single question against deterministic quality and topic rules.
 * 
 * Topic relevance accepts a question if ANY of these are true:
 *  - A topic keyword appears in the full text
 *  - An allowed concept appears in the full text
 *  - The question's concept field matches an allowed concept (most reliable)
 * This avoids rejecting valid questions that test a concept correctly but
 * don't happen to use the exact topic name (e.g. a 3NF question need not
 * say "Normalization" in the stem to be valid).
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

  // 4. Concept must be provided
  if (!q.concept || q.concept.trim().length === 0) {
    return { valid: false, reason: "Question must be associated with a valid concept." };
  }

  // 5. Topic boundary enforcement (only when a boundary is defined for this subject/topic)
  if (boundary) {
    const fullText = `${q.question} ${trimmedOptions.join(" ")} ${q.concept}`.toLowerCase();
    const conceptLower = q.concept.trim().toLowerCase();

    // 5a. Reject questions containing forbidden off-topic keywords
    for (const forbidden of boundary.forbiddenKeywords) {
      if (fullText.includes(forbidden.toLowerCase())) {
        return {
          valid: false,
          reason: `Question contains off-topic concept '${forbidden}', which violates the '${expectedTopic}' topic boundary.`,
        };
      }
    }

    // 5b. Accept if the question's concept field matches one of the allowed concepts
    //     (Most reliable — AI assigned concept metadata based on what it generated)
    const conceptMatchesAllowed = boundary.allowedConcepts.some(
      (c) => conceptLower === c.toLowerCase() || conceptLower.includes(c.toLowerCase()) || c.toLowerCase().includes(conceptLower)
    );

    // 5c. Also accept if topic keywords appear in the question text
    const hasTopicKeyword = boundary.topicKeywords.some((kw) => fullText.includes(kw.toLowerCase()));

    // 5d. Also accept if any allowed concept name appears in the question text
    const hasConceptInText = boundary.allowedConcepts.some((c) => fullText.includes(c.toLowerCase()));

    // 5e. Also accept if the topic itself or key words appear in text
    const hasTopicInText =
      fullText.includes(expectedTopic.toLowerCase()) ||
      expectedTopic
        .toLowerCase()
        .split(/\s+/)
        .some((word) => word.length > 3 && fullText.includes(word));

    if (!conceptMatchesAllowed && !hasTopicKeyword && !hasConceptInText && !hasTopicInText) {
      return {
        valid: false,
        reason: `Question concept '${q.concept}' does not match any allowed concept for '${expectedTopic}', and no topic keywords found in question text.`,
      };
    }
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
 * Generates and validates quiz questions using the dedicated quiz-generate edge function.
 * 
 * Pipeline:
 * 1. Call /functions/v1/quiz-generate with structured subject/topic/concept context
 * 2. Parse the complete JSON response (no SSE streaming — uses stream: false)
 * 3. Validate each question individually against topic boundaries and quality rules
 * 4. Keep valid questions, collect rejected ones with reasons
 * 5. Up to 3 regeneration rounds for missing/rejected questions
 * 6. Return all valid questions found (partial success is fine)
 */
export async function generateAndValidateQuiz(
  input: QuizGenerationInput
): Promise<{ questions: QuestionDraft[]; generatedCount: number; requestedCount: number; rejectedCount: number; error?: string }> {
  const { subject, topic, concepts, difficulty, questionCount } = input;
  const boundary = getTopicBoundary(subject, topic);

  // Normalize target concepts (optional: if none provided, pass empty array so AI is topic-driven)
  const hasExplicitConcepts = Array.isArray(concepts) && concepts.length > 0;
  const targetConcepts = hasExplicitConcepts ? concepts : [];

  const QUIZ_GEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quiz-generate`;

  const validatedQuestions: QuestionDraft[] = [];
  const seenStems = new Set<string>();
  const rejectedQuestions: { question: string; reason: string }[] = [];
  let totalRejectedCount = 0;

  // Helper: call the edge function and get raw candidates
  const callGenerateEndpoint = async (count: number, prevRejections: typeof rejectedQuestions): Promise<any[]> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token =
        sessionData?.session?.access_token ||
        import.meta.env.VITE_SUPABASE_ANON_KEY ||
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        "";
      const anonKey =
        import.meta.env.VITE_SUPABASE_ANON_KEY ||
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        "";

      console.log(`[quizGenerationService] Calling ${QUIZ_GEN_URL} for Subject="${subject}", Topic="${topic}", Count=${count}`);

      const resp = await fetch(QUIZ_GEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          subject,
          topic,
          concepts: targetConcepts,
          difficulty,
          questionCount: count,
          forbiddenKeywords: boundary?.forbiddenKeywords || [],
          previousRejections: prevRejections,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({ error: `HTTP status ${resp.status}` }));
        console.error(`[quizGenerationService] Edge function HTTP ${resp.status}:`, errBody);
        throw new Error(errBody.error || `Edge function HTTP ${resp.status}`);
      }

      const data = await resp.json();
      
      if (data.error) {
        console.error(`[quizGenerationService] Edge function returned error:`, data.error);
        throw new Error(data.error);
      }

      const raw = data.questions;
      if (!Array.isArray(raw)) {
        console.error("[quizGenerationService] Response questions is not an array:", JSON.stringify(data).slice(0, 200));
        throw new Error("Edge function returned non-array questions");
      }

      console.log(`[quizGenerationService] Edge function returned ${raw.length} candidates (Provider: ${data.provider || "Gemini"}, Model: ${data.model || "flash-lite"})`);
      return raw;
    } catch (err) {
      console.error("[quizGenerationService] Generation request failed:", err);
      throw err;
    }
  };

  // Helper: validate and add questions from a raw candidate array
  const processRound = (rawCandidates: any[]) => {
    const roundRejected: typeof rejectedQuestions = [];
    
    for (const item of rawCandidates) {
      if (validatedQuestions.length >= questionCount) break;

      // Normalize the candidate into our QuestionDraft shape
      const defaultConcept =
        targetConcepts.length > 0
          ? targetConcepts[0]
          : boundary?.allowedConcepts[0] || topic || "Core Concept";

      const q: QuestionDraft = {
        question: (item.question || "").trim(),
        options: Array.isArray(item.options) ? item.options.map((o: any) => String(o || "").trim()) : [],
        correct_option_index: typeof item.correct_option_index === "number"
          ? item.correct_option_index
          : parseInt(String(item.correct_option_index || "0"), 10),
        subject,
        topic,
        concept: (item.concept || defaultConcept).trim(),
        difficulty,
        marks: typeof item.marks === "number" ? item.marks : 1,
        explanation: (item.explanation || "").trim(),
      };

      const stemNorm = q.question.toLowerCase();
      if (seenStems.has(stemNorm)) {
        roundRejected.push({ question: q.question, reason: "Duplicate question stem" });
        totalRejectedCount++;
        continue;
      }

      const val = validateQuestion(q, subject, topic, boundary);
      if (!val.valid) {
        console.warn(`[quiz-validate] REJECTED: "${q.question.slice(0, 60)}..." — ${val.reason}`);
        roundRejected.push({ question: q.question, reason: val.reason || "Validation failed" });
        totalRejectedCount++;
        continue;
      }

      seenStems.add(stemNorm);
      validatedQuestions.push(q);
    }

    return roundRejected;
  };

  // Round 1: Initial generation
  let lastError: string | undefined;
  try {
    const needed = questionCount;
    const round1Raw = await callGenerateEndpoint(needed, []);
    const round1Rejected = processRound(round1Raw);
    rejectedQuestions.push(...round1Rejected);
  } catch (err: any) {
    lastError = err.message;
    console.error("[quiz-generate] Round 1 failed:", err.message);
  }

  // Round 2: Re-generate for missing questions (if any)
  const MAX_ROUNDS = 3;
  let round = 2;
  while (validatedQuestions.length < questionCount && round <= MAX_ROUNDS) {
    const stillNeeded = questionCount - validatedQuestions.length;
    console.log(`[quiz-generate] Round ${round}: Need ${stillNeeded} more questions. ${rejectedQuestions.length} rejections so far.`);

    try {
      const roundRaw = await callGenerateEndpoint(stillNeeded + 2, rejectedQuestions.slice(-5));
      const roundRejected = processRound(roundRaw);
      rejectedQuestions.push(...roundRejected);
      lastError = undefined;
    } catch (err: any) {
      lastError = err.message;
      console.error(`[quiz-generate] Round ${round} failed:`, err.message);
      break;
    }

    round++;
  }

  console.log(
    `[quiz-generate] Final: ${validatedQuestions.length}/${questionCount} valid, ${totalRejectedCount} rejected`
  );

  return {
    questions: validatedQuestions,
    generatedCount: validatedQuestions.length,
    requestedCount: questionCount,
    rejectedCount: totalRejectedCount,
    error: validatedQuestions.length === 0 ? (lastError || "No valid questions could be generated") : undefined,
  };
}

