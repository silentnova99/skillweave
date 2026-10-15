import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { codeRunSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Runs learner code in an isolated judge when one is configured.
 *
 * SkillWeave never executes untrusted code in-process: it forwards to an external
 * sandboxed judge (CODE_JUDGE_URL / CODE_JUDGE_TOKEN). Without a configured
 * judge this endpoint returns 503 and grading leaves coding answers ungraded.
 */
export async function POST(request: Request) {
  const judgeUrl = process.env.CODE_JUDGE_URL;
  if (!judgeUrl) {
    return NextResponse.json(
      {
        error:
          "The isolated code judge is not configured, so code cannot be executed.",
        configured: false,
      },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const limit = rateLimit(`code:${user.id}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many runs. Slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = codeRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 422 },
    );
  }

  try {
    const response = await fetch(`${judgeUrl.replace(/\/$/, "")}/run`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.CODE_JUDGE_TOKEN
          ? { authorization: `Bearer ${process.env.CODE_JUDGE_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(15_000),
    });

    const result = (await response.json()) as unknown;
    return NextResponse.json(result, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "The code judge did not respond.", configured: true },
      { status: 502 },
    );
  }
}
