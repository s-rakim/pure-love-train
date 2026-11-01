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

/** The built-in question for a day, used until your server has sent that day's one. */
export function questionForDay(key: DateKey): { index: number; text: string } {
  const index = ((diffDays('2026-01-01', key) % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length;
  return { index, text: QUESTIONS[index] };
}

/** The day's question: from your server when it has one (no repeats for two years), else built in. */
export function questionText(questions: Record<DateKey, string> | undefined, key: DateKey): string {
  return questions?.[key] ?? questionForDay(key).text;
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

/**
 * This or that: quick pairs you each pick a side of, then see where you agree.
 * Picks are saved under the id, so an id never changes once it's out there.
 */
export const THIS_OR_THAT: { id: string; a: string; b: string }[] = [
  { id: 'night-in-out', a: '🛋️ Night in', b: '🍸 Night out' },
  { id: 'beach-mountains', a: '🏖️ Beach', b: '🏔️ Mountains' },
  { id: 'coffee-tea', a: '☕ Coffee', b: '🍵 Tea' },
  { id: 'sunrise-sunset', a: '🌅 Sunrise', b: '🌇 Sunset' },
  { id: 'cook-takeout', a: '🍳 Cook together', b: '🥡 Order in' },
  { id: 'texts-calls', a: '💬 Texts', b: '📞 Calls' },
  { id: 'big-little-spoon', a: '🥄 Big spoon', b: '🤏 Little spoon' },
  { id: 'plan-spontaneous', a: '🗓️ Plan it all', b: '🎲 Go with the flow' },
  { id: 'city-cabin', a: '🏙️ City break', b: '🌲 Cabin in the woods' },
  { id: 'movie-series', a: '🎬 One movie', b: '📺 A series binge' },
  { id: 'sweet-savory', a: '🍰 Sweet', b: '🍟 Savory' },
  { id: 'kiss-hug', a: '😘 A kiss', b: '🤗 A long hug' },
  { id: 'early-late', a: '🐓 Early bird', b: '🦉 Night owl' },
  { id: 'gift-time', a: '🎁 A thoughtful gift', b: '⏳ A whole day together' },
  { id: 'letter-song', a: '💌 A love letter', b: '🎶 A song about us' },
  { id: 'cats-dogs', a: '🐱 Cats', b: '🐶 Dogs' },
  { id: 'summer-winter', a: '☀️ Summer', b: '❄️ Winter' },
  { id: 'road-flight', a: '🚗 Road trip', b: '✈️ Fly somewhere far' },
  { id: 'pizza-sushi', a: '🍕 Pizza', b: '🍣 Sushi' },
  { id: 'surprise-plan', a: '🎉 Surprise me', b: '📝 Tell me the plan' },
  { id: 'party-dinner', a: '🎊 Big party', b: '🕯️ Dinner for two' },
  { id: 'rain-sun', a: '🌧️ Rainy day in', b: '🌞 Sunny day out' },
  { id: 'photos-moment', a: '📸 Take photos', b: '👀 Just live it' },
  { id: 'museum-concert', a: '🖼️ Museum', b: '🎸 Concert' },
  { id: 'breakfast-dinner', a: '🥞 Breakfast date', b: '🍷 Dinner date' },
  { id: 'movie-game-night', a: '🍿 Movie night', b: '🎲 Game night' },
  { id: 'say-show', a: '🗣️ Say I love you', b: '🫶 Show I love you' },
  { id: 'old-new-spot', a: '📍 Our favourite spot', b: '🧭 Somewhere new' },
  { id: 'chocolate-flowers', a: '🍫 Chocolate', b: '💐 Flowers' },
  { id: 'talk-sleep', a: '🌙 Stay up talking', b: '😴 Early night, cuddled up' },
  { id: 'hike-spa', a: '🥾 Hike', b: '🧖 Spa day' },
  { id: 'dance-karaoke', a: '💃 Dancing', b: '🎤 Karaoke' },
  { id: 'note-voice', a: '✍️ Handwritten note', b: '🎙️ Voice note' },
  { id: 'past-future', a: '💭 Relive our first date', b: '🔮 Plan our next adventure' },
  { id: 'matching-outfits', a: '👕 Matching outfits', b: '🙅 Absolutely not' },
  { id: 'paris-tokyo', a: '🗼 Paris', b: '🗾 Tokyo' },
];

/** Splits "🏖️ Beach" into its emoji and its words. */
export function splitOption(option: string): { emoji: string; text: string } {
  const space = option.indexOf(' ');
  return { emoji: option.slice(0, space), text: option.slice(space + 1) };
}
