import 'server-only';

import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/server/db';
import { academyLessonNotes, academyLessons } from '@/server/db/schema';

export type LessonNoteDto = {
  id: string;
  content: string;
  videoPositionSeconds: number;
  createdAt: string;
};

function toDto(row: {
  id: string;
  content: string;
  videoPositionSeconds: number;
  createdAt: Date;
}): LessonNoteDto {
  return {
    id: row.id,
    content: row.content,
    videoPositionSeconds: row.videoPositionSeconds,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listLessonNotes(userId: string, lessonId: string) {
  const [lesson] = await db
    .select({ id: academyLessons.id })
    .from(academyLessons)
    .where(eq(academyLessons.id, lessonId))
    .limit(1);

  if (!lesson) {
    return { ok: false as const, code: 'NOT_FOUND' as const };
  }

  const rows = await db
    .select({
      id: academyLessonNotes.id,
      content: academyLessonNotes.content,
      videoPositionSeconds: academyLessonNotes.videoPositionSeconds,
      createdAt: academyLessonNotes.createdAt,
    })
    .from(academyLessonNotes)
    .where(and(eq(academyLessonNotes.userId, userId), eq(academyLessonNotes.lessonId, lessonId)))
    .orderBy(desc(academyLessonNotes.createdAt));

  return { ok: true as const, items: rows.map(toDto) };
}

export async function createLessonNote(
  userId: string,
  lessonId: string,
  input: { content: string; videoPositionSeconds: number },
) {
  const [lesson] = await db
    .select({ id: academyLessons.id })
    .from(academyLessons)
    .where(eq(academyLessons.id, lessonId))
    .limit(1);

  if (!lesson) {
    return { ok: false as const, code: 'NOT_FOUND' as const };
  }

  const [created] = await db
    .insert(academyLessonNotes)
    .values({
      userId,
      lessonId,
      content: input.content,
      videoPositionSeconds: input.videoPositionSeconds,
    })
    .returning({
      id: academyLessonNotes.id,
      content: academyLessonNotes.content,
      videoPositionSeconds: academyLessonNotes.videoPositionSeconds,
      createdAt: academyLessonNotes.createdAt,
    });

  if (!created) {
    return { ok: false as const, code: 'NOT_FOUND' as const };
  }

  return { ok: true as const, item: toDto(created) };
}

export async function deleteLessonNote(userId: string, noteId: string) {
  const [deleted] = await db
    .delete(academyLessonNotes)
    .where(and(eq(academyLessonNotes.id, noteId), eq(academyLessonNotes.userId, userId)))
    .returning({ id: academyLessonNotes.id });

  if (!deleted) {
    return { ok: false as const, code: 'NOT_FOUND' as const };
  }

  return { ok: true as const };
}
