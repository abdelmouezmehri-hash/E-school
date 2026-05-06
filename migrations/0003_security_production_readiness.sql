-- Security/scalability hardening. Written to be idempotent for PostgreSQL.
ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE students ADD CONSTRAINT students_status_check CHECK (status IN ('active', 'stopped', 'graduated', 'deleted'));

CREATE INDEX IF NOT EXISTS students_parent_id_idx ON students(parent_id);
CREATE INDEX IF NOT EXISTS students_teacher_id_idx ON students(teacher_id);
CREATE INDEX IF NOT EXISTS students_branch_id_idx ON students(branch_id);
CREATE INDEX IF NOT EXISTS payments_student_id_idx ON payments(student_id);
CREATE INDEX IF NOT EXISTS payments_status_due_date_idx ON payments(status, due_date);
CREATE INDEX IF NOT EXISTS evaluations_student_week_idx ON evaluations(student_id, week_number);

ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_speaking_score_range;
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_confidence_score_range;
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_participation_score_range;
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_progress_score_range;
ALTER TABLE evaluations ADD CONSTRAINT evaluations_speaking_score_range CHECK (speaking_score BETWEEN 1 AND 10);
ALTER TABLE evaluations ADD CONSTRAINT evaluations_confidence_score_range CHECK (confidence_score BETWEEN 1 AND 10);
ALTER TABLE evaluations ADD CONSTRAINT evaluations_participation_score_range CHECK (participation_score BETWEEN 1 AND 10);
ALTER TABLE evaluations ADD CONSTRAINT evaluations_progress_score_range CHECK (progress_score BETWEEN 0 AND 100);

-- Prevent the free-consultation race by enforcing exactly one free consultation per parent.
CREATE UNIQUE INDEX IF NOT EXISTS consultations_one_free_per_parent_idx
  ON consultations(parent_id)
  WHERE type = 'free';
