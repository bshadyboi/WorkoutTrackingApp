-- Pull A, Tue Sep 15 cleanup.

-- B: Incline One Arm DB Curl, set 1 right side was 27.5 × 2 (typo) → 27.5 × 12.
update set_logs set reps = 12
where id = '0c94104d-7853-4bd1-9cc6-b6453384b56b';

-- A: log Seated Cable Row D Handle left and right from now on.
update workout_exercises set unilateral = true
where id = '17a72a5c-7301-4a54-b22f-3cb1829b4073';
