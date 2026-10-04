import type { Skill } from '../../models/types';
import type { ContentPack, LevelContent, TaskTemplate } from '../types';

/**
 * Language-agnostic templates. Used for every language, and as a fallback /
 * extra variety for languages that have a dedicated pack.
 */

type Band = 'beginner' | 'intermediate' | 'advanced';

const BAND_TEMPLATES: Record<Band, Record<Skill, TaskTemplate[]>> = {
  beginner: {
    listening: [
      {
        title: 'Slow podcast: {topic}',
        instructions:
          'Find a beginner podcast episode in {language} about {topic}. Listen once without pausing, then again with the transcript. Note 5 words you recognised.',
        resourceType: 'podcast',
      },
      {
        title: 'Short video with subtitles',
        instructions:
          'Watch a 3–5 min video for {level} learners on {topic}. First with {language} subtitles, then without. Pause and repeat any phrase you like.',
        resourceType: 'video',
      },
      {
        title: 'Listen & pick out numbers and names',
        instructions:
          'Play a short dialogue (train announcement, café order, introductions). Write down every number, name and time you hear.',
        resourceType: 'podcast',
      },
    ],
    reading: [
      {
        title: 'Graded reader: one short chapter',
        instructions:
          'Read one chapter of a graded reader at {level}. Do not translate every word — underline 5 new words and guess their meaning from context.',
        resourceType: 'graded-reader',
      },
      {
        title: 'Read real-world signs & menus',
        instructions:
          'Look up a menu, timetable or shop website in {language} related to {topic}. Find 5 pieces of information (prices, opening hours, dishes…).',
        resourceType: 'article',
      },
      {
        title: 'Mini-text on {topic}',
        instructions:
          'Read a short learner text (150–250 words) on {topic}. Answer for yourself: who, what, where, when?',
        resourceType: 'article',
      },
    ],
    speaking: [
      {
        title: 'Shadowing: everyday phrases',
        instructions:
          'Pick a 30-second clip of a native speaker. Play a sentence, pause, and repeat it out loud copying the rhythm and intonation. Do 5 rounds.',
        resourceType: 'shadowing',
      },
      {
        title: 'Self-talk about {topic}',
        instructions:
          'Set a timer for the task length and describe out loud, in {language}, everything you can about {topic} — simple sentences are perfect.',
        resourceType: 'self-talk',
      },
      {
        title: 'Record yourself introducing yourself',
        instructions:
          'Record a 1-minute introduction (name, where you live, what you do, what you like). Listen back and note one thing to improve.',
        resourceType: 'self-talk',
      },
    ],
    writing: [
      {
        title: 'Write 5 sentences about {topic}',
        instructions:
          'Write 5 simple sentences in {language} about {topic}. Use at least one example of this week\'s grammar: {grammar}.',
        resourceType: 'writing-prompt',
      },
      {
        title: 'Short message to a friend',
        instructions:
          'Write a 40–60 word text message to a friend: suggest a plan related to {topic} (time, place, what to bring).',
        resourceType: 'writing-prompt',
      },
    ],
    vocabulary: [
      {
        title: 'Flashcards: {topic}',
        instructions:
          'Add 10 new words about {topic} to your spaced-repetition deck (with an example sentence each), then review all due cards.',
        resourceType: 'flashcards',
      },
      {
        title: 'Label your surroundings',
        instructions:
          'Pick 10 objects around you and say their names in {language}. Add any you didn\'t know to your flashcards.',
        resourceType: 'flashcards',
      },
    ],
    grammar: [
      {
        title: 'Grammar focus: {grammar}',
        instructions:
          'Read a short explanation of {grammar}, then complete 10 practice exercises. Write down the rule in your own words.',
        resourceType: 'grammar-drill',
      },
      {
        title: 'Pattern drill: {grammar}',
        instructions:
          'Take 5 sentences from this week\'s texts and transform them using {grammar} (e.g. change the person or the tense).',
        resourceType: 'grammar-drill',
      },
    ],
  },
  intermediate: {
    listening: [
      {
        title: 'Podcast episode: {topic}',
        instructions:
          'Listen to a podcast episode in {language} on {topic} for intermediate learners. Summarise the main idea in 2–3 sentences afterwards.',
        resourceType: 'podcast',
      },
      {
        title: 'Native video without subtitles',
        instructions:
          'Watch a YouTube video by a native creator on {topic}. Watch once without subtitles, then check difficult parts with subtitles.',
        resourceType: 'video',
      },
      {
        title: 'Dictation challenge',
        instructions:
          'Pick a 1-minute audio clip with transcript. Write down everything you hear, then compare with the transcript and note your errors.',
        resourceType: 'podcast',
      },
    ],
    reading: [
      {
        title: 'News article on {topic}',
        instructions:
          'Read a news article in {language} related to {topic}. Highlight the key arguments and 8 useful expressions.',
        resourceType: 'article',
      },
      {
        title: 'Graded reader / short story',
        instructions:
          'Read a chapter of a {level} reader or a short story. Write a 3-sentence summary in {language}.',
        resourceType: 'graded-reader',
      },
      {
        title: 'Blog or forum thread',
        instructions:
          'Read an opinion blog post or forum thread about {topic}. Note how people agree, disagree and give reasons.',
        resourceType: 'article',
      },
    ],
    speaking: [
      {
        title: 'Shadowing: natural speech',
        instructions:
          'Shadow a 1–2 minute clip of natural conversation. Focus on linking words and intonation. Repeat until you can keep up.',
        resourceType: 'shadowing',
      },
      {
        title: 'Conversation practice: {topic}',
        instructions:
          'Have a conversation with a tutor, language partner or AI chat partner about {topic}. Prepare 3 questions to ask in advance.',
        resourceType: 'conversation',
      },
      {
        title: 'Two-minute monologue',
        instructions:
          'Record a 2-minute talk giving your opinion on {topic}. Try to use {grammar} at least twice. Listen back and note errors.',
        resourceType: 'self-talk',
      },
    ],
    writing: [
      {
        title: 'Opinion paragraph: {topic}',
        instructions:
          'Write 120–150 words giving your opinion on {topic}. Use linking words (however, therefore, although…). Check it with a corrector or tutor.',
        resourceType: 'writing-prompt',
      },
      {
        title: 'Email practice',
        instructions:
          'Write a semi-formal email (100–120 words) about {topic}: request information, make a complaint or accept an invitation.',
        resourceType: 'writing-prompt',
      },
      {
        title: 'Journal entry',
        instructions:
          'Write a journal entry (100+ words) about your week. Include at least two examples of {grammar}.',
        resourceType: 'writing-prompt',
      },
    ],
    vocabulary: [
      {
        title: 'Collocations: {topic}',
        instructions:
          'Collect 10 collocations (word partnerships) about {topic} from today\'s texts. Add them to flashcards with full example sentences.',
        resourceType: 'flashcards',
      },
      {
        title: 'Synonyms & word families',
        instructions:
          'Take 5 common words from this week and find a synonym and a related noun/verb/adjective for each. Review your due cards.',
        resourceType: 'flashcards',
      },
    ],
    grammar: [
      {
        title: 'Grammar deep-dive: {grammar}',
        instructions:
          'Study {grammar}: read an explanation, do 15 exercises and write 5 sentences of your own about {topic}.',
        resourceType: 'grammar-drill',
      },
      {
        title: 'Error hunt',
        instructions:
          'Go back to your last writing task. Find and correct every mistake related to {grammar} and other recurring errors. Keep an error log.',
        resourceType: 'grammar-drill',
      },
    ],
  },
  advanced: {
    listening: [
      {
        title: 'Long-form podcast / radio',
        instructions:
          'Listen to 20+ minutes of a native podcast or radio debate on {topic}. Note the speakers\' positions and any idioms.',
        resourceType: 'podcast',
      },
      {
        title: 'Film or series scene',
        instructions:
          'Watch a scene from a film or series in {language} without subtitles. Rewatch tricky parts and transcribe 5 colloquial expressions.',
        resourceType: 'video',
      },
      {
        title: 'Lecture or talk',
        instructions:
          'Watch a lecture or conference talk on {topic}. Take structured notes in {language} as you listen.',
        resourceType: 'video',
      },
    ],
    reading: [
      {
        title: 'Long-read / editorial',
        instructions:
          'Read an editorial or long-form article on {topic}. Identify the thesis, supporting arguments and the author\'s tone.',
        resourceType: 'article',
      },
      {
        title: 'Literature: a few pages',
        instructions:
          'Read a few pages of a novel or short story by a native author. Note stylistic devices and unfamiliar idioms.',
        resourceType: 'graded-reader',
      },
      {
        title: 'Professional / academic text',
        instructions:
          'Read a report, academic abstract or professional article on {topic}. Summarise it in 5 bullet points in {language}.',
        resourceType: 'article',
      },
    ],
    speaking: [
      {
        title: 'Debate practice: {topic}',
        instructions:
          'Argue both sides of a debate on {topic} for 3 minutes each. Use hedging, concession and emphasis structures.',
        resourceType: 'conversation',
      },
      {
        title: 'Advanced shadowing',
        instructions:
          'Shadow a fast-paced interview or comedy clip. Focus on connected speech, elision and natural fillers.',
        resourceType: 'shadowing',
      },
      {
        title: 'Presentation rehearsal',
        instructions:
          'Prepare and record a 4-minute presentation on {topic} for {exam}-style or work contexts. Self-evaluate fluency, range and accuracy.',
        resourceType: 'self-talk',
      },
    ],
    writing: [
      {
        title: 'Essay: {topic}',
        instructions:
          'Write a 250–300 word argumentative essay on {topic} with introduction, two developed arguments, counter-argument and conclusion.',
        resourceType: 'writing-prompt',
      },
      {
        title: 'Formal report or proposal',
        instructions:
          'Write a formal report or proposal (200+ words) related to {topic}. Use impersonal structures and precise vocabulary.',
        resourceType: 'writing-prompt',
      },
      {
        title: 'Rewrite for register',
        instructions:
          'Take a paragraph you wrote and rewrite it twice: once very formal, once colloquial. Compare word choices.',
        resourceType: 'writing-prompt',
      },
    ],
    vocabulary: [
      {
        title: 'Idioms & fixed expressions',
        instructions:
          'Collect 8 idioms or fixed expressions from today\'s input. Add them with context sentences and try to use 2 today.',
        resourceType: 'flashcards',
      },
      {
        title: 'Nuance & register',
        instructions:
          'Pick 5 words from {topic} and find near-synonyms with different register or connotation. Add the contrasts to your deck.',
        resourceType: 'flashcards',
      },
    ],
    grammar: [
      {
        title: 'Advanced structure: {grammar}',
        instructions:
          'Study {grammar} in authentic texts. Find 5 real examples, then write 5 sentences of your own about {topic}.',
        resourceType: 'grammar-drill',
      },
      {
        title: 'Accuracy polish',
        instructions:
          'Review your error log. Pick your 3 most frequent mistakes and do targeted exercises for each.',
        resourceType: 'grammar-drill',
      },
    ],
  },
};

const TOPICS = {
  A1: ['Greetings & introductions', 'Family & friends', 'Numbers, dates & time', 'Food & drink', 'Daily routine', 'Home & city', 'Shopping & prices', 'Weather & seasons'],
  A2: ['Travel & transport', 'Past weekend & holidays', 'Health & the body', 'Work & studies', 'Hobbies & free time', 'Restaurants & ordering', 'Directions & places', 'Clothes & shopping'],
  B1: ['Experiences & anecdotes', 'Plans & ambitions', 'Media & entertainment', 'Environment', 'Culture & traditions', 'Technology in daily life', 'Relationships', 'Jobs & interviews'],
  B2: ['Society & current affairs', 'Science & innovation', 'Education systems', 'Work-life balance', 'Arts & literature', 'Globalisation', 'Health & lifestyle debates', 'Business & economy'],
  C1: ['Politics & institutions', 'Ethics & philosophy', 'Professional communication', 'Language & identity', 'Economy & finance', 'Urban planning & sustainability', 'Psychology & behaviour', 'History & memory'],
  C2: ['Rhetoric & persuasion', 'Literary criticism', 'Law & justice', 'Humour & wordplay', 'Regional varieties & dialects', 'Philosophy of science', 'Diplomacy & negotiation', 'Translation & nuance'],
} as const;

const GRAMMAR = {
  A1: ['the verb "to be" & pronouns', 'present tense of regular verbs', 'articles & gender', 'question words', 'negation', 'possessives', 'common irregular verbs', 'prepositions of place'],
  A2: ['past tense (completed actions)', 'near future ("going to")', 'comparatives & superlatives', 'object pronouns', 'reflexive / routine verbs', 'adverbs of frequency', 'imperatives', 'past habitual / descriptions'],
  B1: ['contrasting past tenses', 'future & conditional', 'relative clauses', 'expressing opinion & doubt', 'reported speech (basics)', 'connectors & linking words', 'perfect tenses', 'passive voice (basics)'],
  B2: ['subjunctive / hypothetical moods', 'conditionals (all types)', 'advanced reported speech', 'passive & impersonal structures', 'complex relative clauses', 'nuanced connectors', 'verb + preposition patterns', 'emphasis & word order'],
  C1: ['advanced hypothetical structures', 'nominalisation', 'inversion & emphasis', 'register-specific structures', 'discourse markers', 'idiomatic verb phrases', 'hedging language', 'complex subordination'],
  C2: ['stylistic word order', 'archaic & literary forms', 'subtle mood distinctions', 'ellipsis & substitution', 'rhetorical devices', 'idiomatic grammar exceptions', 'register switching', 'precision & concision'],
} as const;

function level(band: Band, key: keyof typeof TOPICS): LevelContent {
  return { topics: [...TOPICS[key]], grammar: [...GRAMMAR[key]], templates: BAND_TEMPLATES[band] };
}

export const genericPack: ContentPack = {
  language: '*',
  levels: {
    A1: level('beginner', 'A1'),
    A2: level('beginner', 'A2'),
    B1: level('intermediate', 'B1'),
    B2: level('intermediate', 'B2'),
    C1: level('advanced', 'C1'),
    C2: level('advanced', 'C2'),
  },
};
