import type { ContentPack } from '../types';

/**
 * Spanish content pack, A1 → C1.
 *
 * Spanish-specific templates are rotated together with the generic ones, so
 * learners get concrete Spanish practice plus variety.
 */
export const spanishPack: ContentPack = {
  language: 'es',
  levels: {
    A1: {
      topics: ['Saludos y presentaciones', 'La familia', 'Números, fechas y la hora', 'Comida y bebida', 'La rutina diaria', 'Mi casa y mi ciudad', 'De compras', 'El tiempo y las estaciones'],
      grammar: [
        'ser vs estar (basics)',
        'present tense of -ar/-er/-ir verbs',
        'gender & number agreement (el/la, -o/-a)',
        'question words (qué, dónde, cuándo, cómo, cuánto)',
        'hay vs está(n)',
        'gustar with me/te/le',
        'irregular present: tener, ir, hacer',
        'possessive adjectives (mi, tu, su)',
      ],
      templates: {
        listening: [
          {
            title: 'Coffee Break–style lesson: {topic}',
            instructions:
              'Listen to a beginner Spanish podcast episode about {topic}. Repeat every phrase the host asks you to, then write down 3 phrases you could use today.',
            resourceType: 'podcast',
          },
        ],
        reading: [
          {
            title: 'Read a Spanish menu',
            instructions:
              'Open the online menu of a restaurant in Spain or Mexico. Find: a starter (entrante), a main dish (plato principal), a drink and the price of the menú del día.',
            resourceType: 'article',
          },
        ],
        speaking: [
          {
            title: 'Shadowing: "Me llamo…"',
            instructions:
              'Shadow a short introduction dialogue. Then introduce yourself out loud: "Hola, me llamo… Soy de… Vivo en… Me gusta…". Repeat 3 times, faster each time.',
            resourceType: 'shadowing',
          },
          {
            title: 'Order at a café (role-play)',
            instructions:
              'Practise out loud: "Hola, buenos días. ¿Me pone un café con leche, por favor?" / "¿Cuánto es?" / "Gracias, adiós." Swap in 5 other drinks and snacks.',
            resourceType: 'self-talk',
          },
        ],
        writing: [
          {
            title: 'Describe tu familia',
            instructions:
              'Write 5–6 sentences: "Mi madre se llama… Tiene … años. Es alta y simpática." Use ser for description and tener for age.',
            resourceType: 'writing-prompt',
          },
        ],
        vocabulary: [
          {
            title: 'Flashcards: 10 essential verbs',
            instructions:
              'Add ser, estar, tener, ir, hacer, querer, poder, comer, vivir, hablar with one example sentence each. Review all due cards.',
            resourceType: 'flashcards',
          },
        ],
        grammar: [
          {
            title: 'Conjugation drill: {grammar}',
            instructions:
              'Conjugate hablar, comer and vivir in the present for all persons (yo, tú, él/ella/usted, nosotros, vosotros, ellos/ustedes). Then write one sentence per person.',
            resourceType: 'grammar-drill',
          },
        ],
      },
    },
    A2: {
      topics: ['Viajes y transporte', 'El fin de semana pasado', 'La salud', 'El trabajo y los estudios', 'Tiempo libre', 'En el restaurante', 'Direcciones en la ciudad', 'Ropa y compras'],
      grammar: [
        'pretérito indefinido (regular verbs)',
        'pretérito indefinido (irregulars: ser/ir, tener, hacer, estar)',
        'ir a + infinitive',
        'pretérito imperfecto (descriptions & habits)',
        'direct & indirect object pronouns (lo, la, le)',
        'reflexive verbs (levantarse, ducharse)',
        'comparatives (más/menos… que, tan… como)',
        'affirmative imperative (tú/usted)',
      ],
      templates: {
        listening: [
          {
            title: 'Listen: ¿Qué hiciste el fin de semana?',
            instructions:
              'Listen to a podcast or video where people talk about their weekend. Write down every past-tense verb you hear (fui, comí, vi…).',
            resourceType: 'podcast',
          },
        ],
        reading: [
          {
            title: 'Travel blog in Spanish',
            instructions:
              'Read a simple travel blog post in Spanish (e.g. a trip to Sevilla or Oaxaca). List the places visited and what the author did there.',
            resourceType: 'article',
          },
        ],
        speaking: [
          {
            title: 'Tell your weekend story',
            instructions:
              'Record yourself for 1 minute: "El sábado fui a… Comí… Por la noche vi…". Use at least 6 different verbs in the pretérito indefinido.',
            resourceType: 'self-talk',
          },
          {
            title: 'Ask for directions (role-play)',
            instructions:
              'Practise: "Perdone, ¿dónde está la estación?" / "Siga todo recto y gire a la derecha." Describe the route from your home to a nearby shop out loud.',
            resourceType: 'self-talk',
          },
        ],
        writing: [
          {
            title: 'Postcard from a trip',
            instructions:
              'Write a 70-word postcard: where you are, what you did yesterday (indefinido), what the place is like (es/está/hay) and what you are going to do tomorrow (voy a…).',
            resourceType: 'writing-prompt',
          },
        ],
        vocabulary: [
          {
            title: 'Flashcards: time expressions',
            instructions:
              'Add ayer, anoche, la semana pasada, el año pasado, hace dos días, mañana, la próxima semana, siempre, a menudo, nunca. Review due cards.',
            resourceType: 'flashcards',
          },
        ],
        grammar: [
          {
            title: 'Indefinido vs imperfecto starter',
            instructions:
              'Read a short story and colour indefinido verbs (actions) and imperfecto verbs (background/descriptions) differently. Explain 3 choices in your own words.',
            resourceType: 'grammar-drill',
          },
        ],
      },
    },
    B1: {
      topics: ['Experiencias y anécdotas', 'Planes y sueños', 'Cine y series', 'Medio ambiente', 'Fiestas y tradiciones', 'Tecnología', 'Relaciones personales', 'Entrevistas de trabajo'],
      grammar: [
        'pretérito perfecto vs indefinido',
        'indefinido vs imperfecto in narration',
        'presente de subjuntivo (wishes: quiero que, espero que)',
        'futuro simple & condicional',
        'relative pronouns (que, quien, donde, lo que)',
        'subjuntivo with opinions (no creo que…)',
        'por vs para',
        'estilo indirecto (dice que…)',
      ],
      templates: {
        listening: [
          {
            title: 'Series episode in Spanish',
            instructions:
              'Watch 20 minutes of a Spanish-language series (with Spanish subtitles). Pause after each scene and summarise what happened out loud.',
            resourceType: 'video',
          },
        ],
        reading: [
          {
            title: 'Easy news in Spanish',
            instructions:
              'Read 2 articles from an easy-Spanish news site. For each, write the headline in your own words and one question you\'d ask the author.',
            resourceType: 'article',
          },
        ],
        speaking: [
          {
            title: 'Anécdota en 2 minutos',
            instructions:
              'Tell a funny or surprising story from your life. Set the scene with the imperfecto ("Era un día…, hacía calor…") and move the action with the indefinido.',
            resourceType: 'self-talk',
          },
          {
            title: 'Intercambio: {topic}',
            instructions:
              'Have a 20-minute language exchange or tutor session about {topic}. Prepare 3 opinions using "Creo que…", "No creo que + subjuntivo", "Me parece que…".',
            resourceType: 'conversation',
          },
        ],
        writing: [
          {
            title: 'Email: hacer planes',
            instructions:
              'Write a 120-word email to a Spanish friend proposing a weekend plan. Include ojalá / espero que + subjuntivo and one por vs para contrast.',
            resourceType: 'writing-prompt',
          },
        ],
        vocabulary: [
          {
            title: 'Muletillas & connectors',
            instructions:
              'Learn 8 discourse fillers and connectors: pues, o sea, es decir, sin embargo, además, por eso, en cambio, a pesar de. Add example sentences to your deck.',
            resourceType: 'flashcards',
          },
        ],
        grammar: [
          {
            title: 'Subjuntivo trigger list',
            instructions:
              'Make a list of 10 subjunctive triggers (querer que, esperar que, es importante que, cuando + future…). Write one sentence for each about {topic}.',
            resourceType: 'grammar-drill',
          },
        ],
      },
    },
    B2: {
      topics: ['Actualidad y sociedad', 'Ciencia e innovación', 'Educación', 'Trabajo y conciliación', 'Arte y literatura', 'Globalización', 'Salud y estilo de vida', 'Economía y empresa'],
      grammar: [
        'imperfecto de subjuntivo',
        'oraciones condicionales (si tuviera…, habría…)',
        'subjuntivo vs indicativo after conjunctions (aunque, cuando, para que)',
        'voz pasiva & se impersonal',
        'pluscuamperfecto (indicativo & subjuntivo)',
        'estilo indirecto with tense shifts',
        'perífrasis verbales (llevar + gerundio, acabar de, volver a)',
        'ser/estar with changing meaning (ser listo / estar listo)',
      ],
      templates: {
        listening: [
          {
            title: 'Spanish radio / podcast debate',
            instructions:
              'Listen to 20 minutes of a Spanish radio debate or news podcast on {topic}. Note each speaker\'s main argument and one expression they used to disagree.',
            resourceType: 'podcast',
          },
        ],
        reading: [
          {
            title: 'Columna de opinión',
            instructions:
              'Read an opinion column from a major Spanish or Latin American newspaper. Identify the thesis and list the connectors used to structure the argument.',
            resourceType: 'article',
          },
        ],
        speaking: [
          {
            title: 'Hypotheticals: ¿Qué harías si…?',
            instructions:
              'Answer out loud for 3 minutes: "¿Qué harías si fueras presidente/a?", "¿Qué habrías hecho diferente…?". Use si + imperfecto de subjuntivo + condicional.',
            resourceType: 'self-talk',
          },
        ],
        writing: [
          {
            title: 'Ensayo de opinión (DELE B2 style)',
            instructions:
              'Write a 180–220 word argumentative text on {topic}: introduction, two arguments, a concession (aunque, si bien…) and conclusion.',
            resourceType: 'writing-prompt',
          },
        ],
        vocabulary: [
          {
            title: 'Expresiones idiomáticas',
            instructions:
              'Learn: tomar el pelo, estar en las nubes, meter la pata, no tener pelos en la lengua, costar un ojo de la cara, ponerse las pilas. Write a mini-dialogue using 3.',
            resourceType: 'flashcards',
          },
        ],
        grammar: [
          {
            title: 'Conditional sentence workshop',
            instructions:
              'Write 3 sentences of each type: real (si tengo… iré), hypothetical (si tuviera… iría), past unreal (si hubiera tenido… habría ido). Topic: {topic}.',
            resourceType: 'grammar-drill',
          },
        ],
      },
    },
    C1: {
      topics: ['Política e instituciones', 'Ética y filosofía', 'Comunicación profesional', 'Lengua e identidad', 'Economía y finanzas', 'Urbanismo y sostenibilidad', 'Psicología', 'Historia y memoria'],
      grammar: [
        'subjuntivo in relative clauses (busco a alguien que sepa…)',
        'concessive structures (por mucho que, aun cuando, por más que)',
        'nominalización & formal register',
        'futuro & condicional de probabilidad (serán las tres, habría llegado)',
        'marcadores discursivos (no obstante, en definitiva, cabe destacar)',
        'pasiva refleja vs pasiva perifrástica',
        'leísmo, laísmo & regional variation',
        'subjuntivo in reduplicative structures (digan lo que digan)',
      ],
      templates: {
        listening: [
          {
            title: 'Conferencia o entrevista larga',
            instructions:
              'Watch a 30-minute interview or lecture in Spanish on {topic} (no subtitles). Take notes in Spanish and write a 5-point summary.',
            resourceType: 'video',
          },
        ],
        reading: [
          {
            title: 'Literatura hispana',
            instructions:
              'Read a short story by a Hispanic author (e.g. Borges, Cortázar, Monterroso, Rosa Montero). Note the narrative tenses and three stylistic choices.',
            resourceType: 'graded-reader',
          },
        ],
        speaking: [
          {
            title: 'Presentación profesional',
            instructions:
              'Give a 5-minute recorded presentation on {topic} as if at work. Use formal markers (en primer lugar, cabe señalar, en definitiva) and handle one imagined objection.',
            resourceType: 'self-talk',
          },
        ],
        writing: [
          {
            title: 'Informe o carta formal',
            instructions:
              'Write a 250-word formal report or letter on {topic}. Use nominalisations and the se impersonal; avoid repeating verbs.',
            resourceType: 'writing-prompt',
          },
        ],
        vocabulary: [
          {
            title: 'Registro culto vs coloquial',
            instructions:
              'For 8 everyday verbs (decir, hacer, poner, tener, ver…) find a more precise or formal alternative (afirmar, realizar, colocar, poseer, observar…). Add them to your deck.',
            resourceType: 'flashcards',
          },
        ],
        grammar: [
          {
            title: 'Precisión: {grammar}',
            instructions:
              'Find 5 authentic examples of {grammar} in press or literature. Imitate each structure in a sentence about {topic}.',
            resourceType: 'grammar-drill',
          },
        ],
      },
    },
  },
  milestoneQuestions: {
    A1: [
      { id: 'es-a1-1', level: 'A1', skill: 'grammar', prompt: 'Yo ___ de Canadá.', options: ['soy', 'estoy', 'es', 'tengo'], answer: 0 },
      { id: 'es-a1-2', level: 'A1', skill: 'grammar', prompt: 'Nosotros ___ en Madrid.', options: ['vive', 'vivimos', 'viven', 'vivo'], answer: 1 },
      { id: 'es-a1-3', level: 'A1', skill: 'vocabulary', prompt: '"Breakfast" in Spanish is…', options: ['la cena', 'el almuerzo', 'el desayuno', 'la merienda'], answer: 2 },
      { id: 'es-a1-4', level: 'A1', skill: 'vocabulary', prompt: 'Choose the odd one out:', options: ['madre', 'hermano', 'abuela', 'mesa'], answer: 3 },
      { id: 'es-a1-5', level: 'A1', skill: 'reading', prompt: '"La tienda abre a las nueve y cierra a las ocho." When does the shop close?', options: ['9:00', '8:00', '19:00', '12:00'], answer: 1 },
      { id: 'es-a1-6', level: 'A1', skill: 'grammar', prompt: 'A mí me ___ los gatos.', options: ['gusta', 'gustan', 'gusto', 'gustas'], answer: 1 },
    ],
    A2: [
      { id: 'es-a2-1', level: 'A2', skill: 'grammar', prompt: 'Ayer ___ al cine con mis amigos.', options: ['voy', 'iba', 'fui', 'iré'], answer: 2 },
      { id: 'es-a2-2', level: 'A2', skill: 'grammar', prompt: 'Cuando era niño, ___ en el campo.', options: ['viví', 'vivía', 'vivo', 'viviré'], answer: 1 },
      { id: 'es-a2-3', level: 'A2', skill: 'grammar', prompt: '¿El libro? Ya ___ he leído.', options: ['le', 'lo', 'la', 'se'], answer: 1 },
      { id: 'es-a2-4', level: 'A2', skill: 'vocabulary', prompt: '"Me duele la cabeza" means…', options: ['I have a headache', 'I am hungry', 'I am tired', 'I hurt my hand'], answer: 0 },
      { id: 'es-a2-5', level: 'A2', skill: 'reading', prompt: '"El tren a Toledo sale del andén 4 con diez minutos de retraso." What is true?', options: ['The train is cancelled', 'The train is 10 minutes late', 'The train leaves at 4', 'The train goes to platform 10'], answer: 1 },
      { id: 'es-a2-6', level: 'A2', skill: 'grammar', prompt: 'Mi hermana es ___ alta ___ yo.', options: ['tan / que', 'más / que', 'más / como', 'muy / que'], answer: 1 },
    ],
    B1: [
      { id: 'es-b1-1', level: 'B1', skill: 'grammar', prompt: 'Espero que ___ buen tiempo mañana.', options: ['hace', 'hará', 'haga', 'hizo'], answer: 2 },
      { id: 'es-b1-2', level: 'B1', skill: 'grammar', prompt: 'Este regalo es ___ ti.', options: ['por', 'para', 'a', 'de'], answer: 1 },
      { id: 'es-b1-3', level: 'B1', skill: 'grammar', prompt: 'Esta mañana ___ un café con Ana. (Spain usage)', options: ['tomé', 'he tomado', 'tomaba', 'tomaré'], answer: 1 },
      { id: 'es-b1-4', level: 'B1', skill: 'vocabulary', prompt: '"Sin embargo" is closest to…', options: ['therefore', 'however', 'moreover', 'because'], answer: 1 },
      { id: 'es-b1-5', level: 'B1', skill: 'reading', prompt: '"Aunque llovía, decidimos salir a caminar." What happened?', options: ['They stayed home because of the rain', 'They went for a walk despite the rain', 'It stopped raining, so they went out', 'They walked until it rained'], answer: 1 },
      { id: 'es-b1-6', level: 'B1', skill: 'grammar', prompt: 'No creo que Juan ___ razón.', options: ['tiene', 'tenga', 'tendrá', 'tuvo'], answer: 1 },
    ],
    B2: [
      { id: 'es-b2-1', level: 'B2', skill: 'grammar', prompt: 'Si ___ más tiempo, viajaría por Sudamérica.', options: ['tengo', 'tendría', 'tuviera', 'tenga'], answer: 2 },
      { id: 'es-b2-2', level: 'B2', skill: 'grammar', prompt: 'Me pidió que le ___ con la mudanza.', options: ['ayudo', 'ayude', 'ayudara', 'ayudaré'], answer: 2 },
      { id: 'es-b2-3', level: 'B2', skill: 'grammar', prompt: 'Aunque ___ mañana, iremos a la playa. (it may rain – we don\'t know)', options: ['llueve', 'llueva', 'lloverá', 'llovió'], answer: 1 },
      { id: 'es-b2-4', level: 'B2', skill: 'vocabulary', prompt: '"Meter la pata" means…', options: ['to kick something', 'to make a blunder', 'to walk fast', 'to cheat'], answer: 1 },
      { id: 'es-b2-5', level: 'B2', skill: 'reading', prompt: '"La medida, lejos de reducir el desempleo, lo ha agravado." The measure…', options: ['reduced unemployment slightly', 'had no effect', 'made unemployment worse', 'was never applied'], answer: 2 },
      { id: 'es-b2-6', level: 'B2', skill: 'grammar', prompt: 'Llevo tres años ___ español.', options: ['estudiar', 'estudiado', 'estudiando', 'estudio'], answer: 2 },
    ],
    C1: [
      { id: 'es-c1-1', level: 'C1', skill: 'grammar', prompt: 'Por mucho que ___, no lo convencerás.', options: ['insistes', 'insistas', 'insistirás', 'insististe'], answer: 1 },
      { id: 'es-c1-2', level: 'C1', skill: 'grammar', prompt: 'Busco un piso que ___ terraza.', options: ['tiene', 'tenga', 'tendrá', 'tuvo'], answer: 1 },
      { id: 'es-c1-3', level: 'C1', skill: 'grammar', prompt: 'No ha llegado todavía; ___ mucho tráfico. (probability, past)', options: ['habrá habido', 'hay', 'hubo', 'haya'], answer: 0 },
      { id: 'es-c1-4', level: 'C1', skill: 'vocabulary', prompt: 'The most formal equivalent of "hacer un estudio" is…', options: ['realizar un estudio', 'montar un estudio', 'echar un estudio', 'dar un estudio'], answer: 0 },
      { id: 'es-c1-5', level: 'C1', skill: 'reading', prompt: '"Cabe matizar que los datos, si bien alentadores, no son concluyentes." The author thinks the data…', options: ['are conclusive and positive', 'are encouraging but not conclusive', 'are discouraging', 'are irrelevant'], answer: 1 },
      { id: 'es-c1-6', level: 'C1', skill: 'grammar', prompt: '___ lo que ___, no cambiaré de opinión.', options: ['Digan / digan', 'Dicen / dicen', 'Dirán / digan', 'Digan / dicen'], answer: 0 },
    ],
  },
};
