// Vietnamese ⇄ English phrase bank. Meanings are everyday translations; where a
// translation is natural rather than word-for-word, `note` says so. No audio is
// included (we don't fake pronunciation).

export interface Phrase {
  vi: string
  en: string
  note?: string
}

export const GLOSSARY: Phrase[] = [
  { vi: 'Út ơi!', en: 'Hey, Út!', note: '“ơi” after a name is a warm way to call someone.' },
  { vi: 'Satyam ơi!', en: 'Hey, Satyam!', note: 'Same “ơi” — calling out to Satyam.' },
  { vi: 'Xin chào', en: 'Hello' },
  { vi: 'Cảm ơn', en: 'Thank you' },
  { vi: 'Không có gì', en: 'You’re welcome', note: 'Literally “it’s nothing”.' },
  { vi: 'Ngủ ngon', en: 'Sleep well / Good night' },
  { vi: 'Hẹn gặp lại', en: 'See you again' },
  { vi: 'Chúc một ngày tốt lành', en: 'Have a nice day' },
  { vi: 'Cà phê sữa đá', en: 'Iced coffee with condensed milk' },
  { vi: 'Ngon quá!', en: 'So delicious!' },
  { vi: 'Đẹp quá!', en: 'So beautiful!' },
  { vi: 'Cố lên!', en: 'Keep going! / You can do it!' },
  { vi: 'Không sao đâu', en: 'It’s okay / No problem' },
  { vi: 'Từ từ', en: 'Slowly / Take it easy' },
  { vi: 'Một chút', en: 'A little bit' },
  { vi: 'Con mèo', en: 'The cat' },
  { vi: 'Con chó', en: 'The dog' },
  { vi: 'Trà', en: 'Tea' },
  { vi: 'Mưa', en: 'Rain' },
  { vi: 'Học', en: 'To study / to learn' },
]

/** English sentences for the English → Vietnamese direction, with hand-written options. */
export interface EnglishItem {
  en: string
  options: string[] // options[0] is correct; the quiz shuffles them
  note?: string
}

export const ENGLISH_ITEMS: EnglishItem[] = [
  {
    en: 'I owe you a coffee',
    options: ['Tôi nợ bạn một ly cà phê', 'Tôi mời bạn uống trà', 'Cà phê này ngon quá', 'Tôi không uống cà phê'],
  },
  {
    en: 'You passed the confidence test',
    options: ['Bạn đã vượt qua bài kiểm tra sự tự tin', 'Bạn cần học thêm', 'Bài kiểm tra rất khó', 'Tôi quên bài tập'],
  },
  {
    en: 'The cat has stolen the homework',
    options: ['Con mèo đã lấy trộm bài tập về nhà', 'Con chó đang ngủ', 'Bài tập về nhà rất dễ', 'Con mèo thích cà phê'],
  },
  {
    en: 'One question at a time, Professor',
    options: ['Từng câu hỏi một thôi, Giáo sư', 'Giáo sư đang uống cà phê', 'Hỏi tôi bất cứ điều gì', 'Hôm nay không có lớp'],
    note: 'A natural translation rather than word-for-word.',
  },
  { en: 'Good night', options: ['Ngủ ngon', 'Xin chào', 'Cảm ơn', 'Hẹn gặp lại'] },
  { en: 'Thank you', options: ['Cảm ơn', 'Không sao đâu', 'Ngon quá!', 'Từ từ'] },
  { en: 'See you again', options: ['Hẹn gặp lại', 'Ngủ ngon', 'Cố lên!', 'Một chút'] },
  { en: 'So delicious!', options: ['Ngon quá!', 'Đẹp quá!', 'Cảm ơn', 'Trà'] },
  { en: 'Keep going!', options: ['Cố lên!', 'Từ từ', 'Không có gì', 'Mưa'] },
  { en: 'It’s okay', options: ['Không sao đâu', 'Học', 'Xin chào', 'Con mèo'] },
]

export type Direction = 'vi-en' | 'en-vi'

export interface QuizQuestion {
  prompt: string
  options: string[]
  correct: number
  note?: string
}

export const QUIZ_LENGTH = 8

export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Builds a quiz. Vietnamese → English distractors come from other glossary meanings. */
export function buildQuiz(direction: Direction, rand: () => number = Math.random): QuizQuestion[] {
  if (direction === 'en-vi') {
    return shuffle(ENGLISH_ITEMS, rand)
      .slice(0, QUIZ_LENGTH)
      .map((item) => {
        const opts = shuffle(item.options, rand)
        return { prompt: item.en, options: opts, correct: opts.indexOf(item.options[0]), note: item.note }
      })
  }
  return shuffle(GLOSSARY, rand)
    .slice(0, QUIZ_LENGTH)
    .map((p) => {
      const distractors = shuffle(
        GLOSSARY.filter((g) => g.en !== p.en),
        rand,
      )
        .slice(0, 3)
        .map((g) => g.en)
      const opts = shuffle([p.en, ...distractors], rand)
      return { prompt: p.vi, options: opts, correct: opts.indexOf(p.en), note: p.note }
    })
}
