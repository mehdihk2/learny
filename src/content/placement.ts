import type { LanguageCode } from '../models/types';
import { CAN_DO } from './canDo';
import type { MultipleChoiceQuestion, TargetLevel } from './types';

export type PlacementQuestion =
  | ({ kind: 'mcq' } & MultipleChoiceQuestion)
  | { kind: 'self'; id: string; level: TargetLevel; prompt: string };

const mcq = (q: MultipleChoiceQuestion): PlacementQuestion => ({ kind: 'mcq', ...q });

const SPANISH: PlacementQuestion[] = [
  // A1
  mcq({ id: 'pes-1', level: 'A1', skill: 'grammar', prompt: 'Hola, ¿cómo te ___?', options: ['llamas', 'llamo', 'llama', 'llaman'], answer: 0 }),
  mcq({ id: 'pes-2', level: 'A1', skill: 'grammar', prompt: 'Mi hermano ___ 25 años.', options: ['es', 'está', 'tiene', 'hay'], answer: 2 }),
  mcq({ id: 'pes-3', level: 'A1', skill: 'vocabulary', prompt: '"Agua" means…', options: ['water', 'air', 'bread', 'milk'], answer: 0 }),
  // A2
  mcq({ id: 'pes-4', level: 'A2', skill: 'grammar', prompt: 'El año pasado ___ a Argentina.', options: ['viajo', 'viajé', 'viajaré', 'viajando'], answer: 1 }),
  mcq({ id: 'pes-5', level: 'A2', skill: 'grammar', prompt: 'Mañana ___ a visitar a mis abuelos.', options: ['voy', 'fui', 'iba', 'he ido'], answer: 0 }),
  mcq({ id: 'pes-6', level: 'A2', skill: 'grammar', prompt: '¿Las llaves? No ___ encuentro.', options: ['los', 'las', 'les', 'la'], answer: 1 }),
  // B1
  mcq({ id: 'pes-7', level: 'B1', skill: 'grammar', prompt: 'Quiero que tú ___ conmigo.', options: ['vienes', 'vengas', 'vendrás', 'venir'], answer: 1 }),
  mcq({ id: 'pes-8', level: 'B1', skill: 'grammar', prompt: 'Mientras ___ la cena, sonó el teléfono.', options: ['preparé', 'preparaba', 'prepararé', 'prepare'], answer: 1 }),
  mcq({ id: 'pes-9', level: 'B1', skill: 'grammar', prompt: 'Gracias ___ tu ayuda.', options: ['para', 'por', 'de', 'con'], answer: 1 }),
  // B2
  mcq({ id: 'pes-10', level: 'B2', skill: 'grammar', prompt: 'Si lo ___ sabido, te lo habría dicho.', options: ['habría', 'había', 'hubiera', 'haya'], answer: 2 }),
  mcq({ id: 'pes-11', level: 'B2', skill: 'grammar', prompt: 'Te llamaré en cuanto ___ a casa.', options: ['llego', 'llegue', 'llegaré', 'llegaba'], answer: 1 }),
  mcq({ id: 'pes-12', level: 'B2', skill: 'vocabulary', prompt: '"Estar hasta las narices" means…', options: ['to be very curious', 'to be fed up', 'to have a cold', 'to be very close'], answer: 1 }),
  // C1
  mcq({ id: 'pes-13', level: 'C1', skill: 'grammar', prompt: 'No es que no ___, es que no puedo.', options: ['quiero', 'quiera', 'querré', 'quise'], answer: 1 }),
  mcq({ id: 'pes-14', level: 'C1', skill: 'vocabulary', prompt: 'Which verb best completes: "La empresa ___ un aumento de beneficios"?', options: ['registró', 'hizo', 'puso', 'dio'], answer: 0 }),
  mcq({ id: 'pes-15', level: 'C1', skill: 'grammar', prompt: '___ cansado que estuviera, terminaría el proyecto.', options: ['Aunque', 'Por muy', 'Si bien', 'Pese'], answer: 1 }),
];

const ENGLISH: PlacementQuestion[] = [
  // A1
  mcq({ id: 'pen-1', level: 'A1', skill: 'grammar', prompt: 'She ___ from Brazil.', options: ['are', 'is', 'am', 'be'], answer: 1 }),
  mcq({ id: 'pen-2', level: 'A1', skill: 'grammar', prompt: '___ you like coffee?', options: ['Does', 'Are', 'Do', 'Is'], answer: 2 }),
  mcq({ id: 'pen-3', level: 'A1', skill: 'vocabulary', prompt: 'The opposite of "cheap" is…', options: ['expensive', 'small', 'easy', 'new'], answer: 0 }),
  // A2
  mcq({ id: 'pen-4', level: 'A2', skill: 'grammar', prompt: 'I ___ to London last summer.', options: ['go', 'have gone', 'went', 'was go'], answer: 2 }),
  mcq({ id: 'pen-5', level: 'A2', skill: 'grammar', prompt: 'This film is ___ than the book.', options: ['more good', 'better', 'best', 'gooder'], answer: 1 }),
  mcq({ id: 'pen-6', level: 'A2', skill: 'grammar', prompt: 'We ___ dinner when you called.', options: ['had', 'were having', 'have', 'are having'], answer: 1 }),
  // B1
  mcq({ id: 'pen-7', level: 'B1', skill: 'grammar', prompt: 'I ___ here since 2019.', options: ['live', 'am living', 'have lived', 'lived'], answer: 2 }),
  mcq({ id: 'pen-8', level: 'B1', skill: 'grammar', prompt: 'If it rains tomorrow, we ___ at home.', options: ['stay', 'will stay', 'would stay', 'stayed'], answer: 1 }),
  mcq({ id: 'pen-9', level: 'B1', skill: 'grammar', prompt: 'The man ___ car was stolen called the police.', options: ['who', 'which', 'whose', 'that'], answer: 2 }),
  // B2
  mcq({ id: 'pen-10', level: 'B2', skill: 'grammar', prompt: 'If I ___ about the traffic, I would have left earlier.', options: ['knew', 'had known', 'would know', 'have known'], answer: 1 }),
  mcq({ id: 'pen-11', level: 'B2', skill: 'grammar', prompt: 'The report ___ by the time the meeting starts.', options: ['will finish', 'will have been finished', 'is finishing', 'has finished'], answer: 1 }),
  mcq({ id: 'pen-12', level: 'B2', skill: 'vocabulary', prompt: '"To put off" a meeting means to…', options: ['cancel it', 'postpone it', 'start it', 'organise it'], answer: 1 }),
  // C1
  mcq({ id: 'pen-13', level: 'C1', skill: 'grammar', prompt: 'Not only ___ late, but he also forgot the documents.', options: ['he was', 'was he', 'he is', 'did he be'], answer: 1 }),
  mcq({ id: 'pen-14', level: 'C1', skill: 'vocabulary', prompt: 'Her argument was ___ — nobody could find a flaw in it.', options: ['watertight', 'waterlogged', 'tight-fitting', 'well-worn'], answer: 0}),
  mcq({ id: 'pen-15', level: 'C1', skill: 'grammar', prompt: 'It\'s high time we ___ a decision.', options: ['make', 'made', 'will make', 'have made'], answer: 1 }),
];

const LEVEL_ORDER: TargetLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

function selfAssessment(): PlacementQuestion[] {
  // Two can-do statements per level (A1–C1) → 10 questions.
  return LEVEL_ORDER.flatMap((level) => [
    { kind: 'self' as const, id: `self-${level}-speaking`, level, prompt: CAN_DO[level].speaking },
    { kind: 'self' as const, id: `self-${level}-reading`, level, prompt: CAN_DO[level].reading },
  ]);
}

export function placementQuiz(language: LanguageCode): PlacementQuestion[] {
  if (language === 'es') return SPANISH;
  if (language === 'en') return ENGLISH;
  return selfAssessment();
}
