import {computed, Injectable, signal} from '@angular/core';

/**
 * Maps each epub section (the API pageNum) to how many on-screen column-pages it spans in a column layout,
 * so the reader can show a book-wide page number and the ToC can show per-chapter start pages.
 */
@Injectable({ providedIn: 'root' })
export class BookColumnMapService {

  private readonly _chapterId = signal<number | null>(null);
  private readonly _layoutKey = signal<string>('');
  private readonly _counts = signal<number[]>([]);
  private readonly _measuring = signal<boolean>(false);

  // Committed once a measuring pass finishes, so displayed numbers never tick up while counting.
  private readonly _committed = signal<{chapterId: number, counts: number[]} | null>(null);

  readonly counts = this._counts.asReadonly();
  readonly measuring = this._measuring.asReadonly();

  readonly isComplete = computed(() => {
    const counts = this._counts();
    return counts.length > 0 && counts.every(c => c > 0);
  });

  private readonly committedOffsets = computed(() => {
    const committed = this._committed();
    if (!committed) return [];

    const offsets: number[] = [];
    let acc = 0;
    for (let i = 0; i < committed.counts.length; i++) {
      offsets.push(acc);
      acc += committed.counts[i] || 0;
    }
    return offsets;
  });

  readonly committedTotal = computed(() => {
    const committed = this._committed();
    return committed ? committed.counts.reduce((acc, c) => acc + (c || 0), 0) : 0;
  });

  isMeasured(chapterId: number, layoutKey: string) {
    return this._chapterId() === chapterId && this._layoutKey() === layoutKey;
  }

  hasCommitted(chapterId: number) {
    return this._committed()?.chapterId === chapterId;
  }

  reset(chapterId: number, sectionCount: number, layoutKey: string) {
    this._chapterId.set(chapterId);
    this._layoutKey.set(layoutKey);
    this._counts.set(new Array(Math.max(0, sectionCount)).fill(0));
    this._measuring.set(false);
  }

  clear() {
    this._chapterId.set(null);
    this._layoutKey.set('');
    this._counts.set([]);
    this._measuring.set(false);
    this._committed.set(null);
  }

  setMeasuring(value: boolean) {
    this._measuring.set(value);
  }

  setCount(section: number, count: number) {
    const counts = [...this._counts()];
    if (section < 0 || section >= counts.length) return;

    const next = Math.max(1, Math.round(count));
    if (counts[section] === next) return;

    counts[section] = next;
    this._counts.set(counts);
  }

  // Freezes the current counts as the values the UI displays.
  commit() {
    const chapterId = this._chapterId();
    if (chapterId === null) return;
    this._committed.set({chapterId, counts: [...this._counts()]});
  }

  // 1-based book-wide start page of a section from the committed snapshot, or null if unavailable.
  committedStartPage(section: number): number | null {
    const committed = this._committed();
    if (!committed || section < 0 || section >= committed.counts.length) return null;
    return (this.committedOffsets()[section] ?? 0) + 1;
  }

  // Number of column pages in a section from the committed snapshot, or null if unavailable.
  committedSectionCount(section: number): number | null {
    const committed = this._committed();
    if (!committed || section < 0 || section >= committed.counts.length) return null;
    return committed.counts[section] || null;
  }

  // Maps a 1-based book-wide column page to its section and 1-based column within that section.
  committedLocate(page: number): {section: number, column: number} | null {
    const committed = this._committed();
    if (!committed) return null;

    const offsets = this.committedOffsets();
    const target = Math.min(Math.max(1, page), this.committedTotal());
    for (let section = 0; section < committed.counts.length; section++) {
      const start = offsets[section] + 1;
      const end = offsets[section] + (committed.counts[section] || 0);
      if (target >= start && target <= end) {
        return {section, column: target - start + 1};
      }
    }
    return null;
  }
}
