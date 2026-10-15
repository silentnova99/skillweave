"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldHint } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import type { OnboardingState } from "@/app/(onboarding)/onboarding/actions";

export interface PathOption {
  id: string;
  title: string;
  summary: string;
  roles: string[];
}

export function OnboardingForm({
  paths,
  action,
}: {
  paths: PathOption[];
  action: (state: OnboardingState, formData: FormData) => Promise<OnboardingState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div>
        <Label htmlFor="targetCareerPathId">Which career path are you aiming for?</Label>
        <Select id="targetCareerPathId" name="targetCareerPathId" required defaultValue="">
          <option value="" disabled>
            Choose a path…
          </option>
          {paths.map((path) => (
            <option key={path.id} value={path.id}>
              {path.title}
            </option>
          ))}
        </Select>
        <FieldHint>
          Not sure? You can change this later. Every path is built from free,
          high-quality resources.
        </FieldHint>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="targetRole">Target role (optional)</Label>
          <Input
            id="targetRole"
            name="targetRole"
            type="text"
            placeholder="e.g. Frontend Engineer"
          />
        </div>
        <div>
          <Label htmlFor="skillLevel">Current level</Label>
          <Select id="skillLevel" name="skillLevel" defaultValue="ABSOLUTE_BEGINNER">
            <option value="ABSOLUTE_BEGINNER">Absolute beginner</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="weeklyHours">Hours you can study each week</Label>
          <Input
            id="weeklyHours"
            name="weeklyHours"
            type="number"
            min={1}
            max={80}
            defaultValue={5}
            required
          />
        </div>
        <div>
          <Label htmlFor="targetWeeks">Target timeframe (weeks, optional)</Label>
          <Input
            id="targetWeeks"
            name="targetWeeks"
            type="number"
            min={1}
            max={260}
            placeholder="e.g. 24"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="existingKnowledge">What do you already know? (optional)</Label>
        <Textarea
          id="existingKnowledge"
          name="existingKnowledge"
          rows={4}
          placeholder="Languages, tools, courses you have started…"
        />
        <FieldHint>
          Used to personalise recommendations. It never replaces your assessment
          results.
        </FieldHint>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-[var(--color-fg)]">
          How do you like to learn?
        </legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="preferReading" defaultChecked /> Reading
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="preferPractice" defaultChecked /> Practice
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="preferVideo" /> Video
          </label>
        </div>
      </fieldset>

      <div className="flex items-center justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Continue to diagnostic"}
        </Button>
      </div>
    </form>
  );
}
