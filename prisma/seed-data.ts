// Curated SkillWeave catalogue: career paths, phases, modules, chapters,
// objectives and real free resources, plus assessments and projects.
//
// Every resource here is an existing, publicly available free resource. The
// seed never implies content is verified: `status` defaults to UNVERIFIED and
// only canonical, long-lived source homes are marked VERIFIED with a note.

import type {
  ChapterKind,
  PathCategory,
  ProjectLevel,
  QuestionType,
  ResourceRole,
  ResourceStatus,
  ResourceType,
  SkillLevel,
} from "../src/generated/prisma/enums";

import { TOPIC_BANK } from "./question-bank";
import { CATALOG_PATHS, CATALOG_RESOURCES } from "./paths/course-catalog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResourceDef {
  title: string;
  url: string;
  publisher: string;
  author?: string;
  type: ResourceType;
  // VIDEO resources only: hosting provider + editorial shape.
  provider?: string;
  videoKind?: "SINGLE" | "ONE_SHOT" | "PLAYLIST";
  difficulty?: SkillLevel;
  estimatedMinutes?: number;
  concepts?: string[];
  language?: string;
  isFree?: boolean;
  license?: string;
  licenseUrl?: string;
  isOpenLicense?: boolean;
  accessNotes?: string;
  status?: ResourceStatus;
  verificationNote?: string;
}

export interface ResourceLinkDef {
  key: string;
  role: ResourceRole;
  isRequired?: boolean;
  note?: string;
}

export interface QuestionDef {
  prompt: string;
  explanation: string;
  type?: QuestionType;
  difficulty?: SkillLevel;
  skillTags?: string[];
  points?: number;
  codeSnippet?: string;
  // [text, isCorrect?]
  options: Array<[string, boolean?]>;
}

export interface ChapterDef {
  slug: string;
  title: string;
  summary: string;
  intro: string;
  estimatedMinutes?: number;
  kind?: ChapterKind;
  isOptional?: boolean;
  completionCriteria?: string;
  objectives: string[];
  resources: ResourceLinkDef[];
  // Either an inline chapter test (`quiz`, exactly CHAPTER_TEST_SIZE) or a
  // reference to a shared topic in TOPIC_BANK (`topic`). Topics are reused
  // across paths so the catalogue scales without duplicating questions.
  quiz?: QuestionDef[];
  topic?: string;
}

export interface ModuleDef {
  slug: string;
  title: string;
  summary: string;
  description: string;
  estimatedMinutes?: number;
  completionCriteria?: string;
  objectives?: string[];
  prerequisiteSlugs?: string[];
  chapters: ChapterDef[];
  // The module mock is a 20-question exam assembled from the module's chapter
  // questions and unlocked once every chapter in the module is complete.
  assessment?: {
    title?: string;
    description?: string;
    passingScore?: number;
    timeLimitMinutes?: number;
    skillTags?: string[];
  };
}

export interface PhaseDef {
  slug: string;
  title: string;
  summary: string;
  description: string;
  estimatedHours?: number;
  modules: ModuleDef[];
}

export interface RoleDef {
  slug: string;
  title: string;
  description: string;
  skills: Array<{ name: string; detail?: string; required?: boolean }>;
}

export interface ProjectDef {
  slug: string;
  title: string;
  level: ProjectLevel;
  summary: string;
  description: string;
  objectives?: string[];
  requirements: string;
  acceptanceCriteria?: string[];
  milestones?: Array<{ title: string; detail: string }>;
  starterResources?: string[];
  hints?: string[];
  submissionInstructions: string;
  rubric?: Array<{ criterion: string; weight: number; description: string }>;
  extensions?: string[];
}

export interface PathDef {
  slug: string;
  title: string;
  summary: string;
  description: string;
  level: SkillLevel;
  category?: PathCategory;
  featured?: boolean;
  estimatedHours?: number;
  order: number;
  roles: RoleDef[];
  phases: PhaseDef[];
  projects: ProjectDef[];
}

export interface StandaloneAssessmentDef {
  slug: string;
  title: string;
  description: string;
  type: "DIAGNOSTIC" | "INTERVIEW_BANK" | "MOCK_EXAM" | "REVISION";
  passingScore?: number;
  timeLimitMinutes?: number;
  skillTags?: string[];
  questions: QuestionDef[];
}

// ---------------------------------------------------------------------------
// Assessment sizing
// ---------------------------------------------------------------------------

/** Questions in a chapter test (unlocked after the chapter content is done). */
export const CHAPTER_TEST_SIZE = 10;
/** Questions in a module mock (unlocked after every chapter is complete). */
export const MODULE_MOCK_SIZE = 20;

/** Stable, deterministic string hash (used to vary topic slices per chapter). */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Resolves the questions a chapter test should use. */
export function resolveChapterQuestions(chapter: ChapterDef): QuestionDef[] {
  const inline = chapter.quiz ?? [];
  const topic = chapter.topic ? TOPIC_BANK[chapter.topic] ?? [] : [];
  if (inline.length === 0 && topic.length === 0) return [];
  // Chapter-specific inline questions come first, then the shared topic fills
  // the test up to CHAPTER_TEST_SIZE. The topic is rotated by a stable hash of
  // the chapter slug so chapters that share a topic draw different questions,
  // which also gives module mocks more variety. Duplicate prompts are skipped.
  const offset = topic.length > 0 ? hashString(chapter.slug) % topic.length : 0;
  const rotated = topic.length > 0 ? [...topic.slice(offset), ...topic.slice(0, offset)] : [];
  const seen = new Set<string>();
  const result: QuestionDef[] = [];
  for (const question of [...inline, ...rotated]) {
    if (seen.has(question.prompt)) continue;
    seen.add(question.prompt);
    result.push(question);
    if (result.length >= CHAPTER_TEST_SIZE) break;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function q(
  prompt: string,
  explanation: string,
  options: Array<[string, boolean?]>,
  meta: Partial<Omit<QuestionDef, "prompt" | "explanation" | "options">> = {},
): QuestionDef {
  return {
    prompt,
    explanation,
    options,
    type: meta.type ?? "SINGLE_CHOICE",
    difficulty: meta.difficulty ?? "BEGINNER",
    skillTags: meta.skillTags ?? [],
    points: meta.points ?? 1,
    codeSnippet: meta.codeSnippet,
  };
}

function link(
  key: string,
  role: ResourceRole,
  opts: { isRequired?: boolean; note?: string } = {},
): ResourceLinkDef {
  return { key, role, isRequired: opts.isRequired, note: opts.note };
}

// ---------------------------------------------------------------------------
// Resource registry (deduplicated by URL)
// ---------------------------------------------------------------------------

const BASE_RESOURCES: Record<string, ResourceDef> = {
  // --- Web fundamentals -----------------------------------------------------
  mdnLearn: {
    title: "MDN: Learn web development",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
    publisher: "MDN (Mozilla)",
    type: "OFFICIAL_DOCS",
    difficulty: "ABSOLUTE_BEGINNER",
    concepts: ["web", "html", "css", "javascript"],
    status: "VERIFIED",
    verificationNote: "Canonical MDN learning hub.",
  },
  mdnHtml: {
    title: "MDN: Structuring content with HTML",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content",
    publisher: "MDN (Mozilla)",
    type: "OFFICIAL_DOCS",
    difficulty: "BEGINNER",
    estimatedMinutes: 300,
    concepts: ["html", "semantics"],
    status: "VERIFIED",
    verificationNote: "Canonical MDN HTML curriculum.",
  },
  mdnCss: {
    title: "MDN: CSS styling basics",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics",
    publisher: "MDN (Mozilla)",
    type: "OFFICIAL_DOCS",
    difficulty: "BEGINNER",
    estimatedMinutes: 300,
    concepts: ["css", "layout"],
    status: "VERIFIED",
    verificationNote: "Canonical MDN CSS curriculum.",
  },
  mdnCssLayout: {
    title: "MDN: CSS layout",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout",
    publisher: "MDN (Mozilla)",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    estimatedMinutes: 240,
    concepts: ["css", "flexbox", "grid", "responsive"],
    status: "VERIFIED",
    verificationNote: "Canonical MDN CSS layout references.",
  },
  mdnJs: {
    title: "MDN: JavaScript first steps",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting",
    publisher: "MDN (Mozilla)",
    type: "OFFICIAL_DOCS",
    difficulty: "BEGINNER",
    estimatedMinutes: 360,
    concepts: ["javascript"],
    status: "VERIFIED",
    verificationNote: "Canonical MDN JavaScript curriculum.",
  },
  mdnDom: {
    title: "MDN: Document Object Model (DOM) introduction",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction",
    publisher: "MDN (Mozilla)",
    type: "REFERENCE",
    difficulty: "INTERMEDIATE",
    concepts: ["javascript", "dom"],
    status: "VERIFIED",
    verificationNote: "Canonical MDN DOM reference.",
  },
  mdnFetch: {
    title: "MDN: Using the Fetch API",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch",
    publisher: "MDN (Mozilla)",
    type: "REFERENCE",
    difficulty: "INTERMEDIATE",
    concepts: ["javascript", "http", "fetch"],
    status: "VERIFIED",
    verificationNote: "Canonical MDN Fetch API guide.",
  },
  mdnHttp: {
    title: "MDN: An overview of HTTP",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
    publisher: "MDN (Mozilla)",
    type: "REFERENCE",
    difficulty: "BEGINNER",
    concepts: ["http", "web"],
    status: "VERIFIED",
    verificationNote: "Canonical MDN HTTP overview.",
  },
  mdnForms: {
    title: "MDN: Web forms",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms",
    publisher: "MDN (Mozilla)",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["html", "forms", "accessibility"],
    status: "VERIFIED",
    verificationNote: "Canonical MDN forms curriculum.",
  },
  mdnA11y: {
    title: "MDN: Accessibility",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility",
    publisher: "MDN (Mozilla)",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["accessibility", "html"],
    status: "VERIFIED",
    verificationNote: "Canonical MDN accessibility curriculum.",
  },
  jsInfo: {
    title: "The Modern JavaScript Tutorial",
    url: "https://javascript.info/",
    publisher: "javascript.info",
    author: "Ilya Kantor",
    type: "TEXTBOOK",
    difficulty: "BEGINNER",
    estimatedMinutes: 1200,
    concepts: ["javascript", "dom", "async"],
    status: "VERIFIED",
    verificationNote: "Long-running open JavaScript textbook.",
  },
  odin: {
    title: "The Odin Project",
    url: "https://www.theodinproject.com/",
    publisher: "The Odin Project",
    type: "TUTORIAL",
    difficulty: "BEGINNER",
    concepts: ["web", "javascript", "git"],
    status: "VERIFIED",
    verificationNote: "Long-running open web curriculum.",
  },
  fcc: {
    title: "freeCodeCamp: Learn to code",
    url: "https://www.freecodecamp.org/learn/",
    publisher: "freeCodeCamp",
    type: "PRACTICE_EXERCISES",
    difficulty: "BEGINNER",
    concepts: ["web", "javascript", "python"],
    status: "VERIFIED",
    verificationNote: "Canonical freeCodeCamp learning portal.",
  },
  cs50: {
    title: "CS50x: Introduction to Computer Science",
    url: "https://cs50.harvard.edu/x/",
    publisher: "Harvard University",
    type: "UNIVERSITY_COURSE",
    difficulty: "BEGINNER",
    estimatedMinutes: 3600,
    concepts: ["computer-science", "programming"],
    status: "VERIFIED",
    verificationNote: "Official Harvard CS50x site.",
  },
  gitBook: {
    title: "Pro Git (2nd edition)",
    url: "https://git-scm.com/book/en/v2",
    publisher: "Git SCM",
    author: "Scott Chacon, Ben Straub",
    type: "TEXTBOOK",
    difficulty: "BEGINNER",
    concepts: ["git", "version-control"],
    isOpenLicense: true,
    license: "CC BY-NC-SA 3.0",
    status: "VERIFIED",
    verificationNote: "Official free Pro Git book.",
  },
  githubSkills: {
    title: "GitHub Skills",
    url: "https://skills.github.com/",
    publisher: "GitHub",
    type: "TUTORIAL",
    difficulty: "BEGINNER",
    concepts: ["git", "github"],
    status: "VERIFIED",
    verificationNote: "Official GitHub hands-on courses.",
  },
  vite: {
    title: "Vite: Getting started",
    url: "https://vite.dev/guide/",
    publisher: "Vite",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["tooling", "build"],
    status: "VERIFIED",
    verificationNote: "Official Vite guide.",
  },
  npmDocs: {
    title: "npm documentation",
    url: "https://docs.npmjs.com/",
    publisher: "npm",
    type: "OFFICIAL_DOCS",
    difficulty: "BEGINNER",
    concepts: ["tooling", "javascript"],
    status: "VERIFIED",
    verificationNote: "Official npm documentation.",
  },
  vitest: {
    title: "Vitest: Guide",
    url: "https://vitest.dev/guide/",
    publisher: "Vitest",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["testing", "javascript"],
    status: "VERIFIED",
    verificationNote: "Official Vitest documentation.",
  },
  testingLib: {
    title: "Testing Library documentation",
    url: "https://testing-library.com/docs/",
    publisher: "Testing Library",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["testing", "frontend"],
    status: "VERIFIED",
    verificationNote: "Official Testing Library docs.",
  },
  react: {
    title: "React: Learn React",
    url: "https://react.dev/learn",
    publisher: "Meta",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    estimatedMinutes: 900,
    concepts: ["react", "components", "hooks"],
    status: "VERIFIED",
    verificationNote: "Official React documentation.",
  },
  reactState: {
    title: "React: Managing state",
    url: "https://react.dev/learn/managing-state",
    publisher: "Meta",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["react", "state"],
    status: "VERIFIED",
    verificationNote: "Official React state guide.",
  },
  reactRouter: {
    title: "React Router: Tutorial",
    url: "https://reactrouter.com/start/tutorial",
    publisher: "Remix Software",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["react", "routing"],
    status: "VERIFIED",
    verificationNote: "Official React Router tutorial.",
  },
  tsHandbook: {
    title: "TypeScript Handbook",
    url: "https://www.typescriptlang.org/docs/handbook/intro.html",
    publisher: "Microsoft",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["typescript", "types"],
    status: "VERIFIED",
    verificationNote: "Official TypeScript handbook.",
  },
  webdevA11y: {
    title: "web.dev: Learn Accessibility",
    url: "https://web.dev/learn/accessibility",
    publisher: "Google",
    type: "TUTORIAL",
    difficulty: "INTERMEDIATE",
    concepts: ["accessibility"],
    status: "VERIFIED",
    verificationNote: "Google web.dev accessibility course.",
  },
  webdevPerf: {
    title: "web.dev: Learn Performance",
    url: "https://web.dev/learn/performance",
    publisher: "Google",
    type: "TUTORIAL",
    difficulty: "INTERMEDIATE",
    concepts: ["performance"],
    status: "VERIFIED",
    verificationNote: "Google web.dev performance course.",
  },

  // --- Python & backend -----------------------------------------------------
  pythonDocs: {
    title: "The Python Tutorial",
    url: "https://docs.python.org/3/tutorial/",
    publisher: "Python Software Foundation",
    type: "OFFICIAL_DOCS",
    difficulty: "ABSOLUTE_BEGINNER",
    estimatedMinutes: 600,
    concepts: ["python"],
    status: "VERIFIED",
    verificationNote: "Official Python tutorial.",
  },
  automate: {
    title: "Automate the Boring Stuff with Python",
    url: "https://automatetheboringstuff.com/",
    publisher: "Al Sweigart",
    type: "TEXTBOOK",
    difficulty: "ABSOLUTE_BEGINNER",
    concepts: ["python", "automation"],
    isOpenLicense: true,
    license: "CC BY-NC-SA 3.0",
    status: "VERIFIED",
    verificationNote: "Free online edition of the book.",
  },
  realPython: {
    title: "Real Python tutorials",
    url: "https://realpython.com/",
    publisher: "Real Python",
    type: "TUTORIAL",
    difficulty: "INTERMEDIATE",
    concepts: ["python"],
    status: "VERIFIED",
    verificationNote: "Long-running Python tutorial site.",
  },
  pytestDocs: {
    title: "pytest documentation",
    url: "https://docs.pytest.org/",
    publisher: "pytest",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["python", "testing"],
    status: "VERIFIED",
    verificationNote: "Official pytest documentation.",
  },
  sqlbolt: {
    title: "SQLBolt: Learn SQL with interactive lessons",
    url: "https://sqlbolt.com/",
    publisher: "SQLBolt",
    type: "PRACTICE_EXERCISES",
    difficulty: "BEGINNER",
    concepts: ["sql", "databases"],
    status: "VERIFIED",
    verificationNote: "Interactive SQL lessons.",
  },
  pgTutorial: {
    title: "PostgreSQL Tutorial",
    url: "https://www.postgresql.org/docs/current/tutorial.html",
    publisher: "PostgreSQL Global Development Group",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["sql", "postgresql", "databases"],
    status: "VERIFIED",
    verificationNote: "Official PostgreSQL tutorial.",
  },
  fastapi: {
    title: "FastAPI Tutorial",
    url: "https://fastapi.tiangolo.com/tutorial/",
    publisher: "FastAPI",
    author: "Sebastian Ramirez",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["python", "api", "web"],
    status: "VERIFIED",
    verificationNote: "Official FastAPI tutorial.",
  },
  pydantic: {
    title: "Pydantic documentation",
    url: "https://docs.pydantic.dev/",
    publisher: "Pydantic",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["python", "validation"],
    status: "VERIFIED",
    verificationNote: "Official Pydantic documentation.",
  },
  docker: {
    title: "Docker: Get started",
    url: "https://docs.docker.com/get-started/",
    publisher: "Docker",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["docker", "containers", "deployment"],
    status: "VERIFIED",
    verificationNote: "Official Docker getting-started guide.",
  },
  ghActions: {
    title: "GitHub Actions documentation",
    url: "https://docs.github.com/en/actions",
    publisher: "GitHub",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["ci", "cd", "automation"],
    status: "VERIFIED",
    verificationNote: "Official GitHub Actions documentation.",
  },
  owasp: {
    title: "OWASP Top 10",
    url: "https://owasp.org/www-project-top-ten/",
    publisher: "OWASP",
    type: "REFERENCE",
    difficulty: "INTERMEDIATE",
    concepts: ["security", "web"],
    status: "VERIFIED",
    verificationNote: "Official OWASP Top 10 project.",
  },

  // --- Data analysis --------------------------------------------------------
  kaggle: {
    title: "Kaggle Learn",
    url: "https://www.kaggle.com/learn",
    publisher: "Kaggle",
    type: "TUTORIAL",
    difficulty: "BEGINNER",
    concepts: ["data-science", "python", "sql"],
    status: "VERIFIED",
    verificationNote: "Kaggle's free micro-courses.",
  },
  pandas: {
    title: "pandas: Getting started",
    url: "https://pandas.pydata.org/docs/getting_started/index.html",
    publisher: "pandas",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["python", "pandas", "data-analysis"],
    status: "VERIFIED",
    verificationNote: "Official pandas getting-started guide.",
  },
  numpy: {
    title: "NumPy: Absolute beginners guide",
    url: "https://numpy.org/doc/stable/user/absolute_beginners.html",
    publisher: "NumPy",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["python", "numpy", "arrays"],
    status: "VERIFIED",
    verificationNote: "Official NumPy beginners guide.",
  },
  matplotlib: {
    title: "Matplotlib tutorials",
    url: "https://matplotlib.org/stable/tutorials/index.html",
    publisher: "Matplotlib",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["python", "visualization"],
    status: "VERIFIED",
    verificationNote: "Official Matplotlib tutorials.",
  },
  seaborn: {
    title: "seaborn tutorial",
    url: "https://seaborn.pydata.org/tutorial.html",
    publisher: "seaborn",
    type: "OFFICIAL_DOCS",
    difficulty: "INTERMEDIATE",
    concepts: ["python", "visualization", "statistics"],
    status: "VERIFIED",
    verificationNote: "Official seaborn tutorial.",
  },
  khanStats: {
    title: "Khan Academy: Statistics and probability",
    url: "https://www.khanacademy.org/math/statistics-probability",
    publisher: "Khan Academy",
    type: "UNIVERSITY_COURSE",
    difficulty: "BEGINNER",
    concepts: ["statistics", "probability"],
    status: "VERIFIED",
    verificationNote: "Khan Academy statistics course.",
  },
  modeSql: {
    title: "Mode: SQL Tutorial",
    url: "https://mode.com/sql-tutorial/",
    publisher: "Mode",
    type: "TUTORIAL",
    difficulty: "BEGINNER",
    concepts: ["sql", "analytics"],
    status: "VERIFIED",
    verificationNote: "Mode Analytics SQL tutorial.",
  },
  jupyter: {
    title: "Project Jupyter",
    url: "https://jupyter.org/",
    publisher: "Project Jupyter",
    type: "OFFICIAL_DOCS",
    difficulty: "BEGINNER",
    concepts: ["python", "notebooks"],
    status: "VERIFIED",
    verificationNote: "Official Jupyter project site.",
  },
};

// ---------------------------------------------------------------------------
// Diagnostic + interview bank (standalone, not tied to a single path)
// ---------------------------------------------------------------------------

export const STANDALONE_ASSESSMENTS: StandaloneAssessmentDef[] = [
  {
    slug: "diagnostic-fundamentals",
    title: "Programming & web fundamentals diagnostic",
    description:
      "An optional mixed diagnostic across computing, web, programming and data fundamentals. Use it to test out of chapters you already know so you only study what is new.",
    type: "DIAGNOSTIC",
    passingScore: 70,
    timeLimitMinutes: 30,
    skillTags: ["web", "html", "css", "javascript", "python", "sql", "http", "git"],
    questions: [
      q(
        "What does a web browser do when you type a URL and press Enter?",
        "The browser resolves the host name via DNS, opens a connection to the server and sends an HTTP request, then renders the response.",
        [
          ["Resolves the host with DNS and requests the page over HTTP", true],
          ["Sends the URL directly to the site's database"],
          ["Compiles the URL into machine code"],
          ["Broadcasts the URL to every server on the internet"],
        ],
        { skillTags: ["web", "http"] },
      ),
      q(
        "Which HTML element best represents a self-contained piece of content, like a blog post?",
        "The <article> element is for self-contained, independently distributable content.",
        [
          ["<article>", true],
          ["<div>"],
          ["<span>"],
          ["<section>"],
        ],
        { skillTags: ["html"] },
      ),
      q(
        "In CSS, which property controls the space *inside* an element's border?",
        "`padding` is the space inside the border; `margin` is the space outside it.",
        [
          ["padding", true],
          ["margin"],
          ["border-spacing"],
          ["gap"],
        ],
        { skillTags: ["css"] },
      ),
      q(
        "What is the value of `typeof []` in JavaScript?",
        "Arrays are objects in JavaScript, so `typeof []` returns `\"object\"`.",
        [
          ['"object"', true],
          ['"array"'],
          ['"list"'],
          ["undefined"],
        ],
        { skillTags: ["javascript"] },
      ),
      q(
        "Which statement about `let` and `const` is correct?",
        "`const` prevents reassignment of the binding but does not make objects immutable.",
        [
          ["const prevents reassignment but not mutation of an object", true],
          ["const makes an object fully immutable"],
          ["let creates a constant that cannot change"],
          ["let is function-scoped; const is block-scoped"],
        ],
        { skillTags: ["javascript"] },
      ),
      q(
        "What does HTTP status code 404 mean?",
        "404 means the server could not find the requested resource.",
        [
          ["The requested resource was not found", true],
          ["The request was unauthorized"],
          ["The server had an internal error"],
          ["The request succeeded"],
        ],
        { skillTags: ["http", "web"] },
      ),
      q(
        "In Python, what is the result of `7 // 2`?",
        "`//` is floor division, so 7 // 2 is 3.",
        [["3", true], ["3.5"], ["4"], ["1"]],
        { skillTags: ["python"] },
      ),
      q(
        "Which SQL clause filters rows *after* aggregation?",
        "HAVING filters groups after GROUP BY; WHERE filters rows before aggregation.",
        [["HAVING", true], ["WHERE"], ["FILTER"], ["GROUP"]],
        { skillTags: ["sql"] },
      ),
      q(
        "What is a git commit?",
        "A commit is a snapshot of the staged changes with a message, forming a point in the project history.",
        [
          ["A snapshot of staged changes with a message", true],
          ["A copy of the whole repository on a server"],
          ["A request to merge two branches"],
          ["A file that lists dependencies"],
        ],
        { skillTags: ["git"] },
      ),
      q(
        "Why is testing your own code important?",
        "Tests catch regressions and document expected behaviour, letting you change code with confidence.",
        [
          ["They catch regressions and document expected behaviour", true],
          ["They make the program run faster at runtime"],
          ["They replace the need for code review"],
          ["They guarantee there are no bugs"],
        ],
        { skillTags: ["testing"] },
      ),
    ],
  },
  {
    slug: "interview-bank-core",
    title: "Core software interview question bank",
    description:
      "A bank of common interview questions drawn from the fundamentals. Answers are graded for self-assessment; use it to rehearse explanations out loud.",
    type: "INTERVIEW_BANK",
    passingScore: 60,
    timeLimitMinutes: 45,
    skillTags: ["javascript", "python", "sql", "http", "algorithms"],
    questions: [
      q(
        "Explain time complexity and give the average complexity of binary search.",
        "Time complexity describes how work grows with input size. Binary search is O(log n) on a sorted array.",
        [
          ["O(log n)", true],
          ["O(n)"],
          ["O(n log n)"],
          ["O(1)"],
        ],
        { skillTags: ["algorithms"], difficulty: "INTERMEDIATE" },
      ),
      q(
        "In JavaScript, why does `0.1 + 0.2 !== 0.3`?",
        "Floating-point numbers use binary fractions, so some decimals cannot be represented exactly and the sum is slightly off.",
        [
          ["Floating-point binary representation cannot represent these decimals exactly", true],
          ["JavaScript adds a hidden random value"],
          ["The + operator is broken for decimals"],
          ["0.1 and 0.2 are actually integers"],
        ],
        { skillTags: ["javascript"], difficulty: "INTERMEDIATE" },
      ),
      q(
        "What is a hash map and what is its average lookup complexity?",
        "A hash map stores key–value pairs indexed by a hash of the key, giving average O(1) lookup.",
        [["O(1) average", true], ["O(log n)"], ["O(n)"], ["O(n^2)"]],
        { skillTags: ["algorithms"], difficulty: "INTERMEDIATE" },
      ),
      q(
        "Why should you never store passwords in plain text?",
        "Storing plain text exposes every account if the database leaks. Store a salted, slow hash such as bcrypt or Argon2.",
        [
          ["A database leak would expose every password; use salted slow hashes", true],
          ["Plain text is slower to verify"],
          ["Databases cannot store strings"],
          ["It uses too much disk space"],
        ],
        { skillTags: ["security"], difficulty: "INTERMEDIATE" },
      ),
      q(
        "What is the difference between SQL and NoSQL databases?",
        "SQL databases use relational tables with a schema and SQL; NoSQL covers non-relational models like documents or key-value with flexible schemas.",
        [
          ["SQL is relational and schema-based; NoSQL covers non-relational models", true],
          ["SQL is faster in every case"],
          ["NoSQL cannot scale"],
          ["SQL databases cannot be indexed"],
        ],
        { skillTags: ["sql"], difficulty: "INTERMEDIATE" },
      ),
      q(
        "What does idempotency mean for an HTTP API?",
        "An idempotent request can be repeated with the same effect; GET, PUT and DELETE are idempotent, POST generally is not.",
        [
          ["Repeating the request has the same effect as sending it once", true],
          ["The request is always cached"],
          ["The request never changes data"],
          ["The server ignores repeated requests"],
        ],
        { skillTags: ["http"], difficulty: "INTERMEDIATE" },
      ),
      q(
        "Explain the difference between a process and a thread.",
        "Processes have independent memory; threads share their process's memory and are lighter to create but require synchronisation.",
        [
          ["Processes have separate memory; threads share memory within a process", true],
          ["Threads have separate memory; processes share memory"],
          ["They are identical"],
          ["Processes cannot run concurrently"],
        ],
        { skillTags: ["computer-science"], difficulty: "ADVANCED" },
      ),
      q(
        "How would you explain the difference between git merge and git rebase?",
        "Merge preserves history with a merge commit; rebase rewrites commits onto another base for a linear history, changing commit hashes.",
        [
          ["Merge keeps branches and adds a merge commit; rebase rewrites commits onto a new base", true],
          ["They are the same operation"],
          ["Merge deletes the branch history"],
          ["Rebase always causes conflicts"],
        ],
        { skillTags: ["git"], difficulty: "INTERMEDIATE" },
      ),
    ],
  },
];

// ---------------------------------------------------------------------------
// Career paths
// ---------------------------------------------------------------------------

const BASE_PATHS: PathDef[] = [
  // =========================================================================
  // 1. Frontend Developer
  // =========================================================================
  {
    slug: "frontend-developer",
    title: "Frontend Developer",
    summary:
      "Build interactive, accessible websites with HTML, CSS, JavaScript and React — from first principles to deployment.",
    description:
      "This path takes you from not knowing how the web works to building, testing and deploying modern front-end applications. You will learn semantic HTML and accessible CSS, the JavaScript language and the DOM, asynchronous data fetching, React with modern tooling, and the professional practices (version control, testing, accessibility, performance) that real teams expect. Every chapter pairs a strong primary resource with practice, and each module ends with an assessment so you can prove mastery before moving on.",
    level: "BEGINNER",
    estimatedHours: 400,
    order: 1,
    roles: [
      {
        slug: "frontend-developer-junior",
        title: "Junior Frontend Developer",
        description:
          "Builds user interfaces from designs, fixes bugs and ships features under review.",
        skills: [
          { name: "html", detail: "Semantic, accessible markup" },
          { name: "css", detail: "Layout with Flexbox and Grid" },
          { name: "javascript", detail: "Language fundamentals and DOM" },
          { name: "git", detail: "Branching and pull requests" },
          { name: "react", required: false, detail: "Component-based UI" },
        ],
      },
      {
        slug: "frontend-developer-mid",
        title: "Frontend Developer",
        description:
          "Owns features end to end, writes tests and cares about accessibility and performance.",
        skills: [
          { name: "react", detail: "Hooks and state management" },
          { name: "typescript", detail: "Typed component APIs" },
          { name: "testing", detail: "Unit and component tests" },
          { name: "accessibility", detail: "WCAG basics" },
          { name: "performance", detail: "Core Web Vitals" },
        ],
      },
    ],
    phases: [
      {
        slug: "web-foundations",
        title: "Web Foundations",
        summary:
          "How the web works, plus the two languages every page is built from: HTML and CSS.",
        description:
          "Before writing application code you need a solid mental model of the web and fluent HTML and CSS. This phase covers the request/response cycle, semantic markup, and the layout techniques that make interfaces responsive and accessible.",
        estimatedHours: 90,
        modules: [
          {
            slug: "how-the-web-works",
            title: "How the web works",
            summary: "The big picture of clients, servers and HTTP.",
            description:
              "Understand what actually happens between typing a URL and seeing a page, so later debugging makes sense.",
            estimatedMinutes: 120,
            completionCriteria:
              "You can describe the request/response cycle and the roles of DNS, HTTP and the browser.",
            objectives: [
              "Describe the client–server model of the web",
              "Explain DNS, HTTP and how a page is fetched and rendered",
            ],
            chapters: [
              {
                slug: "internet-and-the-web",
                title: "The internet and the web",
                summary:
                  "Clients, servers, DNS, HTTP and what a browser really does.",
                topic: "web-fundamentals",
                intro:
                  "The web is applications built on top of the internet. In this chapter you build a correct mental model: a browser (client) asks a server for a resource using HTTP, and DNS translates human names into addresses. Everything later — APIs, caching, performance — depends on this picture.",
                estimatedMinutes: 120,
                objectives: [
                  "Explain the client–server model and the role of HTTP",
                  "Describe what DNS does and why it matters",
                ],
                resources: [
                  link("mdnLearn", "PRIMARY", { isRequired: true }),
                  link("mdnHttp", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What does DNS do?",
                    "DNS translates a human-readable host name (like example.com) into an IP address the network can use.",
                    [
                      ["Translates host names into IP addresses", true],
                      ["Encrypts web traffic"],
                      ["Stores website files"],
                      ["Renders HTML into pixels"],
                    ],
                    { skillTags: ["web", "http"] },
                  ),
                  q(
                    "In the client–server model, which one usually initiates a request?",
                    "The client initiates requests; servers respond to them.",
                    [
                      ["The client", true],
                      ["The server"],
                      ["The database"],
                      ["The DNS resolver"],
                    ],
                    { skillTags: ["web"] },
                  ),
                ],
              },
            ],
            assessment: {
              skillTags: ["web", "http"],
              passingScore: 70,
            },
          },
          {
            slug: "html-fundamentals",
            title: "HTML fundamentals",
            summary:
              "Structure content with semantic, accessible HTML.",
            description:
              "HTML is the skeleton of every page. Learn to structure documents semantically and build forms that everyone can use.",
            estimatedMinutes: 480,
            prerequisiteSlugs: ["how-the-web-works"],
            completionCriteria:
              "You can build a valid, semantic page with headings, landmarks and an accessible form.",
            objectives: [
              "Structure documents with correct semantic elements",
              "Build accessible forms with labels and validation",
            ],
            chapters: [
              {
                slug: "html-document-structure",
                title: "Document structure and semantics",
                summary:
                  "Headings, landmarks, lists and why <div> is a last resort.",
                topic: "html-semantics",
                intro:
                  "Semantic HTML gives meaning to content, which helps screen readers, search engines and future maintainers. Prefer the most specific element that fits rather than a generic container.",
                objectives: [
                  "Use headings, landmarks and lists correctly",
                  "Choose semantic elements over generic containers",
                ],
                resources: [
                  link("mdnHtml", "PRIMARY", { isRequired: true }),
                  link("fcc", "EXERCISE"),
                ],
                quiz: [
                  q(
                    "Which element marks the main content of a page?",
                    "The <main> element identifies the dominant content of the document.",
                    [
                      ["<main>", true],
                      ["<body>"],
                      ["<div>"],
                      ["<section>"],
                    ],
                    { skillTags: ["html"] },
                  ),
                  q(
                    "Why prefer semantic elements like <nav> over <div class=\"nav\">?",
                    "Semantic elements convey meaning to assistive technology and other tools without relying on class names.",
                    [
                      ["They convey meaning to assistive technology", true],
                      ["They always render faster"],
                      ["They are required by HTML validators"],
                      ["They are shorter to type"],
                    ],
                    { skillTags: ["html", "accessibility"] },
                  ),
                ],
              },
              {
                slug: "accessible-forms",
                title: "Forms and accessibility",
                summary:
                  "Labels, inputs, validation and making forms usable by keyboard and screen reader.",
                topic: "html-forms",
                intro:
                  "Forms are where most users interact with your product. Correct labels, sensible input types and clear error messages make forms both accessible and pleasant.",
                estimatedMinutes: 240,
                objectives: [
                  "Associate labels with inputs correctly",
                  "Use input types and constraints for validation",
                ],
                resources: [
                  link("mdnForms", "PRIMARY", { isRequired: true }),
                  link("mdnA11y", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "How should a form input be labelled for screen readers?",
                    "A <label> element with a `for` attribute matching the input's id, or the input wrapped inside the label.",
                    [
                      ["A <label> linked via for/id or wrapping the input", true],
                      ["A placeholder is always enough"],
                      ["A title attribute"],
                      ["An adjacent <div> with text"],
                    ],
                    { skillTags: ["html", "accessibility", "forms"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["html", "accessibility", "forms"], passingScore: 70 },
          },
          {
            slug: "css-fundamentals",
            title: "CSS fundamentals",
            summary:
              "Selectors, the box model, Flexbox, Grid and responsive design.",
            description:
              "CSS turns structure into a usable interface. Learn the box model, then modern layout with Flexbox and Grid, then how to make it responsive.",
            estimatedMinutes: 600,
            prerequisiteSlugs: ["html-fundamentals"],
            completionCriteria:
              "You can build a responsive layout with Flexbox and Grid that adapts to mobile and desktop.",
            objectives: [
              "Explain and use the CSS box model",
              "Lay out pages with Flexbox and Grid",
              "Make layouts responsive without fixed widths",
            ],
            chapters: [
              {
                slug: "selectors-and-the-box-model",
                title: "Selectors and the box model",
                summary:
                  "How CSS targets elements and how margin, border and padding combine.",
                topic: "css-selectors",
                intro:
                  "Every element is a box. Understanding margin, border, padding and box-sizing removes most layout confusion before it starts.",
                estimatedMinutes: 240,
                objectives: [
                  "Use selectors and specificity deliberately",
                  "Explain the box model and box-sizing",
                ],
                resources: [
                  link("mdnCss", "PRIMARY", { isRequired: true }),
                  link("fcc", "EXERCISE"),
                ],
                quiz: [
                  q(
                    "Which box-model part is *outside* the border?",
                    "`margin` is the space outside the border.",
                    [
                      ["margin", true],
                      ["padding"],
                      ["content"],
                      ["gap"],
                    ],
                    { skillTags: ["css"] },
                  ),
                  q(
                    "What does `box-sizing: border-box` change?",
                    "It makes width and height include padding and border, so boxes are easier to size.",
                    [
                      ["Width and height include padding and border", true],
                      ["It removes all margins"],
                      ["It disables borders"],
                      ["It centres the element"],
                    ],
                    { skillTags: ["css"] },
                  ),
                ],
              },
              {
                slug: "layout-with-flexbox-and-grid",
                title: "Layout with Flexbox and Grid",
                summary:
                  "One-dimensional Flexbox and two-dimensional Grid.",
                topic: "css-layout",
                intro:
                  "Flexbox distributes space along one axis; Grid places items in two dimensions. Knowing which to reach for is most of modern layout.",
                estimatedMinutes: 240,
                objectives: [
                  "Distribute space along an axis with Flexbox",
                  "Define rows and columns with Grid",
                ],
                resources: [
                  link("mdnCssLayout", "PRIMARY", { isRequired: true }),
                  link("mdnCss", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Flexbox is best described as which kind of layout tool?",
                    "Flexbox is one-dimensional: it lays items out along a single axis.",
                    [
                      ["One-dimensional (a row or a column)", true],
                      ["Two-dimensional grid"],
                      ["A printing tool"],
                      ["A database query language"],
                    ],
                    { skillTags: ["css"] },
                  ),
                  q(
                    "Which display value gives you two-dimensional layout?",
                    "`display: grid` arranges items in rows and columns.",
                    [
                      ["grid", true],
                      ["flex"],
                      ["block"],
                      ["inline"],
                    ],
                    { skillTags: ["css"] },
                  ),
                ],
              },
              {
                slug: "responsive-design",
                title: "Responsive design",
                summary:
                  "Media queries, fluid units and mobile-first thinking.",
                topic: "css-responsive",
                intro:
                  "Users visit on every screen size. Learn to build layouts that adapt fluidly and to use media queries to change the design at sensible breakpoints.",
                estimatedMinutes: 120,
                objectives: [
                  "Use relative units and flexible layouts",
                  "Write media queries for sensible breakpoints",
                ],
                resources: [
                  link("mdnCssLayout", "PRIMARY", { isRequired: true }),
                  link("mdnCss", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Why is a mobile-first approach usually recommended?",
                    "Starting from the smallest screen encourages a simple, focused base layout that scales up.",
                    [
                      ["It keeps the base layout simple and focused", true],
                      ["Mobile devices are more important"],
                      ["Desktop browsers cannot handle media queries"],
                      ["It removes the need for CSS"],
                    ],
                    { skillTags: ["css", "responsive"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["css", "responsive"], passingScore: 70 },
          },
        ],
      },
      {
        slug: "javascript",
        title: "JavaScript",
        summary:
          "The language of the web: fundamentals, the DOM, and asynchronous data.",
        description:
          "JavaScript brings pages to life. This phase covers the language core, manipulating the DOM, handling events and forms, and fetching data asynchronously.",
        estimatedHours: 120,
        modules: [
          {
            slug: "javascript-basics",
            title: "JavaScript basics",
            summary: "Values, control flow, functions and collections.",
            description:
              "Build fluency in the language itself before touching frameworks.",
            estimatedMinutes: 600,
            prerequisiteSlugs: ["css-fundamentals"],
            completionCriteria:
              "You can write functions that manipulate arrays and objects and reason about types and scope.",
            objectives: [
              "Use data types, operators and control flow",
              "Write functions and work with arrays and objects",
            ],
            chapters: [
              {
                slug: "values-types-and-control-flow",
                title: "Values, types and control flow",
                summary:
                  "Numbers, strings, booleans, conditionals and loops.",
                topic: "javascript-basics",
                intro:
                  "Start with the primitives and how to branch and repeat. Getting these right early prevents a lot of subtle bugs.",
                estimatedMinutes: 240,
                objectives: [
                  "Distinguish primitive types and reason about coercion",
                  "Write conditionals and loops",
                ],
                resources: [
                  link("jsInfo", "PRIMARY", { isRequired: true }),
                  link("mdnJs", "ALTERNATIVE"),
                  link("fcc", "EXERCISE"),
                ],
                quiz: [
                  q(
                    "What is `typeof []` in JavaScript?",
                    "Arrays are objects, so `typeof []` is `\"object\"`.",
                    [
                      ['"object"', true],
                      ['"array"'],
                      ['"list"'],
                      ["undefined"],
                    ],
                    { skillTags: ["javascript"] },
                  ),
                  q(
                    "Which operator checks equality *without* type coercion?",
                    "`===` is strict equality: it does not coerce types.",
                    [
                      ["===", true],
                      ["=="],
                      ["="],
                      ["!="],
                    ],
                    { skillTags: ["javascript"] },
                  ),
                ],
              },
              {
                slug: "functions-and-collections",
                title: "Functions, arrays and objects",
                summary:
                  "Functions, scope, and array methods like map and filter.",
                topic: "javascript-functions",
                intro:
                  "Functions are values in JavaScript. Learn scope and closures, then the array methods that replace most loops.",
                estimatedMinutes: 360,
                objectives: [
                  "Write functions and understand scope and closures",
                  "Transform data with map, filter and reduce",
                ],
                resources: [
                  link("jsInfo", "PRIMARY", { isRequired: true }),
                  link("fcc", "EXERCISE"),
                ],
                quiz: [
                  q(
                    "Which array method returns a new array of the same length, transforming each item?",
                    "`map` transforms each element and returns a new array of the same length.",
                    [
                      ["map", true],
                      ["filter"],
                      ["reduce"],
                      ["forEach"],
                    ],
                    { skillTags: ["javascript"] },
                  ),
                  q(
                    "What does `filter` return?",
                    "`filter` returns a new array containing only the elements for which the callback returned true.",
                    [
                      ["A new array of elements that passed the test", true],
                      ["A single boolean"],
                      ["The first matching element"],
                      ["The number of matches"],
                    ],
                    { skillTags: ["javascript"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["javascript"], passingScore: 70 },
          },
          {
            slug: "dom-and-events",
            title: "The DOM and events",
            summary: "Selecting elements, reacting to events and validating forms.",
            description:
              "Connect JavaScript to the page: read and change the DOM, and respond to user input.",
            estimatedMinutes: 360,
            prerequisiteSlugs: ["javascript-basics"],
            completionCriteria:
              "You can build an interactive widget that reads input, updates the DOM and validates a form.",
            objectives: [
              "Select and modify DOM elements",
              "Handle events and validate form input",
            ],
            chapters: [
              {
                slug: "selecting-and-updating-the-dom",
                title: "Selecting and updating the DOM",
                summary: "querySelector, creating elements and updating text.",
                topic: "dom-and-events",
                intro:
                  "The DOM is the browser's live model of the page. Learn to query it and update it safely.",
                estimatedMinutes: 240,
                objectives: [
                  "Select elements with querySelector",
                  "Create and update elements without innerHTML pitfalls",
                ],
                resources: [
                  link("mdnDom", "PRIMARY", { isRequired: true }),
                  link("jsInfo", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which method returns the first element matching a CSS selector?",
                    "`document.querySelector` returns the first match.",
                    [
                      ["document.querySelector", true],
                      ["document.querySelectorAll"],
                      ["document.getElementsByTagName"],
                      ["document.firstChild"],
                    ],
                    { skillTags: ["javascript", "dom"] },
                  ),
                ],
              },
              {
                slug: "events-and-form-validation",
                title: "Events and form validation",
                summary: "Listening to events and validating input in the browser.",
                topic: "forms-and-validation",
                intro:
                  "Events are how the page reacts to the user. Add listeners, prevent default behaviour and validate input before submission.",
                estimatedMinutes: 120,
                objectives: [
                  "Attach event listeners and handle events",
                  "Validate form input on the client",
                ],
                resources: [
                  link("mdnForms", "PRIMARY", { isRequired: true }),
                  link("mdnDom", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What does `event.preventDefault()` do?",
                    "It stops the browser's default action for that event, such as submitting a form.",
                    [
                      ["Stops the browser's default action for the event", true],
                      ["Stops the event from bubbling"],
                      ["Removes the event listener"],
                      ["Reloads the page"],
                    ],
                    { skillTags: ["javascript", "dom"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["javascript", "dom"], passingScore: 70 },
          },
          {
            slug: "async-javascript",
            title: "Asynchronous JavaScript",
            summary: "Promises, async/await and fetching data from APIs.",
            description:
              "Real apps load data over the network. Learn promises, async/await and the Fetch API.",
            estimatedMinutes: 360,
            prerequisiteSlugs: ["dom-and-events"],
            completionCriteria:
              "You can fetch JSON from an API, handle errors and render the results.",
            objectives: [
              "Use promises and async/await",
              "Fetch and handle data from a web API",
            ],
            chapters: [
              {
                slug: "promises-and-async-await",
                title: "Promises and async/await",
                summary: "Reasoning about code that completes later.",
                topic: "javascript-promises",
                intro:
                  "Network calls take time. Promises model values that arrive later, and async/await makes them readable.",
                estimatedMinutes: 240,
                objectives: [
                  "Understand the promise lifecycle",
                  "Write asynchronous code with async/await and handle errors",
                ],
                resources: [
                  link("jsInfo", "PRIMARY", { isRequired: true }),
                  link("mdnJs", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What does `await` do inside an async function?",
                    "It pauses the async function until the awaited promise settles, without blocking the whole program.",
                    [
                      ["Pauses the async function until the promise settles", true],
                      ["Blocks the entire browser"],
                      ["Converts the promise into a callback"],
                      ["Cancels the promise"],
                    ],
                    { skillTags: ["javascript", "async"] },
                  ),
                ],
              },
              {
                slug: "fetching-data",
                title: "Fetching data from APIs",
                summary: "Using the Fetch API and JSON to talk to servers.",
                topic: "async-and-fetch",
                intro:
                  "The Fetch API is the browser's modern way to make HTTP requests. Learn to request JSON, check status codes and handle failures.",
                estimatedMinutes: 120,
                objectives: [
                  "Make HTTP requests with fetch",
                  "Parse JSON responses and handle errors",
                ],
                resources: [
                  link("mdnFetch", "PRIMARY", { isRequired: true }),
                  link("jsInfo", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "`fetch` resolves even when the server returns a 404. What must you check?",
                    "`fetch` only rejects on network failure, so you must check `response.ok` or `response.status`.",
                    [
                      ["response.ok or response.status", true],
                      ["response.error"],
                      ["The promise always rejects on 404"],
                      ["response.json() throws on 404"],
                    ],
                    { skillTags: ["javascript", "http", "async"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["javascript", "async", "http"], passingScore: 70 },
          },
        ],
      },
      {
        slug: "tooling-and-react",
        title: "Tooling and React",
        summary:
          "Version control, package management and building UIs with React.",
        description:
          "Move from writing scripts to building applications: manage code with Git, manage dependencies with npm, and build component-based UIs with React.",
        estimatedHours: 130,
        modules: [
          {
            slug: "git-and-npm",
            title: "Git and npm",
            summary: "Version control and the Node package ecosystem.",
            description:
              "Professional work requires version control and dependency management. Learn Git workflows and npm.",
            estimatedMinutes: 300,
            prerequisiteSlugs: ["async-javascript"],
            completionCriteria:
              "You can create a repository, commit work and install and script dependencies with npm.",
            objectives: [
              "Use Git to track and share work",
              "Manage project dependencies with npm",
            ],
            chapters: [
              {
                slug: "version-control-with-git",
                title: "Version control with Git",
                summary: "Commits, branches and pull requests.",
                topic: "git-basics",
                intro:
                  "Git records the history of your project so you can experiment safely and collaborate. Learn the core workflow teams use every day.",
                estimatedMinutes: 180,
                objectives: [
                  "Record work with commits and branches",
                  "Collaborate with remotes and pull requests",
                ],
                resources: [
                  link("gitBook", "PRIMARY", { isRequired: true }),
                  link("githubSkills", "EXERCISE"),
                ],
                quiz: [
                  q(
                    "What is a branch in Git?",
                    "A branch is a lightweight movable pointer to a line of commits, letting you work on changes in isolation.",
                    [
                      ["A movable pointer to a line of commits", true],
                      ["A full copy of the repository on disk"],
                      ["A backup of the database"],
                      ["A type of merge conflict"],
                    ],
                    { skillTags: ["git"] },
                  ),
                  q(
                    "What does a pull request typically do?",
                    "It proposes merging changes from one branch into another and enables review and discussion.",
                    [
                      ["Proposes merging changes and enables review", true],
                      ["Downloads the latest code"],
                      ["Deletes the branch"],
                      ["Runs the test suite automatically"],
                    ],
                    { skillTags: ["git", "github"] },
                  ),
                ],
              },
              {
                slug: "npm-and-project-tooling",
                title: "npm and project tooling",
                summary: "Packages, package.json and build tools like Vite.",
                topic: "npm-tooling",
                intro:
                  "Modern front-end projects rely on package managers and bundlers. Learn how dependencies are declared and how a dev server runs your code.",
                estimatedMinutes: 120,
                objectives: [
                  "Understand package.json and dependencies",
                  "Run a dev server with a build tool",
                ],
                resources: [
                  link("npmDocs", "PRIMARY", { isRequired: true }),
                  link("vite", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What is the difference between dependencies and devDependencies?",
                    "dependencies are needed at runtime; devDependencies are only needed for development and building.",
                    [
                      ["devDependencies are only needed for development", true],
                      ["They are identical"],
                      ["dependencies are only for testing"],
                      ["devDependencies ship to production"],
                    ],
                    { skillTags: ["tooling", "javascript"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["git", "tooling"], passingScore: 70 },
          },
          {
            slug: "react-fundamentals",
            title: "React fundamentals",
            summary: "Components, props, state and effects.",
            description:
              "React lets you build UIs from small, reusable components. Learn JSX, props, state and side effects.",
            estimatedMinutes: 600,
            prerequisiteSlugs: ["git-and-npm"],
            completionCriteria:
              "You can build a small data-driven React app with state and data fetching.",
            objectives: [
              "Build components with JSX and props",
              "Manage state and render lists and events",
              "Fetch data inside components with effects",
            ],
            chapters: [
              {
                slug: "components-and-jsx",
                title: "Components and JSX",
                summary: "Thinking in components and writing JSX.",
                topic: "react-components",
                intro:
                  "A React app is a tree of components. Learn how JSX maps to elements and how to compose reusable pieces.",
                estimatedMinutes: 180,
                objectives: [
                  "Write function components with JSX",
                  "Compose components and pass props",
                ],
                resources: [
                  link("react", "PRIMARY", { isRequired: true }),
                  link("reactRouter", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What is JSX?",
                    "JSX is a syntax that looks like HTML and compiles to function calls that create React elements.",
                    [
                      ["A syntax that compiles to React element creation", true],
                      ["A CSS preprocessor"],
                      ["A database query language"],
                      ["A type of package manager"],
                    ],
                    { skillTags: ["react"] },
                  ),
                ],
              },
              {
                slug: "state-and-events",
                title: "State and events",
                summary: "useState, event handling and rendering lists.",
                topic: "react-state",
                intro:
                  "State is data that changes over time and drives re-renders. Learn to manage it with hooks and to render lists safely with keys.",
                estimatedMinutes: 240,
                objectives: [
                  "Manage local state with useState",
                  "Handle events and render lists with keys",
                ],
                resources: [
                  link("react", "PRIMARY", { isRequired: true }),
                  link("reactState", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Why does React need a `key` when rendering lists?",
                    "Keys help React identify which items changed, were added or removed, keeping reconciliation correct and efficient.",
                    [
                      ["To identify items across renders", true],
                      ["To style list items"],
                      ["To sort the list automatically"],
                      ["Keys are optional and do nothing"],
                    ],
                    { skillTags: ["react"] },
                  ),
                  q(
                    "What does calling a state setter from useState do?",
                    "It schedules a re-render with the new state value.",
                    [
                      ["Schedules a re-render with the new value", true],
                      ["Mutates the DOM directly"],
                      ["Reloads the page"],
                      ["Deletes the component"],
                    ],
                    { skillTags: ["react"] },
                  ),
                ],
              },
              {
                slug: "effects-and-data",
                title: "Effects and data fetching",
                summary: "useEffect, dependency arrays and fetching in components.",
                topic: "react-effects",
                intro:
                  "Effects let components synchronise with the outside world — such as fetching data. Learn the dependency array and how to clean up.",
                estimatedMinutes: 180,
                objectives: [
                  "Synchronise with external systems using useEffect",
                  "Fetch data safely and handle loading and error states",
                ],
                resources: [
                  link("react", "PRIMARY", { isRequired: true }),
                  link("reactState", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What does the dependency array of useEffect control?",
                    "It controls when the effect re-runs: it re-runs when any listed value changes.",
                    [
                      ["When the effect re-runs", true],
                      ["Which DOM nodes render"],
                      ["The styling of the component"],
                      ["The order of the components"],
                    ],
                    { skillTags: ["react"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["react"], passingScore: 70 },
          },
        ],
      },
      {
        slug: "professional-practice",
        title: "Professional practice",
        summary:
          "Testing, accessibility, performance and shipping your work.",
        description:
          "What separates a hobby project from professional work: tests, accessibility, performance budgets and a deployment pipeline.",
        estimatedHours: 90,
        modules: [
          {
            slug: "testing",
            title: "Testing front-end code",
            summary: "Unit and component tests with Vitest and Testing Library.",
            description:
              "Write tests that give you confidence to change code.",
            estimatedMinutes: 240,
            prerequisiteSlugs: ["react-fundamentals"],
            completionCriteria:
              "You can write unit and component tests that would fail if the behaviour broke.",
            objectives: [
              "Write unit tests for pure logic",
              "Test components through their user-visible behaviour",
            ],
            chapters: [
              {
                slug: "unit-testing",
                title: "Unit testing",
                summary: "Testing pure functions with Vitest.",
                topic: "testing-basics",
                intro:
                  "Unit tests pin down small pieces of logic. Learn the arrange–act–assert structure and how to run Vitest.",
                estimatedMinutes: 120,
                objectives: [
                  "Structure tests with arrange, act, assert",
                  "Run and read test output",
                ],
                resources: [
                  link("vitest", "PRIMARY", { isRequired: true }),
                  link("testingLib", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What are the three common phases of a unit test?",
                    "Arrange the inputs, act by calling the code, assert the outcome.",
                    [
                      ["Arrange, act, assert", true],
                      ["Compile, run, deploy"],
                      ["Fetch, parse, render"],
                      ["Open, edit, save"],
                    ],
                    { skillTags: ["testing"] },
                  ),
                ],
              },
              {
                slug: "component-testing",
                title: "Component testing",
                summary: "Testing React components by their behaviour.",
                topic: "component-testing",
                intro:
                  "Test what the user sees and does, not implementation details. Query the DOM the way a user would.",
                estimatedMinutes: 120,
                objectives: [
                  "Query elements by role and accessible name",
                  "Assert on user-visible behaviour",
                ],
                resources: [
                  link("testingLib", "PRIMARY", { isRequired: true }),
                  link("vitest", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Why is querying by role preferred in Testing Library?",
                    "It mirrors how users and assistive technology find elements, so tests focus on accessible behaviour.",
                    [
                      ["It mirrors how users find elements", true],
                      ["It is faster than other queries"],
                      ["It avoids needing a DOM"],
                      ["It is required by React"],
                    ],
                    { skillTags: ["testing", "accessibility"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["testing"], passingScore: 70 },
          },
          {
            slug: "accessibility-and-performance",
            title: "Accessibility and performance",
            summary: "Building for everyone, fast.",
            description:
              "Accessibility and performance are correctness, not polish. Learn the essentials.",
            estimatedMinutes: 240,
            prerequisiteSlugs: ["testing"],
            completionCriteria:
              "You can audit a page for accessibility issues and measure and improve its load performance.",
            objectives: [
              "Apply WCAG principles with semantic HTML and keyboard support",
              "Measure and improve Core Web Vitals",
            ],
            chapters: [
              {
                slug: "web-accessibility",
                title: "Web accessibility essentials",
                summary: "WCAG, semantics, keyboard and contrast.",
                topic: "accessibility-basics",
                intro:
                  "Accessible sites work for everyone. Learn the core practices: semantic HTML, keyboard operability, colour contrast and visible focus.",
                estimatedMinutes: 120,
                objectives: [
                  "Understand the four WCAG principles",
                  "Make interfaces keyboard-operable with visible focus",
                ],
                resources: [
                  link("webdevA11y", "PRIMARY", { isRequired: true }),
                  link("mdnA11y", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What are the four WCAG principles remembered as POUR?",
                    "Perceivable, Operable, Understandable, Robust.",
                    [
                      ["Perceivable, Operable, Understandable, Robust", true],
                      ["Public, Open, Usable, Responsive"],
                      ["Parsed, Ordered, Unified, Reliable"],
                      ["Pretty, Optimal, Unique, Readable"],
                    ],
                    { skillTags: ["accessibility"] },
                  ),
                ],
              },
              {
                slug: "web-performance",
                title: "Web performance",
                summary: "Core Web Vitals and measuring real experience.",
                topic: "web-performance",
                intro:
                  "Performance affects conversion and accessibility on slow devices. Learn the Core Web Vitals and how to measure them.",
                estimatedMinutes: 120,
                objectives: [
                  "Name and explain the Core Web Vitals",
                  "Identify common performance bottlenecks",
                ],
                resources: [
                  link("webdevPerf", "PRIMARY", { isRequired: true }),
                ],
                quiz: [
                  q(
                    "Which metric measures how quickly the main content of a page appears?",
                    "Largest Contentful Paint (LCP) measures when the largest content element is rendered.",
                    [
                      ["Largest Contentful Paint (LCP)", true],
                      ["Cumulative Layout Shift (CLS)"],
                      ["Interaction to Next Paint (INP)"],
                      ["DNS lookup time"],
                    ],
                    { skillTags: ["performance"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["accessibility", "performance"], passingScore: 70 },
          },
          {
            slug: "shipping",
            title: "Shipping your work",
            summary: "Building for production and deploying.",
            description:
              "Turn your project into a live, shareable URL with a production build.",
            estimatedMinutes: 120,
            prerequisiteSlugs: ["accessibility-and-performance"],
            completionCriteria:
              "You can produce a production build and deploy it to a static host or platform.",
            objectives: [
              "Explain what a production build does",
              "Deploy a front-end app and share the URL",
            ],
            chapters: [
              {
                slug: "build-and-deploy",
                title: "Build and deploy",
                summary: "Production builds and static hosting.",
                topic: "build-and-deploy",
                intro:
                  "A production build minifies and bundles your code. Learn to build and deploy so others can use your work.",
                estimatedMinutes: 120,
                objectives: [
                  "Run a production build and inspect the output",
                  "Deploy the build to a host",
                ],
                resources: [
                  link("vite", "PRIMARY", { isRequired: true }),
                  link("ghActions", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What is the main purpose of a production build?",
                    "It bundles, minifies and optimises code for fast loading in browsers.",
                    [
                      ["Bundle and optimise code for fast loading", true],
                      ["Run automated tests"],
                      ["Store data in a database"],
                      ["Write documentation"],
                    ],
                    { skillTags: ["tooling", "deployment"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["deployment", "tooling"], passingScore: 70 },
          },
        ],
      },
    ],
    projects: [
      {
        slug: "frontend-personal-portfolio",
        title: "Personal portfolio page",
        level: "BEGINNER",
        summary:
          "A responsive, accessible single-page portfolio built with semantic HTML and CSS.",
        description:
          "Build a personal portfolio that presents who you are, what you have built and how to contact you. This project cements HTML, CSS and responsive layout without a framework.",
        objectives: [
          "Structure a page with semantic HTML",
          "Build a responsive layout with Flexbox and Grid",
          "Meet basic accessibility requirements",
        ],
        requirements:
          "A single page with a header, an about section, a projects grid with at least three cards, and a contact section. Use semantic elements, relative units and at least one media query. All images need alt text and colour contrast must meet WCAG AA.",
        acceptanceCriteria: [
          "Passes an automated accessibility check with no critical issues",
          "Layout is usable at 360px, 768px and 1440px widths",
          "No horizontal scrolling on any breakpoint",
        ],
        milestones: [
          { title: "Content and structure", detail: "Write the copy and mark it up semantically." },
          { title: "Styling and layout", detail: "Apply CSS and responsive layout." },
          { title: "Accessibility pass", detail: "Fix contrast, focus and alt text." },
        ],
        starterResources: ["mdnHtml", "mdnCss", "webdevA11y"],
        hints: [
          "Start mobile-first and add breakpoints as the layout breaks.",
          "Use CSS Grid for the projects section.",
        ],
        submissionInstructions:
          "Publish the site and paste the live URL. Include a short note on the accessibility choices you made.",
        rubric: [
          { criterion: "Semantic, valid HTML", weight: 30, description: "Appropriate elements and no validation errors." },
          { criterion: "Responsive layout", weight: 40, description: "Works across the required widths." },
          { criterion: "Accessibility", weight: 30, description: "Contrast, focus, alt text, keyboard use." },
        ],
        extensions: [
          "Add a dark theme using prefers-color-scheme.",
          "Add a small JavaScript filter for the projects grid.",
        ],
      },
      {
        slug: "frontend-task-app",
        title: "Task tracker app (React)",
        level: "INTERMEDIATE",
        summary:
          "A React app that lets users add, complete and filter tasks, with tests.",
        description:
          "Build a client-side task tracker with React to practise components, state, lists and effects. Persist tasks to localStorage and write component tests.",
        objectives: [
          "Build a data-driven React UI",
          "Manage state and render dynamic lists",
          "Test user-visible behaviour",
        ],
        requirements:
          "Users can add a task, mark it complete, delete it and filter by status. Persist tasks between reloads. Include at least five component tests covering add, complete, delete and filter.",
        acceptanceCriteria: [
          "All specified interactions work",
          "Tasks persist across reloads",
          "Tests pass and cover the main flows",
        ],
        milestones: [
          { title: "Static UI", detail: "Render the list and form with mock data." },
          { title: "State and logic", detail: "Add, complete, delete and filter." },
          { title: "Persistence and tests", detail: "localStorage and component tests." },
        ],
        starterResources: ["react", "reactState", "vitest", "testingLib"],
        hints: [
          "Keep state in one place and derive filtered lists with useMemo or inline.",
          "Query by role and accessible name in tests.",
        ],
        submissionInstructions:
          "Share the repository and a short README describing how to run it and the tests.",
        rubric: [
          { criterion: "Correct interactions", weight: 40, description: "Add, complete, delete, filter all work." },
          { criterion: "Code structure", weight: 30, description: "Sensible component boundaries and state." },
          { criterion: "Tests", weight: 30, description: "Meaningful, passing component tests." },
        ],
        extensions: ["Add due dates and sorting.", "Sync tasks to a simple API."],
      },
    ],
  },

  // =========================================================================
  // 2. Backend Developer (Python)
  // =========================================================================
  {
    slug: "backend-python",
    title: "Backend Developer (Python)",
    summary:
      "Go from programming basics to building, testing and deploying production Python web APIs.",
    description:
      "This path builds a backend developer from the ground up using Python. You will learn the language core, data structures, object-oriented and modular design, how the web and HTTP work, relational databases and SQL, building APIs with FastAPI, and the testing, containerisation and deployment practices that production systems require. Each module ends with an assessment, and the projects build a portfolio you can take to interviews.",
    level: "BEGINNER",
    estimatedHours: 420,
    order: 2,
    roles: [
      {
        slug: "backend-python-junior",
        title: "Junior Python Developer",
        description:
          "Implements endpoints and scripts, writes tests and fixes bugs under guidance.",
        skills: [
          { name: "python", detail: "Language and standard library" },
          { name: "git", detail: "Version control basics" },
          { name: "sql", detail: "Queries against a relational database" },
          { name: "http", detail: "Request/response and status codes" },
        ],
      },
      {
        slug: "backend-python-engineer",
        title: "Backend Engineer (Python)",
        description:
          "Designs APIs and data models, owns reliability and deploys services.",
        skills: [
          { name: "api-design", detail: "REST resource modelling" },
          { name: "databases", detail: "Schema design and indexing" },
          { name: "testing", detail: "pytest and test design" },
          { name: "docker", detail: "Containers and images" },
          { name: "security", detail: "Auth and OWASP basics" },
        ],
      },
    ],
    phases: [
      {
        slug: "programming-foundations",
        title: "Programming Foundations",
        summary:
          "How computers run code, the command line, Git and your first Python.",
        description:
          "Before frameworks, build a sound foundation: a mental model of computation, comfort at the command line, version control, and the core of the Python language.",
        estimatedHours: 110,
        modules: [
          {
            slug: "how-computers-run-code",
            title: "How computers run code",
            summary: "A mental model of programs, the shell and Git.",
            description:
              "Understand what a program is, how to drive a computer from the shell, and how to track changes with Git.",
            estimatedMinutes: 300,
            completionCriteria:
              "You can navigate a shell confidently and commit and branch a project in Git.",
            objectives: [
              "Describe how source code becomes a running program",
              "Use the command line for everyday tasks",
              "Track work with Git",
            ],
            chapters: [
              {
                slug: "what-is-programming",
                title: "What is programming?",
                summary: "Instructions, execution and the role of a language.",
                topic: "programming-intro",
                intro:
                  "A program is a precise sequence of instructions a computer executes. Languages give us ways to express logic that a computer can run. This chapter builds the mental model the rest of the path assumes.",
                estimatedMinutes: 120,
                objectives: [
                  "Explain the relationship between source code and execution",
                  "Distinguish interpreted and compiled languages at a high level",
                ],
                resources: [
                  link("cs50", "PRIMARY", { isRequired: true }),
                  link("pythonDocs", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What is a program, most fundamentally?",
                    "A program is a precise sequence of instructions that a computer executes.",
                    [
                      ["A precise sequence of instructions", true],
                      ["A database of facts"],
                      ["A type of hardware"],
                      ["A network protocol"],
                    ],
                    { skillTags: ["computer-science"] },
                  ),
                ],
              },
              {
                slug: "command-line-basics",
                title: "Command line basics",
                summary: "Navigating files and running programs from the shell.",
                topic: "linux-cli",
                intro:
                  "The shell is the most direct way to work with a computer. Learn to move around the file system and run commands — skills you will use constantly.",
                estimatedMinutes: 90,
                objectives: [
                  "Navigate directories and manage files from the shell",
                  "Run commands and understand exit codes",
                ],
                resources: [
                  link("cs50", "PRIMARY", { isRequired: true }),
                  link("odin", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which command lists the contents of the current directory on most Unix-like shells?",
                    "`ls` lists directory contents.",
                    [
                      ["ls", true],
                      ["cd"],
                      ["rm"],
                      ["pwd"],
                    ],
                    { skillTags: ["computer-science"] },
                  ),
                ],
              },
              {
                slug: "git-and-github",
                title: "Git and GitHub",
                summary: "Commits, branches and collaborating through pull requests.",
                topic: "git-basics",
                intro:
                  "Version control is non-negotiable for real projects. Learn the Git workflow you will use on every team.",
                estimatedMinutes: 90,
                objectives: [
                  "Commit and branch with Git",
                  "Push to a remote and open a pull request",
                ],
                resources: [
                  link("gitBook", "PRIMARY", { isRequired: true }),
                  link("githubSkills", "EXERCISE"),
                ],
                quiz: [
                  q(
                    "What does `git commit` create?",
                    "A commit creates a snapshot of the staged changes with a message in the project history.",
                    [
                      ["A snapshot of staged changes with a message", true],
                      ["A remote repository"],
                      ["A new branch"],
                      ["A merge conflict"],
                    ],
                    { skillTags: ["git"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["computer-science", "git"], passingScore: 70 },
          },
          {
            slug: "first-python-steps",
            title: "First steps in Python",
            summary: "Installing Python, variables, types and control flow.",
            description:
              "Write your first real programs: values, types, conditionals and loops in Python.",
            estimatedMinutes: 360,
            prerequisiteSlugs: ["how-computers-run-code"],
            completionCriteria:
              "You can write small Python scripts that branch, loop and handle user input.",
            objectives: [
              "Run Python and use the REPL",
              "Use variables, types and operators",
              "Write conditionals and loops",
            ],
            chapters: [
              {
                slug: "getting-started-with-python",
                title: "Getting started with Python",
                summary: "Installing Python and running your first program.",
                topic: "python-basics",
                intro:
                  "Set up Python and run code in the REPL and from files. This chapter removes any friction from getting code to actually execute.",
                estimatedMinutes: 120,
                objectives: [
                  "Install Python and verify the version",
                  "Run code via the REPL and script files",
                ],
                resources: [
                  link("pythonDocs", "PRIMARY", { isRequired: true }),
                  link("automate", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What is the Python REPL?",
                    "The read-eval-print loop is an interactive prompt where each expression is evaluated as you type it.",
                    [
                      ["An interactive prompt that evaluates expressions as you type", true],
                      ["A compiled binary"],
                      ["A package manager"],
                      ["A testing framework"],
                    ],
                    { skillTags: ["python"] },
                  ),
                ],
              },
              {
                slug: "variables-and-types",
                title: "Variables and types",
                summary: "Names, numbers, strings and dynamic typing.",
                topic: "python-basics",
                intro:
                  "Python is dynamically typed: names refer to objects of various types. Learn the core types and how operations behave.",
                estimatedMinutes: 120,
                objectives: [
                  "Use numbers, strings and booleans",
                  "Explain dynamic typing and type conversion",
                ],
                resources: [
                  link("pythonDocs", "PRIMARY", { isRequired: true }),
                  link("realPython", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What is the result of `7 // 2` in Python?",
                    "`//` is floor division, giving 3.",
                    [["3", true], ["3.5"], ["4"], ["2.5"]],
                    { skillTags: ["python"] },
                  ),
                  q(
                    "What is `type(3.0)` in Python?",
                    "3.0 is a float.",
                    [["float", true], ["int"], ["decimal"], ["double"]],
                    { skillTags: ["python"] },
                  ),
                ],
              },
              {
                slug: "control-flow",
                title: "Control flow",
                summary: "if, elif, else and loops.",
                topic: "python-control-flow",
                intro:
                  "Programs make decisions and repeat work. Learn Python's conditionals and loops with clear examples.",
                estimatedMinutes: 120,
                objectives: [
                  "Branch with if/elif/else",
                  "Repeat with for and while loops",
                ],
                resources: [
                  link("automate", "PRIMARY", { isRequired: true }),
                  link("pythonDocs", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which keyword starts a loop over a sequence in Python?",
                    "`for` iterates over items of a sequence.",
                    [
                      ["for", true],
                      ["loop"],
                      ["foreach"],
                      ["repeat"],
                    ],
                    { skillTags: ["python"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["python"], passingScore: 70 },
          },
        ],
      },
      {
        slug: "python-core",
        title: "Python Core Language",
        summary:
          "Data structures, functions, modules, errors and object-oriented design.",
        description:
          "This phase deepens your Python: the built-in collections, writing reusable functions, organising code into modules, handling errors, and modelling problems with classes.",
        estimatedHours: 120,
        modules: [
          {
            slug: "data-structures",
            title: "Data structures",
            summary: "Lists, tuples, dictionaries and sets.",
            description:
              "Choose the right collection for the job and use comprehensions to transform data fluently.",
            estimatedMinutes: 300,
            prerequisiteSlugs: ["first-python-steps"],
            completionCriteria:
              "You can pick an appropriate collection and transform data with comprehensions.",
            objectives: [
              "Use lists, tuples, dicts and sets correctly",
              "Transform data with comprehensions",
            ],
            chapters: [
              {
                slug: "lists-and-dictionaries",
                title: "Lists and dictionaries",
                summary: "Ordered sequences and key–value mappings.",
                topic: "python-collections",
                intro:
                  "Lists hold ordered items; dictionaries map keys to values. Together they model most everyday data.",
                estimatedMinutes: 180,
                objectives: [
                  "Index, slice and iterate lists",
                  "Look up and update dictionary entries",
                ],
                resources: [
                  link("pythonDocs", "PRIMARY", { isRequired: true }),
                  link("automate", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which collection maps keys to values?",
                    "A dictionary (dict) maps keys to values.",
                    [
                      ["dict", true],
                      ["list"],
                      ["tuple"],
                      ["set"],
                    ],
                    { skillTags: ["python"] },
                  ),
                ],
              },
              {
                slug: "comprehensions",
                title: "Comprehensions",
                summary: "Concise ways to build collections.",
                topic: "python-comprehensions",
                intro:
                  "Comprehensions build a new collection from an iterable in one expression. They are idiomatic Python and worth mastering.",
                estimatedMinutes: 120,
                objectives: [
                  "Write list, set and dict comprehensions",
                  "Add conditions to comprehensions",
                ],
                resources: [
                  link("realPython", "PRIMARY", { isRequired: true }),
                  link("pythonDocs", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What does `[x*x for x in range(3)]` evaluate to?",
                    "It squares each number from 0 to 2: [0, 1, 4].",
                    [
                      ["[0, 1, 4]", true],
                      ["[1, 4, 9]"],
                      ["[0, 1, 2]"],
                      ["[2, 4, 6]"],
                    ],
                    { skillTags: ["python"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["python"], passingScore: 70 },
          },
          {
            slug: "functions-and-modules",
            title: "Functions and modules",
            summary: "Functions, scope, imports and error handling.",
            description:
              "Break programs into functions, organise them into modules and handle errors deliberately.",
            estimatedMinutes: 300,
            prerequisiteSlugs: ["data-structures"],
            completionCriteria:
              "You can structure a small program across modules with clear error handling.",
            objectives: [
              "Write functions with sensible parameters and returns",
              "Organise code into modules and packages",
              "Handle exceptions deliberately",
            ],
            chapters: [
              {
                slug: "functions-and-scope",
                title: "Functions and scope",
                summary: "Parameters, returns and variable scope.",
                topic: "python-functions",
                intro:
                  "Functions are the primary unit of reuse. Learn arguments, default values, returns and how scope works.",
                estimatedMinutes: 180,
                objectives: [
                  "Define functions with parameters and returns",
                  "Explain local and global scope",
                ],
                resources: [
                  link("pythonDocs", "PRIMARY", { isRequired: true }),
                  link("automate", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What does a Python function return if it has no return statement?",
                    "It returns None.",
                    [
                      ["None", true],
                      ["0"],
                      ["An empty string"],
                      ["It raises an error"],
                    ],
                    { skillTags: ["python"] },
                  ),
                ],
              },
              {
                slug: "errors-and-exceptions",
                title: "Errors and exceptions",
                summary: "try/except, raising and custom exceptions.",
                topic: "python-errors",
                intro:
                  "Good programs fail gracefully. Learn to catch, raise and design exceptions.",
                estimatedMinutes: 120,
                objectives: [
                  "Catch exceptions with try/except",
                  "Raise exceptions and define your own",
                ],
                resources: [
                  link("pythonDocs", "PRIMARY", { isRequired: true }),
                  link("realPython", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which block runs whether or not an exception was raised?",
                    "The `finally` block always runs.",
                    [
                      ["finally", true],
                      ["except"],
                      ["try"],
                      ["else"],
                    ],
                    { skillTags: ["python"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["python"], passingScore: 70 },
          },
          {
            slug: "object-oriented-python",
            title: "Object-oriented Python",
            summary: "Classes, objects, inheritance and composition.",
            description:
              "Model your domain with classes and understand when to prefer composition.",
            estimatedMinutes: 180,
            prerequisiteSlugs: ["functions-and-modules"],
            completionCriteria:
              "You can design classes with clear responsibilities and use composition.",
            objectives: [
              "Define classes with attributes and methods",
              "Prefer composition where inheritance is not warranted",
            ],
            chapters: [
              {
                slug: "classes-and-objects",
                title: "Classes and objects",
                summary: "Modelling data and behaviour together.",
                topic: "python-oop",
                intro:
                  "A class bundles data and the behaviour that operates on it. Learn to define classes, instances and methods.",
                estimatedMinutes: 180,
                objectives: [
                  "Define classes and create instances",
                  "Write methods and use __init__ correctly",
                ],
                resources: [
                  link("pythonDocs", "PRIMARY", { isRequired: true }),
                  link("realPython", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What is `self` in a Python method?",
                    "`self` is the instance the method is called on.",
                    [
                      ["The instance the method is called on", true],
                      ["The class itself"],
                      ["A global variable"],
                      ["The parent class"],
                    ],
                    { skillTags: ["python", "oop"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["python", "oop"], passingScore: 70 },
          },
        ],
      },
      {
        slug: "web-data",
        title: "Web, APIs and Databases",
        summary: "HTTP, REST, SQL databases and building APIs with FastAPI.",
        description:
          "The heart of backend work: how the web works, designing and querying relational data, and building a real API with validation and authentication.",
        estimatedHours: 130,
        modules: [
          {
            slug: "http-and-the-web",
            title: "HTTP and the web",
            summary: "Requests, responses, methods and REST.",
            description:
              "Understand the protocol your APIs speak and how to design resources.",
            estimatedMinutes: 180,
            prerequisiteSlugs: ["object-oriented-python"],
            completionCriteria:
              "You can explain HTTP requests and responses and design simple REST resources.",
            objectives: [
              "Explain the HTTP request/response cycle",
              "Design REST resources and choose methods",
            ],
            chapters: [
              {
                slug: "http-fundamentals",
                title: "HTTP fundamentals",
                summary: "Requests, responses, methods and status codes.",
                topic: "http-basics",
                intro:
                  "HTTP is the request/response protocol behind the web. Learn methods, headers, status codes and how clients and servers communicate.",
                estimatedMinutes: 90,
                objectives: [
                  "Describe HTTP requests and responses",
                  "Interpret common status codes",
                ],
                resources: [
                  link("mdnHttp", "PRIMARY", { isRequired: true }),
                  link("pythonDocs", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which HTTP status code family indicates success?",
                    "2xx status codes indicate success.",
                    [
                      ["2xx", true],
                      ["3xx"],
                      ["4xx"],
                      ["5xx"],
                    ],
                    { skillTags: ["http", "web"] },
                  ),
                  q(
                    "Which HTTP method is intended to be safe and idempotent for reading a resource?",
                    "GET is safe and idempotent; it should not change server state.",
                    [
                      ["GET", true],
                      ["POST"],
                      ["PATCH"],
                      ["DELETE"],
                    ],
                    { skillTags: ["http", "web"] },
                  ),
                ],
              },
              {
                slug: "rest-api-design",
                title: "REST API design",
                summary: "Resources, URLs and versioning.",
                topic: "rest-api",
                intro:
                  "REST is a style for designing APIs around resources. Learn to name URLs, choose methods and return sensible status codes.",
                estimatedMinutes: 90,
                objectives: [
                  "Model resources and design URL structures",
                  "Map operations to HTTP methods and status codes",
                ],
                resources: [
                  link("mdnHttp", "PRIMARY", { isRequired: true }),
                  link("fastapi", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "In REST, what should a POST to /users typically do?",
                    "POST to a collection creates a new resource in it.",
                    [
                      ["Create a new user", true],
                      ["List all users"],
                      ["Delete a user"],
                      ["Replace the entire collection"],
                    ],
                    { skillTags: ["http", "api-design"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["http", "api-design"], passingScore: 70 },
          },
          {
            slug: "databases-and-sql",
            title: "Databases and SQL",
            summary: "Relational modelling and querying with SQL.",
            description:
              "Store data properly: relational modelling, SQL queries, and accessing a database from Python.",
            estimatedMinutes: 300,
            prerequisiteSlugs: ["http-and-the-web"],
            completionCriteria:
              "You can design a small schema and write queries with joins and aggregation.",
            objectives: [
              "Model data relationally with keys and relationships",
              "Write SELECT queries with joins and grouping",
              "Access a database from Python",
            ],
            chapters: [
              {
                slug: "relational-model",
                title: "The relational model",
                summary: "Tables, keys and relationships.",
                topic: "database-modeling",
                intro:
                  "Relational databases organise data into tables with keys. Learn primary and foreign keys and how relationships are modelled.",
                estimatedMinutes: 90,
                objectives: [
                  "Use primary and foreign keys",
                  "Model one-to-many and many-to-many relationships",
                ],
                resources: [
                  link("pgTutorial", "PRIMARY", { isRequired: true }),
                  link("sqlbolt", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What does a foreign key represent?",
                    "A foreign key references a row in another table, expressing a relationship.",
                    [
                      ["A reference to a row in another table", true],
                      ["A unique identifier within its own table"],
                      ["An index on every column"],
                      ["A password hash"],
                    ],
                    { skillTags: ["sql", "databases"] },
                  ),
                ],
              },
              {
                slug: "sql-basics",
                title: "SQL basics",
                summary: "SELECT, WHERE, JOIN and GROUP BY.",
                topic: "sql-basics",
                intro:
                  "SQL selects and transforms data. Learn filtering, joining tables and aggregating results.",
                estimatedMinutes: 210,
                objectives: [
                  "Filter rows with WHERE",
                  "Combine tables with JOIN",
                  "Aggregate with GROUP BY and HAVING",
                ],
                resources: [
                  link("sqlbolt", "PRIMARY", { isRequired: true }),
                  link("pgTutorial", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which clause filters rows *after* grouping?",
                    "HAVING filters groups; WHERE filters rows before grouping.",
                    [
                      ["HAVING", true],
                      ["WHERE"],
                      ["GROUP"],
                      ["ORDER"],
                    ],
                    { skillTags: ["sql"] },
                  ),
                  q(
                    "Which JOIN returns rows that have matches in both tables?",
                    "INNER JOIN returns only matching rows from both tables.",
                    [
                      ["INNER JOIN", true],
                      ["LEFT JOIN"],
                      ["RIGHT JOIN"],
                      ["CROSS JOIN"],
                    ],
                    { skillTags: ["sql"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["sql", "databases"], passingScore: 70 },
          },
          {
            slug: "apis-with-fastapi",
            title: "Building APIs with FastAPI",
            summary: "Routing, validation, and authentication.",
            description:
              "Build a real web API: routes, request validation with Pydantic, and authentication.",
            estimatedMinutes: 360,
            prerequisiteSlugs: ["databases-and-sql"],
            completionCriteria:
              "You can build and test a small authenticated JSON API.",
            objectives: [
              "Build routes with FastAPI",
              "Validate request data with Pydantic",
              "Add basic authentication",
            ],
            chapters: [
              {
                slug: "first-web-app",
                title: "Your first web app",
                summary: "Routes, path and query parameters.",
                topic: "fastapi",
                intro:
                  "FastAPI turns Python functions into HTTP endpoints. Build your first routes and return JSON.",
                estimatedMinutes: 120,
                objectives: [
                  "Define routes and handlers",
                  "Handle path and query parameters",
                ],
                resources: [
                  link("fastapi", "PRIMARY", { isRequired: true }),
                  link("pythonDocs", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "In FastAPI, what decorator turns a function into a GET endpoint?",
                    "`@app.get(\"/path\")` registers a GET route.",
                    [
                      ["@app.get(...)", true],
                      ["@app.route(...)"],
                      ["@app.get_route(...)"],
                      ["@router(...)"],
                    ],
                    { skillTags: ["python", "api", "web"] },
                  ),
                ],
              },
              {
                slug: "request-validation",
                title: "Request validation with Pydantic",
                summary: "Typed request and response models.",
                topic: "api-validation",
                intro:
                  "Pydantic models describe and validate data. Learn to declare request bodies and get automatic validation and docs.",
                estimatedMinutes: 120,
                objectives: [
                  "Define Pydantic models for requests",
                  "Rely on automatic validation and error responses",
                ],
                resources: [
                  link("pydantic", "PRIMARY", { isRequired: true }),
                  link("fastapi", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What happens when a request body fails Pydantic validation in FastAPI?",
                    "FastAPI returns a 422 Unprocessable Entity with details of the validation errors.",
                    [
                      ["A 422 response with validation details", true],
                      ["A 500 internal error"],
                      ["The request is silently ignored"],
                      ["The server crashes"],
                    ],
                    { skillTags: ["python", "validation", "api"] },
                  ),
                ],
              },
              {
                slug: "authentication-basics",
                title: "Authentication basics",
                summary: "Hashing passwords and issuing tokens.",
                topic: "auth-basics",
                intro:
                  "Protect endpoints with authentication. Learn to hash passwords and issue and verify tokens.",
                estimatedMinutes: 120,
                objectives: [
                  "Hash and verify passwords safely",
                  "Implement a token-based auth flow",
                ],
                resources: [
                  link("fastapi", "PRIMARY", { isRequired: true }),
                  link("owasp", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Why hash passwords with a slow algorithm like bcrypt instead of SHA-256?",
                    "Slow, salted hashes make brute-force attacks far more expensive if the database leaks.",
                    [
                      ["Slow salted hashes make brute force much harder", true],
                      ["SHA-256 cannot store strings"],
                      ["bcrypt produces shorter hashes"],
                      ["bcrypt is faster"],
                    ],
                    { skillTags: ["security", "api"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["python", "api", "security"], passingScore: 70 },
          },
        ],
      },
      {
        slug: "production",
        title: "Production & Interview Prep",
        summary:
          "Testing, debugging, containers and deploying a real service.",
        description:
          "Turn working code into reliable software: automated tests, disciplined debugging, dependency management, containers and deployment.",
        estimatedHours: 60,
        modules: [
          {
            slug: "testing-and-quality",
            title: "Testing and quality",
            summary: "Unit testing and debugging with pytest.",
            description:
              "Write tests that let you change code with confidence, and debug methodically.",
            estimatedMinutes: 180,
            prerequisiteSlugs: ["apis-with-fastapi"],
            completionCriteria:
              "You can write and run a pytest suite and debug a failing program.",
            objectives: [
              "Write unit tests with pytest",
              "Debug systematically using a debugger",
            ],
            chapters: [
              {
                slug: "unit-testing-with-pytest",
                title: "Unit testing with pytest",
                summary: "Tests, assertions, fixtures and running the suite.",
                topic: "testing-basics",
                intro:
                  "pytest makes testing Python pleasant. Learn to write tests, use fixtures and run your suite.",
                estimatedMinutes: 180,
                objectives: [
                  "Write tests with plain assert statements",
                  "Use fixtures to share setup",
                ],
                resources: [
                  link("pytestDocs", "PRIMARY", { isRequired: true }),
                  link("realPython", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "In pytest, how do you typically assert behaviour?",
                    "pytest uses plain `assert` statements.",
                    [
                      ["With plain assert statements", true],
                      ["With assertEquals methods"],
                      ["With expect(...).toBe(...)"],
                      ["With print statements"],
                    ],
                    { skillTags: ["python", "testing"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["python", "testing"], passingScore: 70 },
          },
          {
            slug: "tooling-and-deployment",
            title: "Tooling and deployment",
            summary: "Virtual environments, containers and shipping a service.",
            description:
              "Package your work reproducibly and deploy it so others can use it.",
            estimatedMinutes: 240,
            prerequisiteSlugs: ["testing-and-quality"],
            completionCriteria:
              "You can containerise a small API and describe a deployment process.",
            objectives: [
              "Manage dependencies in virtual environments",
              "Containerise an application with Docker",
              "Describe a basic deployment workflow",
            ],
            chapters: [
              {
                slug: "virtual-environments",
                title: "Virtual environments and dependencies",
                summary: "Isolating dependencies with venv and pip.",
                topic: "python-env",
                intro:
                  "Reproducible environments prevent 'works on my machine' problems. Learn venv and requirements files.",
                estimatedMinutes: 90,
                objectives: [
                  "Create and use a virtual environment",
                  "Record dependencies in a requirements file",
                ],
                resources: [
                  link("pythonDocs", "PRIMARY", { isRequired: true }),
                  link("realPython", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Why use a virtual environment per project?",
                    "It isolates each project's dependencies so versions do not conflict across projects.",
                    [
                      ["To isolate each project's dependencies", true],
                      ["To make Python run faster"],
                      ["To compile Python to C"],
                      ["To share dependencies globally"],
                    ],
                    { skillTags: ["python", "tooling"] },
                  ),
                ],
              },
              {
                slug: "docker-basics",
                title: "Docker basics",
                summary: "Images, containers and a Dockerfile.",
                topic: "docker-basics",
                intro:
                  "Containers package an application with its dependencies. Learn the Docker model and write a Dockerfile.",
                estimatedMinutes: 150,
                objectives: [
                  "Explain images and containers",
                  "Write a Dockerfile for a Python service",
                ],
                resources: [
                  link("docker", "PRIMARY", { isRequired: true }),
                  link("ghActions", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "What is a Docker image?",
                    "An image is a read-only template from which containers are created.",
                    [
                      ["A read-only template for creating containers", true],
                      ["A running process"],
                      ["A type of database"],
                      ["A network port"],
                    ],
                    { skillTags: ["docker", "deployment"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["docker", "deployment", "tooling"], passingScore: 70 },
          },
        ],
      },
    ],
    projects: [
      {
        slug: "backend-cli-tool",
        title: "Command-line data tool",
        level: "BEGINNER",
        summary:
          "A Python CLI that reads a CSV, cleans it and writes a summary report.",
        description:
          "Build a command-line tool that ingests a CSV file, validates and cleans the rows, and prints a summary. This cements Python fundamentals, file I/O and error handling.",
        objectives: [
          "Read and write files in Python",
          "Handle errors gracefully",
          "Structure code into functions and modules",
        ],
        requirements:
          "Accept a file path argument, read a CSV with headers, report malformed rows without crashing, and print a summary (row count, per-column null counts, and basic stats for numeric columns). Include tests for the cleaning function.",
        acceptanceCriteria: [
          "Handles a missing file and malformed rows without crashing",
          "Summary is correct for a provided fixture",
          "At least three unit tests pass",
        ],
        milestones: [
          { title: "Read the file", detail: "Parse the CSV into rows." },
          { title: "Clean and validate", detail: "Drop or fix bad rows with reporting." },
          { title: "Summarise and test", detail: "Compute the summary and add tests." },
        ],
        starterResources: ["pythonDocs", "automate", "pytestDocs"],
        hints: [
          "Use the csv module from the standard library.",
          "Separate parsing, cleaning and reporting into functions.",
        ],
        submissionInstructions:
          "Share the repository with a README showing example usage and a sample fixture file.",
        rubric: [
          { criterion: "Correctness", weight: 40, description: "Summary matches the fixture." },
          { criterion: "Robustness", weight: 30, description: "Handles bad input gracefully." },
          { criterion: "Tests", weight: 30, description: "Meaningful unit tests." },
        ],
        extensions: ["Add filtering flags.", "Support JSON output for scripting."],
      },
      {
        slug: "backend-rest-api",
        title: "Authenticated REST API",
        level: "INTERMEDIATE",
        summary:
          "A FastAPI service with a relational database, validation and auth.",
        description:
          "Build a JSON API for a small domain (for example, a reading list) with CRUD endpoints, Pydantic validation, a PostgreSQL database and token authentication. Include tests and containerise it.",
        objectives: [
          "Design REST endpoints for a domain",
          "Persist data in a relational database",
          "Validate input and secure the API",
        ],
        requirements:
          "CRUD endpoints for at least one resource, input validation, a relational schema with migrations, token-based authentication protecting write endpoints, and an automated test suite. Provide a Dockerfile that builds a runnable image.",
        acceptanceCriteria: [
          "All endpoints behave per the specification with correct status codes",
          "Unauthenticated writes are rejected",
          "Tests pass and the container image runs",
        ],
        milestones: [
          { title: "Data model and schema", detail: "Design tables and migrations." },
          { title: "Endpoints", detail: "Implement CRUD with validation." },
          { title: "Auth and tests", detail: "Add auth, tests and a Dockerfile." },
        ],
        starterResources: ["fastapi", "pydantic", "pgTutorial", "pytestDocs", "docker"],
        hints: [
          "Keep request and response models separate.",
          "Return 201 on create and 404 on missing resources.",
        ],
        submissionInstructions:
          "Submit the repository, an OpenAPI screenshot or export, and a short description of your auth approach.",
        rubric: [
          { criterion: "API design", weight: 35, description: "Sensible resources, methods and status codes." },
          { criterion: "Data handling", weight: 25, description: "Correct schema and queries." },
          { criterion: "Security", weight: 20, description: "Password hashing and protected writes." },
          { criterion: "Tests and container", weight: 20, description: "Passing tests and a working image." },
        ],
        extensions: [
          "Add pagination and filtering to list endpoints.",
          "Add a rate limit to write endpoints.",
        ],
      },
    ],
  },

  // =========================================================================
  // 3. Data Analyst
  // =========================================================================
  {
    slug: "data-analyst",
    title: "Data Analyst",
    summary:
      "Turn raw data into decisions with Python, pandas and SQL, from cleaning to visualisation.",
    description:
      "This path teaches the practical data analysis workflow: getting and cleaning data with Python and pandas, querying databases with SQL, understanding basic statistics, and communicating findings with clear visualisations. It is designed for beginners who can already use a computer and are comfortable learning a little code.",
    level: "BEGINNER",
    estimatedHours: 220,
    order: 3,
    roles: [
      {
        slug: "data-analyst-junior",
        title: "Junior Data Analyst",
        description:
          "Cleans data, answers questions with SQL and builds basic reports.",
        skills: [
          { name: "python", detail: "Scripting for data" },
          { name: "pandas", detail: "Data wrangling" },
          { name: "sql", detail: "Queries and aggregation" },
          { name: "statistics", detail: "Descriptive statistics" },
          { name: "visualization", detail: "Clear charts" },
        ],
      },
    ],
    phases: [
      {
        slug: "data-foundations",
        title: "Data Foundations",
        summary: "Python for data, numpy and pandas.",
        description:
          "Get comfortable working with data programmatically: a focused Python refresher, then numerical arrays and the pandas DataFrame.",
        estimatedHours: 110,
        modules: [
          {
            slug: "python-for-data",
            title: "Python for data",
            summary: "A focused Python refresher and numpy arrays.",
            description:
              "Learn just enough Python to be productive, plus the numpy arrays that pandas is built on.",
            estimatedMinutes: 300,
            completionCriteria:
              "You can write small Python scripts and perform vectorised operations with numpy.",
            objectives: [
              "Write Python scripts with functions and collections",
              "Use numpy arrays for numerical work",
            ],
            chapters: [
              {
                slug: "python-refresher",
                title: "Python refresher for analysts",
                summary: "Variables, collections, functions and files.",
                topic: "python-basics",
                intro:
                  "You do not need to be a software engineer, but you do need the basics of Python: values, lists and dictionaries, functions and reading files. This chapter gets you there quickly.",
                estimatedMinutes: 180,
                objectives: [
                  "Use variables, lists and dictionaries",
                  "Write functions and read files",
                ],
                resources: [
                  link("kaggle", "PRIMARY", { isRequired: true }),
                  link("pythonDocs", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which Python collection is best for storing rows of named fields?",
                    "A dictionary maps field names to values, which suits a row of named fields.",
                    [
                      ["dict", true],
                      ["set"],
                      ["tuple"],
                      ["range"],
                    ],
                    { skillTags: ["python", "data-analysis"] },
                  ),
                ],
              },
              {
                slug: "numpy-basics",
                title: "numpy basics",
                summary: "Arrays, shapes and vectorised operations.",
                topic: "numpy",
                intro:
                  "numpy gives Python fast numerical arrays. Understanding arrays and vectorised operations makes pandas click.",
                estimatedMinutes: 120,
                objectives: [
                  "Create and index numpy arrays",
                  "Perform vectorised arithmetic",
                ],
                resources: [
                  link("numpy", "PRIMARY", { isRequired: true }),
                  link("kaggle", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Why are vectorised numpy operations fast?",
                    "They run in optimised compiled code over whole arrays rather than Python-level loops.",
                    [
                      ["They run compiled operations over whole arrays", true],
                      ["They use multiple databases"],
                      ["They cache every result on disk"],
                      ["They avoid using memory"],
                    ],
                    { skillTags: ["numpy", "python"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["python", "numpy"], passingScore: 70 },
          },
          {
            slug: "pandas-basics",
            title: "pandas basics",
            summary: "Series, DataFrames and cleaning data.",
            description:
              "pandas is the workhorse of data analysis in Python. Learn to load, inspect, clean and transform tabular data.",
            estimatedMinutes: 360,
            prerequisiteSlugs: ["python-for-data"],
            completionCriteria:
              "You can load a messy CSV, clean it and answer questions with groupby.",
            objectives: [
              "Load and inspect tabular data",
              "Clean missing and inconsistent data",
              "Aggregate data with groupby",
            ],
            chapters: [
              {
                slug: "series-and-dataframes",
                title: "Series and DataFrames",
                summary: "The core pandas data structures.",
                topic: "pandas",
                intro:
                  "A Series is a labelled array; a DataFrame is a table of Series sharing an index. Learn to load data and select rows and columns.",
                estimatedMinutes: 180,
                objectives: [
                  "Load data into a DataFrame",
                  "Select, filter and sort rows and columns",
                ],
                resources: [
                  link("pandas", "PRIMARY", { isRequired: true }),
                  link("kaggle", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "In pandas, what is a DataFrame?",
                    "A DataFrame is a two-dimensional labelled data structure — a table of columns sharing an index.",
                    [
                      ["A two-dimensional labelled table", true],
                      ["A one-dimensional array"],
                      ["A database server"],
                      ["A chart type"],
                    ],
                    { skillTags: ["pandas", "data-analysis"] },
                  ),
                ],
              },
              {
                slug: "cleaning-data",
                title: "Cleaning data",
                summary: "Missing values, types and duplicates.",
                topic: "data-cleaning",
                intro:
                  "Real data is messy. Learn to detect and handle missing values, fix types and remove duplicates before analysis.",
                estimatedMinutes: 180,
                objectives: [
                  "Detect and handle missing values",
                  "Convert types and remove duplicates",
                ],
                resources: [
                  link("pandas", "PRIMARY", { isRequired: true }),
                  link("kaggle", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which pandas method reports the count of non-null values per column?",
                    "`df.info()` (or `df.count()`) summarises non-null counts and dtypes.",
                    [
                      ["df.info()", true],
                      ["df.plot()"],
                      ["df.merge()"],
                      ["df.groupby()"],
                    ],
                    { skillTags: ["pandas", "data-analysis"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["pandas", "data-analysis"], passingScore: 70 },
          },
        ],
      },
      {
        slug: "analysis-and-communication",
        title: "Analysis & Communication",
        summary: "SQL, statistics and visualisation.",
        description:
          "Query data at the source with SQL, reason about it with basic statistics, and communicate findings with clear charts.",
        estimatedHours: 110,
        modules: [
          {
            slug: "sql-for-analysis",
            title: "SQL for analysis",
            summary: "Selecting, joining and aggregating data.",
            description:
              "Most organisational data lives in databases. Learn to answer questions with SQL.",
            estimatedMinutes: 300,
            prerequisiteSlugs: ["pandas-basics"],
            completionCriteria:
              "You can answer business questions with SELECT, JOIN and GROUP BY.",
            objectives: [
              "Filter and sort data with SELECT",
              "Join tables and aggregate with GROUP BY",
            ],
            chapters: [
              {
                slug: "sql-select",
                title: "Selecting data",
                summary: "SELECT, WHERE, ORDER BY and LIMIT.",
                topic: "sql-basics",
                intro:
                  "SQL is how you ask questions of a database. Start with selecting columns and filtering rows.",
                estimatedMinutes: 120,
                objectives: [
                  "Select columns and filter rows",
                  "Sort and limit results",
                ],
                resources: [
                  link("modeSql", "PRIMARY", { isRequired: true }),
                  link("sqlbolt", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which clause limits the number of rows returned?",
                    "`LIMIT` restricts the number of rows returned.",
                    [
                      ["LIMIT", true],
                      ["TOP"],
                      ["FIRST"],
                      ["COUNT"],
                    ],
                    { skillTags: ["sql", "analytics"] },
                  ),
                ],
              },
              {
                slug: "joins-and-grouping",
                title: "Joins and grouping",
                summary: "Combining tables and aggregating results.",
                topic: "sql-joins",
                intro:
                  "Analysts constantly combine tables and aggregate. Learn JOINs and GROUP BY with practical examples.",
                estimatedMinutes: 180,
                objectives: [
                  "Join tables to combine data",
                  "Aggregate with GROUP BY and HAVING",
                ],
                resources: [
                  link("modeSql", "PRIMARY", { isRequired: true }),
                  link("pgTutorial", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which function counts the rows in each group?",
                    "`COUNT(*)` counts rows within each group.",
                    [
                      ["COUNT(*)", true],
                      ["SUM(*)"],
                      ["TOTAL(*)"],
                      ["GROUP(*)"],
                    ],
                    { skillTags: ["sql", "analytics"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["sql", "analytics"], passingScore: 70 },
          },
          {
            slug: "statistics-and-visualization",
            title: "Statistics and visualisation",
            summary: "Descriptive statistics and clear charts.",
            description:
              "Summarise data with statistics and communicate it with charts people understand.",
            estimatedMinutes: 360,
            prerequisiteSlugs: ["sql-for-analysis"],
            completionCriteria:
              "You can summarise a dataset statistically and produce clear charts that support a conclusion.",
            objectives: [
              "Compute and interpret descriptive statistics",
              "Choose appropriate charts for a question",
            ],
            chapters: [
              {
                slug: "descriptive-statistics",
                title: "Descriptive statistics",
                summary: "Mean, median, spread and distributions.",
                topic: "statistics",
                intro:
                  "Before modelling, describe: centre, spread and shape. Learn the measures analysts use every day.",
                estimatedMinutes: 180,
                objectives: [
                  "Compute mean, median and standard deviation",
                  "Interpret distribution shape and outliers",
                ],
                resources: [
                  link("khanStats", "PRIMARY", { isRequired: true }),
                  link("kaggle", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which measure is least affected by extreme outliers?",
                    "The median is robust to outliers, unlike the mean.",
                    [
                      ["Median", true],
                      ["Mean"],
                      ["Sum"],
                      ["Range"],
                    ],
                    { skillTags: ["statistics"] },
                  ),
                ],
              },
              {
                slug: "visualizing-data",
                title: "Visualizing data",
                summary: "Charts that reveal the story.",
                topic: "data-visualization",
                intro:
                  "A good chart answers a question instantly. Learn the common chart types and how to build them with matplotlib.",
                estimatedMinutes: 180,
                objectives: [
                  "Choose an appropriate chart for a question",
                  "Create charts with matplotlib",
                ],
                resources: [
                  link("matplotlib", "PRIMARY", { isRequired: true }),
                  link("seaborn", "ALTERNATIVE"),
                ],
                quiz: [
                  q(
                    "Which chart is best for showing a distribution of one numeric variable?",
                    "A histogram shows the distribution of a single numeric variable.",
                    [
                      ["Histogram", true],
                      ["Pie chart"],
                      ["Scatter plot"],
                      ["Box plot of categories"],
                    ],
                    { skillTags: ["visualization", "statistics"] },
                  ),
                ],
              },
            ],
            assessment: { skillTags: ["statistics", "visualization"], passingScore: 70 },
          },
        ],
      },
    ],
    projects: [
      {
        slug: "data-sales-analysis",
        title: "Sales data analysis report",
        level: "INTERMEDIATE",
        summary:
          "Clean a sales dataset and produce a notebook report with charts and conclusions.",
        description:
          "Take a messy sales CSV, clean it with pandas, answer a set of business questions and present the findings in a notebook with clear charts and written conclusions.",
        objectives: [
          "Clean a realistic dataset",
          "Answer questions with pandas",
          "Communicate findings with charts and prose",
        ],
        requirements:
          "A Jupyter notebook that loads the data, documents the cleaning steps, answers at least five business questions with code, and includes at least four labelled charts and a written summary of conclusions.",
        acceptanceCriteria: [
          "Cleaning steps are documented and justified",
          "Each question is answered with reproducible code",
          "Charts are labelled and readable",
        ],
        milestones: [
          { title: "Load and clean", detail: "Inspect and tidy the dataset." },
          { title: "Answer questions", detail: "Analyse with pandas and SQL-like operations." },
          { title: "Communicate", detail: "Build charts and write conclusions." },
        ],
        starterResources: ["pandas", "matplotlib", "kaggle", "jupyter"],
        hints: [
          "Record every cleaning decision in markdown cells.",
          "Label axes and add units to charts.",
        ],
        submissionInstructions:
          "Submit the notebook (or a PDF export) and a one-paragraph executive summary.",
        rubric: [
          { criterion: "Data cleaning", weight: 30, description: "Justified and correct." },
          { criterion: "Analysis", weight: 40, description: "Correct, reproducible answers." },
          { criterion: "Communication", weight: 30, description: "Clear charts and conclusions." },
        ],
        extensions: ["Add an interactive chart.", "Load the same data from SQL instead of CSV."],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Merged catalogue
// ---------------------------------------------------------------------------

/** All resources: the curated base set plus the external course catalogue. */
export const RESOURCES: Record<string, ResourceDef> = {
  ...BASE_RESOURCES,
  ...CATALOG_RESOURCES,
};

/** All career paths: the curated base paths plus the course-catalogue paths. */
export const PATHS: PathDef[] = [...BASE_PATHS, ...CATALOG_PATHS];

