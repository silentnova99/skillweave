"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label, FieldHint } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { importResourcesAction, type AdminState } from "@/app/(app)/admin/actions";

const EXAMPLE = JSON.stringify(
  [
    {
      title: "Example resource",
      url: "https://example.com/course",
      publisher: "Example Publisher",
      type: "TUTORIAL",
      difficulty: "BEGINNER",
      concepts: ["html", "css"],
      estimatedMinutes: 120,
      isFree: true,
      status: "UNVERIFIED",
    },
  ],
  null,
  2,
);

export function ImportForm() {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    importResourcesAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.ok}</Alert> : null}

      <div>
        <Label htmlFor="payload">Resources JSON array</Label>
        <Textarea
          id="payload"
          name="payload"
          rows={14}
          spellCheck={false}
          className="font-mono text-xs"
          defaultValue={EXAMPLE}
        />
        <FieldHint>
          Each object needs at least title, url, publisher and type. Existing URLs
          are updated, new ones are created. Invalid rows abort the whole import.
        </FieldHint>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Importing…" : "Import resources"}
      </Button>
    </form>
  );
}
