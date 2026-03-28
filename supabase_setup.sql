-- ============================================
-- BHUMI SOUL EXAM MANAGEMENT - DATABASE SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Admin Settings Table
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_password TEXT NOT NULL DEFAULT 'admin123',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin password
INSERT INTO admin_settings (admin_password) VALUES ('admin123');

-- 2. Students Table
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  login_id TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#0575e6',
  total_tests_taken INTEGER DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,
  rank INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tests Table
CREATE TABLE IF NOT EXISTS tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  total_questions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  difficulty TEXT DEFAULT 'Medium',
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Test Attempts Table
CREATE TABLE IF NOT EXISTS test_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  time_taken_seconds INTEGER DEFAULT 0,
  tab_switches INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned'))
);

-- 6. Attempt Answers Table
CREATE TABLE IF NOT EXISTS attempt_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer CHAR(1) CHECK (selected_answer IN ('A','B','C','D',NULL)),
  is_correct BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Enable Row Level Security (but allow all for anon for simplicity)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;

-- Policies: Allow full access via anon key
DROP POLICY IF EXISTS "Allow all on admin_settings" ON admin_settings;
CREATE POLICY "Allow all on admin_settings" ON admin_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on students" ON students;
CREATE POLICY "Allow all on students" ON students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on tests" ON tests;
CREATE POLICY "Allow all on tests" ON tests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on questions" ON questions;
CREATE POLICY "Allow all on questions" ON questions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on test_attempts" ON test_attempts;
CREATE POLICY "Allow all on test_attempts" ON test_attempts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on attempt_answers" ON attempt_answers;
CREATE POLICY "Allow all on attempt_answers" ON attempt_answers FOR ALL USING (true) WITH CHECK (true);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student_id ON test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_students_login_id ON students(login_id);

-- 9. Insert some sample students
INSERT INTO students (name, email, login_id, password, avatar_color) VALUES
  ('Demo Student', 'demo@bhumisoul.com', 'demo', 'demo123', '#00f260')
ON CONFLICT (login_id) DO NOTHING;

-- 10. Pro Features Upgrades (Safe to run multiple times)
ALTER TABLE test_attempts ADD COLUMN IF NOT EXISTS tab_switches INTEGER DEFAULT 0;
ALTER TABLE attempt_answers ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0;
