// Regenerates `prisma/paths/course-catalog.ts` from the CSV export of the
// "Free Courses - Final Coupon Links" workbook. The CSV is committed at
// `prisma/data/free-courses-final.csv`.
//
// Usage: npx tsx scripts/generate-course-catalog.mts [input.csv] [output.ts]

import { readFileSync, writeFileSync } from "node:fs";

const csvPath = process.argv[2] ?? "prisma/data/free-courses-final.csv";
const outPath = process.argv[3] ?? "prisma/paths/course-catalog.ts";

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

interface Row {
  title: string;
  category: string;
  udemy: string;
  coupon: string;
  source: string;
  notes: string;
}

const raw = readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.length > 0);
const header = parseCsvLine(raw[0]);
const col = (name: string) => header.indexOf(name);
const cRow = col("Row");
const cB = col("B");
const cC = col("C");
const cD = col("D");
const cE = col("E");
const cF = col("F");
const cG = col("G");

const rows: Row[] = [];
for (const line of raw.slice(1)) {
  const f = parseCsvLine(line);
  const rn = Number(f[cRow]);
  if (!Number.isFinite(rn) || rn < 2) continue;
  rows.push({
    title: f[cB],
    category: f[cC],
    udemy: f[cD],
    coupon: f[cE],
    source: f[cF],
    notes: f[cG] ?? "",
  });
}

const PATH_META: Record<string, { slug: string; title: string; category: string; order: number }> = {
  "Artificial Intelligence & ML": { slug: "ai-and-ml-practitioner", title: "AI & ML Practitioner", category: "DATA_AND_AI", order: 10 },
  "Software & Web Development": { slug: "software-and-web-development", title: "Software & Web Development", category: "SOFTWARE_ENGINEERING", order: 11 },
  "Cloud Computing & DevOps / IT": { slug: "cloud-and-devops", title: "Cloud & DevOps", category: "CLOUD_AND_DEVOPS", order: 12 },
  "Cybersecurity & Compliance / Certifications": { slug: "cybersecurity-and-compliance", title: "Cybersecurity & Compliance", category: "CYBERSECURITY", order: 13 },
  "Business & Management Strategy": { slug: "business-and-management", title: "Business & Management", category: "OTHER", order: 14 },
  "Personal & Professional Development": { slug: "personal-and-professional-growth", title: "Personal & Professional Growth", category: "FOUNDATIONS", order: 15 },
  "Human Resources & Talent Management": { slug: "hr-and-talent-management", title: "HR & Talent Management", category: "OTHER", order: 16 },
  "General Skill Building": { slug: "general-skill-building", title: "General Skill Building", category: "FOUNDATIONS", order: 17 },
  "Finance & Accounting": { slug: "finance-and-accounting", title: "Finance & Accounting", category: "OTHER", order: 18 },
};

const CATEGORY_DEFAULT_TOPIC: Record<string, string> = {
  "Artificial Intelligence & ML": "machine-learning-basics",
  "Software & Web Development": "web-fundamentals",
  "Cloud Computing & DevOps / IT": "cloud-fundamentals",
  "Cybersecurity & Compliance / Certifications": "cybersecurity-fundamentals",
  "Business & Management Strategy": "business-strategy",
  "Personal & Professional Development": "personal-productivity",
  "Human Resources & Talent Management": "hr-fundamentals",
  "General Skill Building": "computer-literacy",
  "Finance & Accounting": "finance-basics",
};

const RULES: Array<[RegExp, string]> = [
  [/mlops/, "mlops"],
  [/pytorch|deep learning|deepscaler|neural/, "deep-learning-basics"],
  [/rag|llm|langchain|generative|gpt|chatgpt|agent|ollama|mistral|deepseek|nvidia|prompt|claude/, "llm-apps"],
  [/machine learning|data science|ai fundamentals|ai for beginners|responsible ai|governance|ai engineer|ai architecture|quantum|ai on aws/, "machine-learning-basics"],
  [/aws/, "aws-core"],
  [/azure|az-900/, "azure-core"],
  [/devops|solution|full stack/, "ci-cd"],
  [/nmap|network scanning/, "network-security"],
  [/networking|ccst/, "networking-basics"],
  [/security|privacy|cdpse|compliance|data security/, "cybersecurity-fundamentals"],
  [/python|pcpp|pcep/, "python-basics"],
  [/php/, "php-basics"],
  [/kotlin|android/, "kotlin-basics"],
  [/java/, "java-basics"],
  [/angular/, "javascript-basics"],
  [/html/, "html-semantics"],
  [/word/, "computer-literacy"],
  [/excel|spreadsheet|dashboard/, "spreadsheet-basics"],
  [/seo|marketing|brand/, "digital-marketing"],
  [/storytelling|visualization/, "data-visualization"],
  [/requirements|user stories/, "agile-workflow"],
  [/project|portfolio|recovery/, "project-management"],
  [/hr|recruit|talent|chro|candidate|people|mentor|onboard|employee|learning and development|training/, "hr-fundamentals"],
  [/finance|financial|budget|forecast|wellbeing/, "finance-basics"],
  [/negotiat|communication|facilitat|meeting|politics|influence|executive|leadership/, "communication-skills"],
  [/business|strategy|process|kpi|matrix|acumen|okr/, "business-strategy"],
  [/productivity|burnout|confidence|mindset|career|creativity|resilience|decision|introvert|growth|facilitation/, "personal-productivity"],
  [/interior|design/, "ui-design"],
];

function topicFor(title: string, category: string): string {
  const lower = title.toLowerCase();
  for (const [re, topic] of RULES) if (re.test(lower)) return topic;
  return CATEGORY_DEFAULT_TOPIC[category] ?? "computer-literacy";
}

const byCategory = new Map<string, Row[]>();
for (const row of rows) {
  const list = byCategory.get(row.category) ?? [];
  list.push(row);
  byCategory.set(row.category, list);
}

const resourceLines: string[] = [];
const pathBlocks: string[] = [];
let index = 0;

for (const [category, list] of byCategory) {
  const meta = PATH_META[category];
  if (!meta) continue;
  const chapters: string[] = [];
  for (const row of list) {
    index++;
    const key = `udemyCourse${index}`;
    const topic = topicFor(row.title, category);
    const note = row.notes && row.notes.trim()
      ? row.notes.trim()
      : "External Udemy course; content and free availability are not verified by SkillWeave.";
    resourceLines.push(
      `  ${JSON.stringify(key)}: {\n` +
        `    title: ${JSON.stringify(row.title)},\n` +
        `    url: ${JSON.stringify(row.udemy)},\n` +
        `    publisher: "Udemy",\n` +
        `    type: "VIDEO",\n` +
        `    provider: "Udemy",\n` +
        `    difficulty: "BEGINNER",\n` +
        `    language: "en",\n` +
        `    isFree: true,\n` +
        `    accessNotes: ${JSON.stringify(row.coupon ? `Free enrollment via Udemy coupon "${row.coupon}" while it lasts.` : "Free enrollment may be time-limited.")},\n` +
        `    status: "UNVERIFIED",\n` +
        `    verificationNote: ${JSON.stringify(note)},\n` +
        `  },`,
    );
    chapters.push(
      `      {\n` +
        `        slug: ${JSON.stringify(`course-${index}`)},\n` +
        `        title: ${JSON.stringify(row.title)},\n` +
        `        summary: ${JSON.stringify(`${row.title} — a free external Udemy course.`)},\n` +
        `        intro: ${JSON.stringify("Work through this course on Udemy, then mark the chapter complete to track your progress here.")},\n` +
        `        topic: ${JSON.stringify(topic)},\n` +
        `        objectives: [${JSON.stringify(`Complete the ${row.title} course.`)}],\n` +
        `        resources: [\n` +
        `          { key: ${JSON.stringify(key)}, role: "PRIMARY", isRequired: true, note: ${JSON.stringify(row.coupon ? `Udemy coupon: ${row.coupon}` : "External Udemy course.")} },\n` +
        `        ],\n` +
        `      },`,
    );
  }
  pathBlocks.push(
    `  {\n` +
      `    slug: ${JSON.stringify(meta.slug)},\n` +
      `    title: ${JSON.stringify(meta.title)},\n` +
      `    summary: ${JSON.stringify(`A curated collection of ${list.length} free Udemy courses in ${category}.`)},\n` +
      `    description: ${JSON.stringify(`Learn ${meta.title.toLowerCase()} through ${list.length} hand-picked free Udemy courses. Each chapter links to one external course; SkillWeave tracks your progress, chapter tests and mock exams. Course availability and coupon codes are controlled by Udemy and may change.`)},\n` +
      `    level: "BEGINNER",\n` +
      `    category: ${JSON.stringify(meta.category)},\n` +
      `    featured: false,\n` +
      `    order: ${meta.order},\n` +
      `    roles: [],\n` +
      `    projects: [],\n` +
      `    phases: [\n` +
      `      {\n` +
      `        slug: ${JSON.stringify(`${meta.slug}-phase`)},\n` +
      `        title: ${JSON.stringify(meta.title)},\n` +
      `        summary: ${JSON.stringify(`All ${list.length} courses in one track.`)},\n` +
      `        description: ${JSON.stringify("Work through the courses in order, then take the module mock exam.")},\n` +
      `        modules: [\n` +
      `          {\n` +
      `            slug: ${JSON.stringify(`${meta.slug}-courses`)},\n` +
      `            title: ${JSON.stringify(`${meta.title} courses`)},\n` +
      `            summary: ${JSON.stringify(`${list.length} free Udemy courses.`)},\n` +
      `            description: ${JSON.stringify("Complete each course, then take the 20-question mock exam for this module.")},\n` +
      `            objectives: [${JSON.stringify(`Complete the ${meta.title} course track.`)}],\n` +
      `            chapters: [\n` +
      chapters.join("\n") +
      `\n            ],\n` +
      `          },\n` +
      `        ],\n` +
      `      },\n` +
      `    ],\n` +
      `  },`,
  );
}

const file =
  `// AUTO-GENERATED from prisma/data/free-courses-final.csv (do not hand-edit).\n` +
  `// Each entry is an external, freely-enrolled Udemy course mapped onto a\n` +
  `// broad/thin career path grouped by its catalogue category.\n` +
  `// Regenerate with: npx tsx scripts/generate-course-catalog.mts\n\n` +
  `import type { PathDef, ResourceDef } from "../seed-data";\n\n` +
  `export const CATALOG_RESOURCES: Record<string, ResourceDef> = {\n` +
  resourceLines.join("\n") +
  `\n};\n\n` +
  `export const CATALOG_PATHS: PathDef[] = [\n` +
  pathBlocks.join("\n") +
  `\n];\n`;

writeFileSync(outPath, file, "utf8");
console.log(`Wrote ${outPath}: ${index} resources across ${byCategory.size} paths.`);
