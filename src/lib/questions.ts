import { diffDays, type DateKey } from './dates.ts';

export const QUESTIONS = [
  'What is a small thing I do that makes your day better?',
  'Which trip together would you relive tomorrow if you could?',
  'What song makes you think of us?',
  'What was your first impression of me, honestly?',
  'What is one thing you want us to learn together this year?',
  'When do you feel most loved by me?',
  'What is your favourite way to spend a slow Sunday together?',
  'Which meal of ours would you rate a perfect ten?',
  'What is something you have never told me that you are proud of?',
  'If we had a free weekend and no budget, what would we do?',
  'What is a habit of mine you secretly find adorable?',
  'What is one dream you want me to help you chase?',
  'What moment made you realise this was serious?',
  'How do you like to be comforted after a hard day?',
  'Which of our inside jokes still makes you laugh?',
  'What does a perfect date night look like right now?',
  'What is something new you would like to try in our relationship?',
  'Which photo of us is your favourite and why?',
  'What would you like our home to feel like in five years?',
  'What is one thing I could do this week to make you feel supported?',
  'What is the kindest thing someone has done for you?',
  'Where would you take me to show me your childhood?',
  'What is a tradition you would like us to start?',
  'What do you appreciate most about how we handle disagreements?',
  'What is something that always makes you think of me?',
  'If our relationship were a movie, what would it be called?',
  'What is one way we have grown together?',
  'What is your love language this week?',
  'What is a compliment you would love to hear more often?',
  'What made you smile today?',
  'Which small adventure should we plan for this month?',
  'What is something you are looking forward to with me?',
  'What is one thing you would like us to do more of?',
  'What do you think we do better than most couples?',
  'What is a memory of us that feels like home?',
  'What is something you are worried about that I could help with?',
  'What did you love about the last time we were apart and reunited?',
  'Which of my friends do you like most, and why?',
  'What would you write in a note to us one year from now?',
  'What is the best gift you have ever received from me?',
];

/** The same question for both partners on a given day. */
export function questionForDay(key: DateKey): { index: number; text: string } {
  const index = ((diffDays('2026-01-01', key) % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length;
  return { index, text: QUESTIONS[index] };
}

export const DATE_IDEAS = [
  'Cook a recipe from the country you most want to visit',
  'Sunrise walk with coffee in a thermos',
  'Build a blanket fort and watch a childhood movie',
  'Write each other letters to open in a year',
  'Pick a random bus or train line and ride it to the end',
  'Thrift each other an outfit under $20',
  'Picnic with only foods neither of you has tried',
  'Stargazing with a sky map app',
];
