-- Unlimited retakes: NULL means no limit (see academy-exams remainingRetakes logic)
UPDATE "academy_question_banks"
SET "max_retakes" = NULL
WHERE "max_retakes" IS NOT NULL;
