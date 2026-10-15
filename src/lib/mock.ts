/**
 * Balanced question selection for module mock exams.
 *
 * A module mock draws evenly from each chapter (round-robin) so the exam covers
 * the whole module rather than front-loading the first chapter. Items are
 * de-duplicated by a caller-supplied key (a prompt, in the seed) so two chapters
 * that share a topic do not contribute the same question twice. Extra items
 * beyond the target are ignored; if the module has fewer than the target, the
 * mock is simply smaller.
 */
export function selectMockQuestions<T>(
  perChapter: T[][],
  target: number,
  keyOf: (item: T) => string,
): T[] {
  const pools = perChapter.map((items) => [...items]).filter((items) => items.length > 0);
  const seen = new Set<string>();
  const selected: T[] = [];
  for (let round = 0; selected.length < target; round++) {
    let progressed = false;
    for (const pool of pools) {
      if (round >= pool.length) continue;
      progressed = true;
      const item = pool[round];
      const key = keyOf(item);
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push(item);
      if (selected.length >= target) break;
    }
    if (!progressed) break;
  }
  return selected;
}
