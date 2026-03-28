import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cyavsbudegokjogfyarp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YXZzYnVkZWdva2pvZ2Z5YXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTM0MjQsImV4cCI6MjA5MDE4OTQyNH0.12Xw2JX87-WG4AF07A0Ms1JtdAF5UL16g9boBWwfx4I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function insertTest() {
  const { data: test, error: testErr } = await supabase.from('tests').insert({
    title: 'Global Knowledge Pro',
    description: 'A sample automated test to verify proctoring.',
    duration_minutes: 15,
    total_questions: 3
  }).select().single();

  if (testErr) return console.error(testErr);

  const questions = [
    {
      test_id: test.id,
      question_text: 'What is the capital of France?',
      option_a: 'London',
      option_b: 'Berlin',
      option_c: 'Paris',
      option_d: 'Madrid',
      correct_answer: 'C',
      order_num: 1
    },
    {
      test_id: test.id,
      question_text: 'Which planet is known as the Red Planet?',
      option_a: 'Venus',
      option_b: 'Mars',
      option_c: 'Jupiter',
      option_d: 'Saturn',
      correct_answer: 'B',
      order_num: 2
    },
    {
      test_id: test.id,
      question_text: 'What is 5 + 7?',
      option_a: '10',
      option_b: '11',
      option_c: '12',
      option_d: '13',
      correct_answer: 'C',
      order_num: 3
    }
  ];

  const { error: qErr } = await supabase.from('questions').insert(questions);
  if (qErr) return console.error('Question Err', qErr);

  console.log('SUCCESS');
}

insertTest();
