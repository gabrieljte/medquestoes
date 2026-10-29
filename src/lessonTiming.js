import catalog from './lessonDurations.json';

export function durationText(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Sem tempo definido';
  const value = Math.round(seconds), hours = Math.floor(value / 3600), minutes = Math.floor(value % 3600 / 60), rest = value % 60;
  return [hours && `${hours}h`, (minutes || hours) && `${minutes}min`, `${rest}s`].filter(Boolean).join(' ');
}

export function withLessonTiming(block) {
  const entry = catalog.blocks[block.id];
  if (!entry) return block;
  if (entry.sourceUrls && JSON.stringify([block.url, block.secondaryUrl].filter(Boolean)) !== JSON.stringify(entry.sourceUrls)) return block;
  const lessons = entry.lessons.map(id => catalog.lessons[id]).filter(Boolean);
  const measured = lessons.filter(lesson => Number.isFinite(lesson.seconds) && lesson.seconds > 0);
  const confirmedSeconds = measured.reduce((sum, lesson) => sum + lesson.seconds, 0);
  return {...block, lessons, measuredCount: measured.length, confirmedSeconds,
    timingComplete: lessons.length > 0 && measured.length === lessons.length && entry.complete,
    timingCheckedAt: catalog.checkedAt, timingIssue: entry.issue};
}

export const confirmedTime = block => block.lessons ? block.confirmedSeconds : (block.seconds || 0);
export const completeTime = block => block.lessons ? block.timingComplete : Boolean(block.seconds);
