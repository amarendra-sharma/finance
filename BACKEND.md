# Finance console — backend manifest

The finance console (`index.html`) calls **54** distinct `fin_` database objects. `fin-backend.sql` (reprefixed from the International Trade schema) creates the **27 core** ones. The **27** below are the advanced grading/reporting objects that the game-theory (`sa_`) schema has but International Trade's on-disk SQL does not. Port them from your Strategy Arena project.

## Recommended: one-step port from the sa_ schema

Because the finance console **is** the game-theory console, the exact-match source is the `sa_` schema in your Strategy Arena Supabase project. In the Supabase SQL editor (or via `pg_dump --schema-only`):

1. Dump the definitions of the objects below (functions with `pg_get_functiondef`, views with `pg_get_viewdef`).
2. Search-replace `sa_` → `fin_` in that SQL.
3. Run it in the same project. (This is exactly how each MacroNations course's prefixed schema was created.)

## RPC functions to port (25)

- `fin_add_course_staff()`
- `fin_adopt_exam()`
- `fin_count_blank_written()`
- `fin_delete_grader_key()`
- `fin_exam_review()`
- `fin_grade_blanks_zero()`
- `fin_grade_breakdown()`
- `fin_has_grader_key()`
- `fin_instructor_grade_written()`
- `fin_instructor_pending_written()`
- `fin_list_course_staff()`
- `fin_list_overrides()`
- `fin_my_resume_counts()`
- `fin_quiz_review()`
- `fin_recompute_all_quiz_scores()`
- `fin_remove_course_staff()`
- `fin_reopen_unanswered_exam()`
- `fin_save_grader_key()`
- `fin_set_exam_override()`
- `fin_set_quiz_override()`
- `fin_student_arena_attempts()`
- `fin_student_full_grades()`
- `fin_student_unfinished_by_exam()`
- `fin_unanswered_exam_preview()`
- `fin_void_arena_attempt()`

## Views to port (2)

- `fin_exam_overrides`
- `fin_quiz_deadline_overrides`

## Until they're ported

The console calls these with `notInstalled()`-style guards in most places, so the affected features (written-answer grading, exam adoption, quiz/exam overrides, arena voiding, and some grade-breakdown/reporting panels) show a 'not installed' notice rather than crashing. Core student flow — sign in, enroll, read chapters, play arenas, take exams, see gradebook — runs on the core objects in `fin-backend.sql`.
