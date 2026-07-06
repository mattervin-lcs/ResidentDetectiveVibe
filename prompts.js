/* ═══════════════════════════════════════════════════════════════
   Resident Detective — shared option catalog + prompt template engine.
   Loaded by BOTH the main app (index.html) and Prompt Studio (admin.html).
   Prompt templates can be customized in Prompt Studio; overrides are
   stored in this browser's localStorage and used for every generation.
   ═══════════════════════════════════════════════════════════════ */

const RD_OPTIONS = {

  EVENT_TYPES: [
    { id: 'resident-session', icon: '🔍', label: 'Resident Mystery Session',
      guidance: 'A small-group activity-room session for residents. Keep the pacing relaxed, assume the group is seated around a table, and keep the facilitator central to moving things along.' },
    { id: 'dinner-party', icon: '🍽️', label: 'Dinner Party Mystery',
      guidance: 'A mystery staged across a shared meal. Structure the scenes as courses (arrival, appetizer, main course, dessert/coffee) with clue reveals between courses, and note in the facilitator guide when to pause for food service.' },
    { id: 'community-event', icon: '🎉', label: 'Themed Community Event',
      guidance: 'A larger festive community event. Make the setting feel like a party the characters are all attending, give characters mingling-friendly roles, and design scenes that work in a big open room rather than around one table.' },
    { id: 'family-visit', icon: '👨‍👩‍👧', label: 'Resident & Family Visit',
      guidance: 'An intergenerational session where residents play alongside visiting family members, possibly including children or teens. Write roles that pair naturally across generations and give younger visitors lively, age-appropriate characters.' },
    { id: 'team-building', icon: '🤝', label: 'Staff Team Building',
      guidance: 'A team-building session for community staff, not residents. Participants are working adults — you can raise the pace and complexity slightly, lean into workplace-friendly humor, and skip senior-specific adaptations unless the settings say otherwise.' },
    { id: 'holiday-party', icon: '🎄', label: 'Holiday / Seasonal Party',
      guidance: 'A holiday or seasonal celebration. Weave the selected seasonal occasion deeply into the plot, setting, and props — the mystery should feel like it could only happen at this time of year.' }
  ],

  THEMES: [
    { id: 'speakeasy', icon: '🍸', name: '1920s Speakeasy', flavor: 'A prohibition-era jazz club with hidden back rooms, illegal liquor, and a house band.' },
    { id: 'garden', icon: '🌸', name: 'Garden Party', flavor: 'A formal afternoon garden party at a grand estate, prize roses, and rival garden clubs.' },
    { id: 'cruise', icon: '🚢', name: 'Ocean Liner', flavor: 'A luxury transatlantic ocean liner crossing, a captain’s dinner, and a storm at sea.' },
    { id: 'manor', icon: '🏰', name: 'English Manor', flavor: 'A grand countryside manor, a will reading, loyal servants, and family rivalries.' },
    { id: 'space', icon: '🚀', name: 'Space Station', flavor: 'A near-future research space station crew dealing with malfunctioning systems and isolation.' },
    { id: 'western', icon: '🤠', name: 'Old West Saloon', flavor: 'A dusty frontier town saloon, cattle ranchers, a stagecoach, and a sheriff.' },
    { id: 'hollywood', icon: '🎬', name: 'Golden Age Hollywood', flavor: 'A 1940s movie studio backlot — starlets, directors, gossip columnists, and a missing reel.' },
    { id: 'county-fair', icon: '🎡', name: 'County Fair', flavor: 'A small-town county fair — blue-ribbon rivalries, a pie contest, and carnival games.' },
    { id: 'custom', icon: '✍️', name: 'Custom Theme', flavor: null }
  ],

  SEASONAL: [
    { id: 'none',        label: 'None',                 promptText: '' },
    { id: 'spring',      label: 'Spring',               promptText: 'Give the story a spring feeling — blossoms, fresh starts, garden imagery.' },
    { id: 'summer',      label: 'Summer',               promptText: 'Give the story a summer feeling — warm evenings, lemonade, long days.' },
    { id: 'autumn',      label: 'Autumn / Harvest',     promptText: 'Give the story an autumn feeling — harvest, falling leaves, cozy gatherings.' },
    { id: 'winter',      label: 'Winter',               promptText: 'Give the story a winter feeling — snow, firesides, gatherings indoors.' },
    { id: 'christmas',   label: 'Christmas / Holidays', promptText: 'Tie the story to the Christmas/holiday season — decorations, gifts, carols, a festive gathering.' },
    { id: 'halloween',   label: 'Halloween',            promptText: 'Tie the story to Halloween — costumes, pumpkins, playful spookiness. Keep it fun, never frightening.' },
    { id: 'valentines',  label: 'Valentine’s Day',      promptText: 'Tie the story to Valentine’s Day — old flames, love letters, a dance.' },
    { id: 'july4',       label: 'Independence Day',     promptText: 'Tie the story to the Fourth of July — fireworks, a town picnic, patriotic bunting.' },
    { id: 'newyear',     label: 'New Year’s Eve',       promptText: 'Tie the story to New Year’s Eve — a countdown, resolutions, champagne toasts.' },
    { id: 'birthday',    label: 'Birthday Celebration', promptText: 'Tie the story to a birthday celebration — a cake, presents, a guest of honor.' },
    { id: 'anniversary', label: 'Anniversary',          promptText: 'Tie the story to an anniversary celebration — old memories, a toast, a long-kept promise.' }
  ],

  TONES: [
    { id: 'cozy',     label: 'Cozy & Lighthearted',
      guidance: 'Keep the mood warm, gentle, and reassuring — a mystery that feels like a favorite paperback and leaves everyone smiling.' },
    { id: 'comedic',  label: 'Comedic',
      guidance: 'Lean into humor — eccentric characters, funny alibis, gentle running gags. The laughs matter as much as the solution.' },
    { id: 'classic',  label: 'Classic Whodunit',
      guidance: 'Play it straight in the Agatha Christie tradition — elegant plotting, fair-play clues, and a satisfying parlor-scene reveal.' },
    { id: 'dramatic', label: 'Dramatic & Suspenseful',
      guidance: 'Raise the stakes and tension — secrets weigh heavier, revelations land harder. Still warm-hearted and PG, never frightening.' }
  ],

  LENGTHS: [
    { minutes: 20,  scenes: 2, label: '20 min — Quick Case' },
    { minutes: 30,  scenes: 3, label: '30 min' },
    { minutes: 45,  scenes: 4, label: '45 min' },
    { minutes: 60,  scenes: 5, label: '60 min' },
    { minutes: 75,  scenes: 6, label: '75 min' },
    { minutes: 90,  scenes: 7, label: '90 min' },
    { minutes: 120, scenes: 9, label: '2 hours — Grand Mystery' }
  ],

  COGNITIVE: [
    { id: 'light', label: 'Light',
      guidance: 'Use short sentences and everyday vocabulary. Give each character exactly 1 clue. Add 3-4 discussion prompts per scene so the facilitator can guide the group generously. Keep the deduction path direct — no more than one logical connection needed to reach the solution.' },
    { id: 'standard', label: 'Standard',
      guidance: 'Use warm, natural prose. Give each character 1-2 clues. Include one layer of deduction connecting two characters’ information.' },
    { id: 'challenging', label: 'Challenging',
      guidance: 'Give each character 2-3 clues, including at least one red herring per character not directly tied to the crime. Require connecting evidence from at least three different characters to solve it.' }
  ],

  MOBILITY: [
    { id: 'full', label: 'Full Mobility',
      guidance: 'Feel free to suggest characters physically approach each other and trade clue cards during the session.' },
    { id: 'limited', label: 'Limited Mobility',
      guidance: 'Design the session to work fully seated with no physical movement — the facilitator should distribute all clue cards directly rather than having participants pass them to each other, and prompts should rely on verbal conversation only.' }
  ],

  ROLEPLAY: [
    { id: 'conversation', label: 'Conversation Only',
      guidance: 'Participants do not need to act, use voices, or perform. Write backstory and secrets as clear notes a participant can reference and talk about in their own words, not as a script to perform.' },
    { id: 'light', label: 'Light Roleplay',
      guidance: 'Include one or two optional in-character lines each participant could say if they feel comfortable, but make clear in the facilitator guide that simply describing what their character knows aloud is equally valid.' },
    { id: 'full', label: 'Full Character Play',
      guidance: 'Write vivid character voice and mannerisms, and suggest one line of dialogue to open with. Include a simple, optional costuming idea (e.g. a scarf, a hat) as a note, not a requirement.' }
  ],

  PARTICIPATION: [
    { id: 'full',     label: 'Full player',
      promptText: 'Full player — carries main clues and drives the mystery' },
    { id: 'light',    label: 'Light role',
      promptText: 'Light role — wants a smaller part; give them a shorter sheet, 1 easy clue, and extra-gentle prompts' },
    { id: 'observer', label: 'Observer',
      promptText: 'Observer — wants to watch more than play; write a brief, low-pressure spectator character with no required speaking and one small optional moment' }
  ]
};

/* ── Prompt template engine ── */

const RD_PROMPTS = (function () {
  'use strict';

  const STORAGE_KEY = 'rd_prompt_templates_v1';

  const PLACEHOLDERS = [
    { key: 'event_type',          desc: 'Selected event type label, e.g. “Dinner Party Mystery”' },
    { key: 'event_type_guidance', desc: 'Writing guidance for the selected event type' },
    { key: 'theme',               desc: 'Theme name and flavor text (or the custom theme as typed)' },
    { key: 'seasonal',            desc: 'Seasonal tie-in instruction, or “None”' },
    { key: 'tone',                desc: 'Selected tone label' },
    { key: 'tone_guidance',       desc: 'Writing guidance for the selected tone' },
    { key: 'participants',        desc: 'Numbered list of participants with character notes and participation level' },
    { key: 'participant_count',   desc: 'Number of named participants' },
    { key: 'length',              desc: 'Session length in minutes' },
    { key: 'scene_count',         desc: 'Target number of facilitator scenes for this length' },
    { key: 'cognitive',           desc: 'Cognitive level id (light / standard / challenging)' },
    { key: 'cognitive_guidance',  desc: 'Writing guidance for the cognitive level' },
    { key: 'mobility',            desc: 'Mobility id (full / limited)' },
    { key: 'mobility_guidance',   desc: 'Writing guidance for the mobility setting' },
    { key: 'roleplay',            desc: 'Roleplay intensity id (conversation / light / full)' },
    { key: 'roleplay_guidance',   desc: 'Writing guidance for the roleplay intensity' },
    { key: 'large_print',         desc: '“yes …” or “no” — whether large print formatting was requested' },
    { key: 'special_requests',    desc: 'Free-text staff requests, or “None”' }
  ];

  const DEFAULT_SYSTEM = `You are a professional mystery writer creating an original, printable "whodunit" roleplay activity for Resident Detective, a program used in senior living communities. Participants each receive a printed character sheet and solve an original mystery together through conversation and printed clue cards — no screens are involved at any point.

Event type — {{event_type}}: {{event_type_guidance}}

Rules:
- Invent a wholly original title, plot, victim, and cast for this exact request. Never reuse a previous case.
- Create exactly one character per participant listed, in the same order given, and set resident_name to each participant's name exactly as given.
- If a participant has character notes, weave those details into their character's profession, backstory, or personality so the role feels written just for them. Never contradict a participant's notes.
- Honor participation levels: "Full player" characters carry the main clues; "Light role" characters get shorter sheets with 1 easy clue and extra-gentle prompts; "Observer" characters get a brief spectator role with no required speaking and one small optional moment.
- Exactly one cast member must be the culprit (is_culprit: true) — always a Full player, never a Light role or Observer. Every other character is innocent but should have their own small unrelated secret to create believable red herrings.
- Write every character's backstory, public_knowledge, and secret directly to the participant in second person ("You are…", "You know…", "You are hiding…"), in clear language that can be read or read aloud easily.
- clues_held must be concrete, specific details (an object, a sighting, an overheard remark) distributed across characters so no single character sheet solves the mystery alone.
- Tone — {{tone}}: {{tone_guidance}}
- Keep all content PG. The death or crime is implied and referenced matter-of-factly, never graphic, gory, or frightening.
- The facilitator_guide is for staff only — it includes the full solution and is written as a script staff can read aloud without rehearsal.
- Aim for about {{scene_count}} facilitator scenes appropriate to a {{length}}-minute session.

Session adaptation settings:
- Cognitive level ({{cognitive}}): {{cognitive_guidance}}
- Mobility ({{mobility}}): {{mobility_guidance}}
- Roleplay intensity ({{roleplay}}): {{roleplay_guidance}}

Call the submit_mystery tool with your complete response. Do not write any text outside the tool call.`;

  const DEFAULT_USER = `Theme: {{theme}}
Seasonal tie-in: {{seasonal}}
Participants ({{participant_count}} total — create exactly one character per person, in this order):
{{participants}}

Session length: {{length}} minutes
Large print needed: {{large_print}}
Special requests from staff: {{special_requests}}

Write the complete original mystery now.`;

  function defaults() {
    return { system: DEFAULT_SYSTEM, user: DEFAULT_USER };
  }

  function load() {
    const d = defaults();
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored && typeof stored === 'object') {
        if (typeof stored.system === 'string' && stored.system.trim()) d.system = stored.system;
        if (typeof stored.user === 'string' && stored.user.trim()) d.user = stored.user;
      }
    } catch (e) { /* corrupted storage — fall back to defaults */ }
    return d;
  }

  function save(templates) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      system: templates.system,
      user: templates.user,
      savedAt: new Date().toISOString()
    }));
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function isCustomized() {
    return !!localStorage.getItem(STORAGE_KEY);
  }

  function render(template, vars) {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
      (key in vars) ? String(vars[key]) : match
    );
  }

  return { PLACEHOLDERS, defaults, load, save, reset, isCustomized, render };
})();
