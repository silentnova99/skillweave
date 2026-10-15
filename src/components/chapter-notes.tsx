"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { deleteNoteAction, saveNoteAction, type NoteState } from "@/app/(app)/learn/actions";

export interface NoteItem {
  id: string;
  body: string;
  createdAt: string;
}

export function ChapterNotes({
  chapterId,
  pathSlug,
  chapterSlug,
  notes,
}: {
  chapterId: string;
  pathSlug: string;
  chapterSlug: string;
  notes: NoteItem[];
}) {
  const [state, formAction, pending] = useActionState<NoteState, FormData>(saveNoteAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="space-y-2">
        {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
        <input type="hidden" name="chapterId" value={chapterId} />
        <input type="hidden" name="pathSlug" value={pathSlug} />
        <input type="hidden" name="chapterSlug" value={chapterSlug} />
        <Label htmlFor="note-body">Add a note</Label>
        <Textarea
          id="note-body"
          name="body"
          rows={3}
          required
          placeholder="Key ideas, questions to revisit, links…"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save note"}
        </Button>
      </form>

      {notes.length > 0 ? (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-none border border-[var(--color-border)] bg-white p-3"
            >
              <p className="whitespace-pre-wrap text-sm text-[var(--color-fg)]">{note.body}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-[var(--color-fg-subtle)]">
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
                <form action={deleteNoteAction}>
                  <input type="hidden" name="noteId" value={note.id} />
                  <input type="hidden" name="pathSlug" value={pathSlug} />
                  <input type="hidden" name="chapterSlug" value={chapterSlug} />
                  <Button variant="ghost" size="sm" type="submit">
                    Delete
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--color-fg-muted)]">
          No notes yet. Notes are private to you.
        </p>
      )}
    </div>
  );
}
