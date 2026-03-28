// ============================================
// TXT File Parser for Questions
// Supports multiple formats
// ============================================

/**
 * Parse a TXT file content into an array of question objects.
 * 
 * Supported formats:
 * 
 * Format 1:
 * 1. Question text?
 * A) Option A
 * B) Option B
 * C) Option C
 * D) Option D
 * Answer: A
 * 
 * Format 2:
 * 1. Question text?
 * a. Option A
 * b. Option B
 * c. Option C
 * d. Option D
 * Answer: A
 * 
 * Format 3:
 * Question text?
 * Option A
 * Option B
 * Option C
 * Option D
 * A (or B, C, D)
 */
export function parseQuestionsTxt(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const questions = [];
  let i = 0;

  while (i < lines.length) {
    const question = tryParseQuestion(lines, i);
    if (question) {
      questions.push(question);
      i = question._nextIndex;
    } else {
      i++;
    }
  }

  return questions;
}

function tryParseQuestion(lines, startIdx) {
  // Try Format 1/2: Numbered question with labeled options
  const qMatch = lines[startIdx]?.match(/^\d+[\.\)]\s*(.+)/);
  
  if (qMatch && startIdx + 5 < lines.length) {
    const questionText = qMatch[1];
    
    // Check for labeled options (A), a., A., A:, etc.)
    const optPatterns = [
      /^[Aa](?:[\.\)\:]\s*|\s+)(.+)/,
      /^[Bb](?:[\.\)\:]\s*|\s+)(.+)/,
      /^[Cc](?:[\.\)\:]\s*|\s+)(.+)/,
      /^[Dd](?:[\.\)\:]\s*|\s+)(.+)/,
    ];
    
    const optA = lines[startIdx + 1]?.match(optPatterns[0]);
    const optB = lines[startIdx + 2]?.match(optPatterns[1]);
    const optC = lines[startIdx + 3]?.match(optPatterns[2]);
    const optD = lines[startIdx + 4]?.match(optPatterns[3]);
    
    if (optA && optB && optC && optD) {
      // Look for answer line
      const answerLine = lines[startIdx + 5];
      const ansMatch = answerLine?.match(/(?:answer|ans|correct|key)[\s\:\-]*([ABCD])/i) 
                     || answerLine?.match(/^([ABCD])$/i);
      
      if (ansMatch) {
        return {
          question_text: questionText,
          option_a: optA[1],
          option_b: optB[1],
          option_c: optC[1],
          option_d: optD[1],
          correct_answer: ansMatch[1].toUpperCase(),
          _nextIndex: startIdx + 6
        };
      }
    }
  }
  
  // Try Format 3: Plain question with unlabeled options
  if (startIdx + 4 < lines.length) {
    const line0 = lines[startIdx];
    // Skip if line starts with answer pattern
    if (/^(?:answer|ans|correct|key)/i.test(line0)) return null;
    
    // Check if line could be a question (ends with ? or has question-like structure)
    const couldBeQuestion = line0.match(/^\d+[\.\)]\s*(.+)/) || line0.length > 15;
    
    if (couldBeQuestion) {
      const questionText = line0.replace(/^\d+[\.\)]\s*/, '');
      const opt1 = lines[startIdx + 1];
      const opt2 = lines[startIdx + 2];
      const opt3 = lines[startIdx + 3];
      const opt4 = lines[startIdx + 4];
      
      // Check if next 4 lines are reasonable options (not too long, not a question pattern)
      const looksLikeOptions = [opt1, opt2, opt3, opt4].every(o => 
        o && o.length < 200 && !/^\d+[\.\)]/.test(o)
      );
      
      if (looksLikeOptions) {
        // Check for answer on line 5
        const answerLine = lines[startIdx + 5];
        const ansMatch = answerLine?.match(/(?:answer|ans|correct|key)[\s\:\-]*([ABCD])/i) 
                       || answerLine?.match(/^([ABCD])$/i);
        
        if (ansMatch) {
          // Strip option prefixes from unlabeled options  
          const stripPrefix = (s) => s.replace(/^[A-Da-d](?:[\.\)\:]\s*|\s+)/, '');
          return {
            question_text: questionText,
            option_a: stripPrefix(opt1),
            option_b: stripPrefix(opt2),
            option_c: stripPrefix(opt3),
            option_d: stripPrefix(opt4),
            correct_answer: ansMatch[1].toUpperCase(),
            _nextIndex: startIdx + 6
          };
        }
      }
    }
  }
  
  return null;
}
