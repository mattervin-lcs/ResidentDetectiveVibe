(function () {
  'use strict';

  /* ══════════════════════ CONSTANTS ══════════════════════ */

  const STORAGE_KEY_API = 'rd_api_key';
  const STORAGE_KEY_MODEL = 'rd_model';
  const DEFAULT_MODEL = 'claude-sonnet-5';
  const MAX_PARTICIPANTS = 16;

  const LOADING_FLAVORS = [
    'Casting your suspects…',
    'Hiding the murder weapon…',
    'Writing alibis…',
    'Planting clues around the room…',
    'Drafting the facilitator’s script…',
    'Double-checking everyone’s secrets…',
    'Seating the dinner guests…',
    'Untangling the red herrings…',
    'Polishing the plot twist…',
    'Sealing the evidence envelopes…'
  ];

  const MYSTERY_TOOL = {
    name: 'submit_mystery',
    description: 'Submit the complete original mystery session.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Original mystery title, era-appropriate and evocative.' },
        case_number: { type: 'string', description: "A stylized case number, e.g. 'Case No. 0417'." },
        era: { type: 'string', description: "Year or time period, e.g. '1925' or '2157'." },
        setting: { type: 'string', description: 'One to two sentences describing the location and atmosphere.' },
        hook: { type: 'string', description: 'A punchy two-to-three sentence teaser the facilitator reads aloud to open the session.' },
        victim: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            cause_of_death: { type: 'string' }
          },
          required: ['name', 'description', 'cause_of_death']
        },
        solution: {
          type: 'object',
          properties: {
            culprit_character_name: { type: 'string', description: 'Must exactly match one cast member’s character_name.' },
            motive: { type: 'string' },
            method: { type: 'string' },
            key_evidence: { type: 'string', description: 'The combination of clues that proves it.' }
          },
          required: ['culprit_character_name', 'motive', 'method', 'key_evidence']
        },
        cast: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              resident_name: { type: 'string', description: 'The real participant’s first name this character is written for, exactly as given.' },
              character_name: { type: 'string' },
              role_title: { type: 'string', description: "e.g. 'The Torch Singer'." },
              is_culprit: { type: 'boolean' },
              backstory: { type: 'string', description: "2-4 sentences, written in second person ('You are…')." },
              public_knowledge: { type: 'string', description: 'What this character will openly share if asked.' },
              secret: { type: 'string', description: 'What this character is hiding, and why.' },
              clues_held: { type: 'array', items: { type: 'string' }, description: '1-3 concrete pieces of evidence only this character starts with.' },
              conversation_starters: { type: 'array', items: { type: 'string' }, description: '2-3 lines or questions to help a participant who isn’t sure what to say.' }
            },
            required: ['resident_name', 'character_name', 'role_title', 'is_culprit', 'backstory', 'public_knowledge', 'secret', 'clues_held', 'conversation_starters']
          }
        },
        facilitator_guide: {
          type: 'object',
          properties: {
            opening_briefing: { type: 'string', description: 'What the facilitator reads aloud to open the session.' },
            scenes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  scene_title: { type: 'string' },
                  facilitator_script: { type: 'string' },
                  clue_to_reveal: { type: 'string', description: 'Empty string if no clue is introduced in this scene.' },
                  discussion_prompts: { type: 'array', items: { type: 'string' } }
                },
                required: ['scene_title', 'facilitator_script', 'clue_to_reveal', 'discussion_prompts']
              }
            },
            closing_reveal: { type: 'string', description: 'How the facilitator reveals the solution, written to be read aloud.' }
          },
          required: ['opening_briefing', 'scenes', 'closing_reveal']
        },
        clue_cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              card_title: { type: 'string' },
              card_type: { type: 'string', description: "e.g. 'Telegram', 'Photograph', 'Handwritten Note'." },
              card_text: { type: 'string' }
            },
            required: ['card_title', 'card_type', 'card_text']
          }
        }
      },
      required: ['title', 'case_number', 'era', 'setting', 'hook', 'victim', 'solution', 'cast', 'facilitator_guide', 'clue_cards']
    }
  };

  /* ══════════════════════ STATE ══════════════════════ */

  function blankParticipant() {
    return { name: '', details: '', participation: 'full' };
  }

  const state = {
    view: 'setup',
    apiKey: localStorage.getItem(STORAGE_KEY_API) || '',
    model: localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL,
    config: {
      eventType: 'resident-session',
      themeId: 'speakeasy',
      customTheme: '',
      seasonal: 'none',
      tone: 'cozy',
      participants: [blankParticipant(), blankParticipant(), blankParticipant()],
      length: 60,
      cognitive: 'standard',
      mobility: 'full',
      roleplay: 'conversation',
      largePrint: false,
      specialRequests: ''
    },
    mystery: null,
    activeTab: 'overview',
    pendingError: null
  };

  let loadingInterval = null;
  let elapsedInterval = null;

  /* ══════════════════════ HELPERS ══════════════════════ */

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function $(id) { return document.getElementById(id); }

  function findOpt(list, id) { return list.find(o => o.id === id) || list[0]; }

  function namedParticipants() {
    return state.config.participants.filter(p => p.name.trim());
  }

  function activePlayers() {
    return namedParticipants().filter(p => p.participation !== 'observer');
  }

  /* ══════════════════════ PROMPT BUILDING ══════════════════════ */

  function participantsBlock(list) {
    return list.map((p, i) => {
      const part = findOpt(RD_OPTIONS.PARTICIPATION, p.participation);
      let line = `${i + 1}. ${p.name.trim()} — ${part.promptText}`;
      if (p.details.trim()) line += `. Character notes: ${p.details.trim()}`;
      return line;
    }).join('\n');
  }

  function buildPromptVars(cfg) {
    const evt = findOpt(RD_OPTIONS.EVENT_TYPES, cfg.eventType);
    const theme = findOpt(RD_OPTIONS.THEMES, cfg.themeId);
    const themeText = cfg.themeId === 'custom'
      ? cfg.customTheme.trim()
      : theme.name + (theme.flavor ? ' — ' + theme.flavor : '');
    const seasonal = findOpt(RD_OPTIONS.SEASONAL, cfg.seasonal);
    const tone = findOpt(RD_OPTIONS.TONES, cfg.tone);
    const lengthOpt = RD_OPTIONS.LENGTHS.find(l => l.minutes === cfg.length) || RD_OPTIONS.LENGTHS[3];
    const named = namedParticipants();

    return {
      event_type: evt.label,
      event_type_guidance: evt.guidance,
      theme: themeText,
      seasonal: seasonal.promptText || 'None',
      tone: tone.label,
      tone_guidance: tone.guidance,
      participants: participantsBlock(named),
      participant_count: named.length,
      length: cfg.length,
      scene_count: lengthOpt.scenes,
      cognitive: cfg.cognitive,
      cognitive_guidance: findOpt(RD_OPTIONS.COGNITIVE, cfg.cognitive).guidance,
      mobility: cfg.mobility,
      mobility_guidance: findOpt(RD_OPTIONS.MOBILITY, cfg.mobility).guidance,
      roleplay: cfg.roleplay,
      roleplay_guidance: findOpt(RD_OPTIONS.ROLEPLAY, cfg.roleplay).guidance,
      large_print: cfg.largePrint ? 'yes — keep sentences a bit shorter so they read well at a larger font size' : 'no',
      special_requests: cfg.specialRequests.trim() || 'None'
    };
  }

  async function callClaude(system, user, castCount) {
    const maxTokens = Math.min(8192, 2200 + castCount * 500);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: state.model,
        max_tokens: maxTokens,
        system: system,
        messages: [{ role: 'user', content: user }],
        tools: [MYSTERY_TOOL],
        tool_choice: { type: 'tool', name: 'submit_mystery' }
      })
    });

    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try {
        const errBody = await res.json();
        if (errBody && errBody.error && errBody.error.message) msg = errBody.error.message;
      } catch (e) { /* ignore */ }
      if (res.status === 401) msg = 'That API key was rejected. Check it in Settings and try again.';
      throw new Error(msg);
    }

    const data = await res.json();
    const toolUse = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'submit_mystery');
    if (!toolUse) throw new Error('The model did not return structured mystery data. Please try again.');
    return toolUse.input;
  }

  function normalizeMystery(m) {
    if (m.solution && Array.isArray(m.cast)) {
      const hasFlagged = m.cast.some(c => c.is_culprit);
      if (!hasFlagged) {
        m.cast.forEach(c => {
          if (c.character_name === m.solution.culprit_character_name) c.is_culprit = true;
        });
      }
    }
    return m;
  }

  /* ══════════════════════ RENDER: ROOT ══════════════════════ */

  function render() {
    const root = $('view-root');
    if (state.view === 'setup') {
      root.innerHTML = setupTemplate();
      wireSetupEvents();
    } else if (state.view === 'loading') {
      root.innerHTML = loadingTemplate();
    } else if (state.view === 'result') {
      root.innerHTML = resultTemplate();
      wireResultEvents();
    }
    updateModelBadge();
  }

  function updateModelBadge() {
    const badge = $('model-badge');
    if (!badge) return;
    badge.textContent = state.apiKey ? state.model : 'No API key set';
    badge.style.color = state.apiKey ? '' : '#ff8a7a';
  }

  /* ══════════════════════ RENDER: SETUP ══════════════════════ */

  function selectOptions(list, selectedId, valueKey, labelFn) {
    return list.map(o => {
      const val = o[valueKey];
      return `<option value="${esc(val)}"${String(val) === String(selectedId) ? ' selected' : ''}>${esc(labelFn(o))}</option>`;
    }).join('');
  }

  function setupTemplate() {
    const cfg = state.config;

    const eventOptions = selectOptions(RD_OPTIONS.EVENT_TYPES, cfg.eventType, 'id', o => `${o.icon}  ${o.label}`);
    const lengthOptions = selectOptions(RD_OPTIONS.LENGTHS, cfg.length, 'minutes', o => o.label);
    const seasonalOptions = selectOptions(RD_OPTIONS.SEASONAL, cfg.seasonal, 'id', o => o.label);
    const toneOptions = selectOptions(RD_OPTIONS.TONES, cfg.tone, 'id', o => o.label);

    const evt = findOpt(RD_OPTIONS.EVENT_TYPES, cfg.eventType);

    const themeGrid = RD_OPTIONS.THEMES.map(t => `
      <div class="theme-option${cfg.themeId === t.id ? ' selected' : ''}" data-theme="${t.id}" role="button" tabindex="0">
        <span class="theme-option-icon">${t.icon}</span>
        <span class="theme-option-name">${esc(t.name)}</span>
      </div>`).join('');

    const cogPills = RD_OPTIONS.COGNITIVE.map(o => `
      <button type="button" class="pill-option${cfg.cognitive === o.id ? ' selected' : ''}" data-group="cognitive" data-value="${o.id}">${o.label}</button>`).join('');

    const mobPills = RD_OPTIONS.MOBILITY.map(o => `
      <button type="button" class="pill-option${cfg.mobility === o.id ? ' selected' : ''}" data-group="mobility" data-value="${o.id}">${o.label}</button>`).join('');

    const rpPills = RD_OPTIONS.ROLEPLAY.map(o => `
      <button type="button" class="pill-option${cfg.roleplay === o.id ? ' selected' : ''}" data-group="roleplay" data-value="${o.id}">${o.label}</button>`).join('');

    const statusHtml = state.pendingError
      ? `<div class="status-msg error" id="setup-status">${esc(state.pendingError)}</div>`
      : `<div class="status-msg info" id="setup-status" style="display:none;"></div>`;

    return `
      <div class="setup-intro anim-fade-up">
        <div class="eyebrow">New Session</div>
        <h1 class="headline">Cast your <em>mystery.</em></h1>
        <p class="body-text" style="margin-bottom:28px;">Choose the occasion, set the scene, add your cast — and Resident Detective writes a complete original whodunit, ready to print.</p>
      </div>

      <div class="setup-card anim-fade-up" style="animation-delay:0.08s;">

        <div class="two-col">
          <div class="field-block anim-stagger">
            <label class="field-label" for="event-type-select">Event Type</label>
            <select id="event-type-select" class="field-select">${eventOptions}</select>
            <p class="field-hint" id="event-type-hint">${esc(evt.guidance)}</p>
          </div>
          <div class="field-block anim-stagger">
            <label class="field-label" for="length-select">Session Length</label>
            <select id="length-select" class="field-select">${lengthOptions}</select>
            <p class="field-hint">Longer sessions get more scenes and a bigger mystery.</p>
          </div>
        </div>

        <div class="field-block anim-stagger">
          <label class="field-label">Theme</label>
          <div class="theme-grid" id="theme-grid">${themeGrid}</div>
          <div id="custom-theme-field" class="${cfg.themeId === 'custom' ? '' : 'hidden'}" style="margin-top:10px;">
            <input type="text" id="custom-theme-input" class="field-input" placeholder="Describe your own setting, e.g. 'A haunted lighthouse on the coast of Maine'" value="${esc(cfg.customTheme)}" />
          </div>
        </div>

        <div class="two-col">
          <div class="field-block anim-stagger">
            <label class="field-label" for="seasonal-select">Seasonal Tie-In</label>
            <select id="seasonal-select" class="field-select">${seasonalOptions}</select>
          </div>
          <div class="field-block anim-stagger">
            <label class="field-label" for="tone-select">Tone</label>
            <select id="tone-select" class="field-select">${toneOptions}</select>
          </div>
        </div>

        <div class="field-block anim-stagger">
          <div class="roster-header">
            <label class="field-label" style="margin-bottom:0;">The Cast — Who’s Playing?</label>
            <span class="names-count" id="cast-count"></span>
          </div>
          <p class="field-hint" style="margin-top:0; margin-bottom:10px;">Add each participant by first name. The notes box personalizes their character — profession, hobbies, personality, anything the writer should weave in.</p>
          <div class="roster" id="roster"></div>
          <button type="button" class="btn-add-row" id="btn-add-participant">＋ Add participant</button>
        </div>

        <div class="two-col">
          <div class="field-block anim-stagger">
            <label class="field-label">Cognitive Level</label>
            <div class="pill-row" data-pill-group="cognitive">${cogPills}</div>
          </div>
          <div class="field-block anim-stagger">
            <label class="field-label">Roleplay Intensity</label>
            <div class="pill-row" data-pill-group="roleplay">${rpPills}</div>
          </div>
        </div>

        <div class="two-col">
          <div class="field-block anim-stagger">
            <label class="field-label">Mobility</label>
            <div class="pill-row" data-pill-group="mobility">${mobPills}</div>
          </div>
          <div class="field-block anim-stagger" style="display:flex; align-items:flex-end; padding-bottom:6px;">
            <label class="checkbox-row">
              <input type="checkbox" id="large-print-checkbox" ${cfg.largePrint ? 'checked' : ''} />
              <span>Format for large print (bigger type, shorter sentences)</span>
            </label>
          </div>
        </div>

        <div class="field-block anim-stagger">
          <label class="field-label" for="special-requests-input">Anything Else the Writer Should Know? <span class="optional-tag">optional</span></label>
          <textarea id="special-requests-input" class="field-input" rows="2" placeholder="e.g. 'Include a beloved dog character', 'It's Dorothy's 90th birthday — make her character shine', 'Avoid any mention of hospitals'">${esc(cfg.specialRequests)}</textarea>
        </div>

        <button id="btn-generate" class="btn-primary btn-generate" type="button" style="width:100%; margin-top:8px;">
          <span class="btn-generate-icon">🔍</span> Generate the Mystery
        </button>
        ${statusHtml}
      </div>
    `;
  }

  /* ── Roster rendering & events ── */

  function rosterRowHtml(p, idx) {
    const partOptions = RD_OPTIONS.PARTICIPATION.map(o =>
      `<option value="${o.id}"${p.participation === o.id ? ' selected' : ''}>${o.label}</option>`
    ).join('');
    return `
      <div class="roster-row" data-idx="${idx}">
        <input type="text" class="field-input roster-name" placeholder="First name" value="${esc(p.name)}" aria-label="Participant ${idx + 1} first name" />
        <input type="text" class="field-input roster-details" placeholder="Character notes — e.g. 'retired nurse, loves birdwatching, quick wit'" value="${esc(p.details)}" aria-label="Participant ${idx + 1} character notes" />
        <select class="field-select roster-part" aria-label="Participant ${idx + 1} participation level">${partOptions}</select>
        <button type="button" class="roster-remove" title="Remove participant" aria-label="Remove participant ${idx + 1}">×</button>
      </div>`;
  }

  function renderRoster() {
    const roster = $('roster');
    if (!roster) return;
    roster.innerHTML = state.config.participants.map(rosterRowHtml).join('');
    updateCastCount();
    const addBtn = $('btn-add-participant');
    if (addBtn) addBtn.style.display = state.config.participants.length >= MAX_PARTICIPANTS ? 'none' : '';
  }

  function updateCastCount() {
    const el = $('cast-count');
    if (!el) return;
    const named = namedParticipants();
    const observers = named.filter(p => p.participation === 'observer').length;
    const players = named.length - observers;
    let text = `${players} player${players === 1 ? '' : 's'}`;
    if (observers) text += ` · ${observers} observer${observers === 1 ? '' : 's'}`;
    text += ' · 2–14 players works best';
    el.textContent = text;
  }

  function wireRosterEvents() {
    const roster = $('roster');

    roster.addEventListener('input', (e) => {
      const row = e.target.closest('.roster-row');
      if (!row) return;
      const idx = parseInt(row.dataset.idx, 10);
      const p = state.config.participants[idx];
      if (!p) return;

      if (e.target.classList.contains('roster-name')) {
        // Comma-paste convenience: "Eleanor, Frank, Dorothy" fans out into rows
        if (e.target.value.includes(',')) {
          const parts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
          p.name = parts.shift() || '';
          const room = MAX_PARTICIPANTS - state.config.participants.length;
          const extras = parts.slice(0, Math.max(0, room))
            .map(name => ({ name, details: '', participation: 'full' }));
          state.config.participants.splice(idx + 1, 0, ...extras);
          renderRoster();
          return;
        }
        p.name = e.target.value;
        updateCastCount();
      } else if (e.target.classList.contains('roster-details')) {
        p.details = e.target.value;
      }
    });

    roster.addEventListener('change', (e) => {
      const row = e.target.closest('.roster-row');
      if (!row) return;
      const idx = parseInt(row.dataset.idx, 10);
      const p = state.config.participants[idx];
      if (p && e.target.classList.contains('roster-part')) {
        p.participation = e.target.value;
        updateCastCount();
      }
    });

    roster.addEventListener('click', (e) => {
      const btn = e.target.closest('.roster-remove');
      if (!btn) return;
      const row = btn.closest('.roster-row');
      const idx = parseInt(row.dataset.idx, 10);
      state.config.participants.splice(idx, 1);
      if (state.config.participants.length === 0) state.config.participants.push(blankParticipant());
      renderRoster();
    });

    $('btn-add-participant').addEventListener('click', () => {
      if (state.config.participants.length >= MAX_PARTICIPANTS) return;
      state.config.participants.push(blankParticipant());
      renderRoster();
      const rows = document.querySelectorAll('.roster-row .roster-name');
      const last = rows[rows.length - 1];
      if (last) last.focus();
    });
  }

  function showSetupStatus(msg, type) {
    const el = $('setup-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-msg ' + (type || 'info');
    el.style.display = msg ? '' : 'none';
  }

  function wireSetupEvents() {
    $('event-type-select').addEventListener('change', (e) => {
      state.config.eventType = e.target.value;
      const evt = findOpt(RD_OPTIONS.EVENT_TYPES, e.target.value);
      $('event-type-hint').textContent = evt.guidance;
    });

    $('length-select').addEventListener('change', (e) => { state.config.length = parseInt(e.target.value, 10); });
    $('seasonal-select').addEventListener('change', (e) => { state.config.seasonal = e.target.value; });
    $('tone-select').addEventListener('change', (e) => { state.config.tone = e.target.value; });

    document.querySelectorAll('#theme-grid .theme-option').forEach(el => {
      const pick = () => {
        state.config.themeId = el.dataset.theme;
        document.querySelectorAll('#theme-grid .theme-option').forEach(o => o.classList.toggle('selected', o === el));
        $('custom-theme-field').classList.toggle('hidden', state.config.themeId !== 'custom');
        if (state.config.themeId === 'custom') $('custom-theme-input').focus();
      };
      el.addEventListener('click', pick);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });

    const customInput = $('custom-theme-input');
    if (customInput) customInput.addEventListener('input', () => { state.config.customTheme = customInput.value; });

    renderRoster();
    wireRosterEvents();

    document.querySelectorAll('.pill-row').forEach(row => {
      const group = row.dataset.pillGroup;
      row.querySelectorAll('.pill-option').forEach(btn => {
        btn.addEventListener('click', () => {
          state.config[group] = btn.dataset.value;
          row.querySelectorAll('.pill-option').forEach(b => b.classList.toggle('selected', b === btn));
        });
      });
    });

    $('large-print-checkbox').addEventListener('change', (e) => { state.config.largePrint = e.target.checked; });
    $('special-requests-input').addEventListener('input', (e) => { state.config.specialRequests = e.target.value; });

    $('btn-generate').addEventListener('click', handleGenerate);
  }

  /* ══════════════════════ RENDER: LOADING ══════════════════════ */

  function loadingTemplate() {
    return `
      <div class="loading-wrap">
        <div class="mag-loader"><span class="mag-glass">🔍</span><span class="mag-trail"></span></div>
        <div class="loading-title">Writing your mystery…</div>
        <div class="loading-flavor" id="loading-flavor">${LOADING_FLAVORS[0]}</div>
        <div class="loading-elapsed" id="loading-elapsed">Elapsed: 0s</div>
      </div>
    `;
  }

  function startLoadingAnimation() {
    let flavorIdx = 0;
    const flavorEl = $('loading-flavor');
    loadingInterval = setInterval(() => {
      flavorIdx = (flavorIdx + 1) % LOADING_FLAVORS.length;
      if (flavorEl) {
        flavorEl.classList.remove('flavor-in');
        void flavorEl.offsetWidth;
        flavorEl.textContent = LOADING_FLAVORS[flavorIdx];
        flavorEl.classList.add('flavor-in');
      }
    }, 2200);

    const start = Date.now();
    const elapsedEl = $('loading-elapsed');
    elapsedInterval = setInterval(() => {
      if (elapsedEl) elapsedEl.textContent = `Elapsed: ${Math.round((Date.now() - start) / 1000)}s`;
    }, 1000);
  }

  function stopLoadingAnimation() {
    clearInterval(loadingInterval);
    clearInterval(elapsedInterval);
    loadingInterval = null;
    elapsedInterval = null;
  }

  /* ══════════════════════ GENERATE FLOW ══════════════════════ */

  async function handleGenerate() {
    const named = namedParticipants();
    const players = activePlayers();
    const errors = [];
    if (players.length < 2) errors.push('Add at least 2 participants who are Full players or Light roles (observers alone can’t solve a mystery!).');
    if (state.config.themeId === 'custom' && !state.config.customTheme.trim()) errors.push('Describe your custom theme, or choose one of the built-in themes.');
    if (!state.apiKey) errors.push('Add your Anthropic API key in Settings before generating a session.');

    if (errors.length) {
      showSetupStatus(errors.join(' '), 'error');
      if (!state.apiKey) openSettings();
      return;
    }

    showSetupStatus('', 'info');
    state.pendingError = null;
    state.view = 'loading';
    render();
    startLoadingAnimation();

    try {
      const templates = RD_PROMPTS.load();
      const vars = buildPromptVars(state.config);
      const system = RD_PROMPTS.render(templates.system, vars);
      const user = RD_PROMPTS.render(templates.user, vars);
      const mystery = normalizeMystery(await callClaude(system, user, named.length));
      state.mystery = mystery;
      state.activeTab = 'overview';
      state.view = 'result';
    } catch (err) {
      console.error(err);
      state.view = 'setup';
      state.pendingError = err.message || 'Something went wrong generating the mystery. Please try again.';
    } finally {
      stopLoadingAnimation();
      render();
    }
  }

  /* ══════════════════════ RENDER: RESULT ══════════════════════ */

  function resultTemplate() {
    const m = state.mystery;
    const evt = findOpt(RD_OPTIONS.EVENT_TYPES, state.config.eventType);
    const tone = findOpt(RD_OPTIONS.TONES, state.config.tone);
    const tabs = [
      ['overview', 'Overview'],
      ['characters', 'Character Sheets'],
      ['facilitator', 'Facilitator Guide'],
      ['clues', 'Clue Cards']
    ];

    const tabBtns = tabs.map(([id, label]) =>
      `<button class="tab-btn${state.activeTab === id ? ' active' : ''}" data-tab="${id}" type="button">${label}</button>`
    ).join('');

    return `
      <div class="result-header anim-fade-up">
        <div>
          <div class="case-eyebrow">${esc(m.case_number || '')} · ${esc(m.era || '')} · ${evt.icon} ${esc(evt.label)}</div>
          <div class="result-title">${esc(m.title || 'Untitled Case')}</div>
          <div class="result-meta">${state.config.length} min · ${m.cast ? m.cast.length : 0} characters · ${esc(tone.label)} · ${findOpt(RD_OPTIONS.COGNITIVE, state.config.cognitive).label} · ${findOpt(RD_OPTIONS.ROLEPLAY, state.config.roleplay).label}</div>
        </div>
        <div class="result-actions no-print">
          <button id="btn-print-characters" class="btn-ghost" type="button">🖨 Characters</button>
          <button id="btn-print-facilitator" class="btn-ghost" type="button">🖨 Facilitator</button>
          <button id="btn-print-clues" class="btn-ghost" type="button">🖨 Clues</button>
          <button id="btn-print-all" class="btn-green" type="button">🖨 Print Full Packet</button>
          <button id="btn-regenerate" class="btn-ghost" type="button">🔄 New Mystery, Same Group</button>
          <button id="btn-new-session" class="btn-ghost" type="button">＋ New Session</button>
        </div>
      </div>

      <div class="tab-row no-print anim-fade-up" style="animation-delay:0.06s;">${tabBtns}</div>

      <div id="tab-panels" class="${state.config.largePrint ? 'large-print' : ''}">
        <div class="tab-panel" data-tab="overview" style="display:${state.activeTab === 'overview' ? 'block' : 'none'};">${overviewTemplate(m)}</div>
        <div class="tab-panel" data-tab="characters" style="display:${state.activeTab === 'characters' ? 'block' : 'none'};">${charactersTemplate(m)}</div>
        <div class="tab-panel" data-tab="facilitator" style="display:${state.activeTab === 'facilitator' ? 'block' : 'none'};">${facilitatorTemplate(m)}</div>
        <div class="tab-panel" data-tab="clues" style="display:${state.activeTab === 'clues' ? 'block' : 'none'};">${cluesTemplate(m)}</div>
      </div>
    `;
  }

  function overviewTemplate(m) {
    const v = m.victim || {};
    const castSummary = (m.cast || []).map(c => `
      <li><strong>${esc(c.character_name)}</strong> <span style="color:var(--muted);">— ${esc(c.role_title)}</span> <span style="color:var(--green-light); font-size:11px;">(played by ${esc(c.resident_name)})</span></li>
    `).join('');

    return `
      <div class="card anim-card">
        <div class="card-label">The Hook</div>
        <div class="overview-hook">${esc(m.hook)}</div>
        <div class="card-label" style="margin-top:16px;">Setting</div>
        <div class="body-text">${esc(m.setting)}</div>
      </div>
      <div class="card anim-card">
        <div class="card-label">The Victim</div>
        <div class="card-title" style="font-size:1rem;">${esc(v.name)}</div>
        <div class="body-text">${esc(v.description)}</div>
        <div class="body-text" style="margin-top:6px;"><em>Cause of death:</em> ${esc(v.cause_of_death)}</div>
      </div>
      <div class="card anim-card">
        <div class="card-label">The Cast</div>
        <ul class="char-list" style="list-style:none;">${castSummary}</ul>
      </div>
      <div class="card solution-box anim-card">
        <div class="reveal-toggle" id="solution-toggle">👁 Reveal Solution (Staff Only)</div>
        <div class="solution-body" id="solution-body">
          <div class="card-label">Culprit</div>
          <div class="body-text" style="margin-bottom:10px;">${esc(m.solution.culprit_character_name)}</div>
          <div class="card-label">Motive</div>
          <div class="body-text" style="margin-bottom:10px;">${esc(m.solution.motive)}</div>
          <div class="card-label">Method</div>
          <div class="body-text" style="margin-bottom:10px;">${esc(m.solution.method)}</div>
          <div class="card-label">Key Evidence</div>
          <div class="body-text">${esc(m.solution.key_evidence)}</div>
        </div>
      </div>
    `;
  }

  function charactersTemplate(m) {
    const cards = (m.cast || []).map(c => `
      <div class="char-card anim-card${c.is_culprit ? ' is-culprit' : ''}">
        <div class="char-card-head">
          <div>
            <div class="char-resident">Played by ${esc(c.resident_name)}</div>
            <div class="char-name">${esc(c.character_name)}</div>
            <div class="char-role">${esc(c.role_title)}</div>
          </div>
          ${c.is_culprit ? '<span class="culprit-flag">Culprit</span>' : ''}
        </div>
        <div class="char-section">
          <div class="char-section-label">Backstory</div>
          <div class="char-section-body">${esc(c.backstory)}</div>
        </div>
        <div class="char-section">
          <div class="char-section-label">What You Know</div>
          <div class="char-section-body">${esc(c.public_knowledge)}</div>
        </div>
        <div class="char-section">
          <div class="char-section-label">Your Secret</div>
          <div class="char-section-body">${esc(c.secret)}</div>
        </div>
        <div class="char-section">
          <div class="char-section-label">Clues You Hold</div>
          <ul class="char-list">${(c.clues_held || []).map(cl => `<li>${esc(cl)}</li>`).join('')}</ul>
        </div>
        <div class="char-section">
          <div class="char-section-label">If You're Not Sure What to Say</div>
          <ul class="char-list">${(c.conversation_starters || []).map(cs => `<li>${esc(cs)}</li>`).join('')}</ul>
        </div>
      </div>
    `).join('');

    return `
      <div class="section-print-heading" style="margin-bottom:14px;">
        <div class="card-title">Character Sheets — ${esc(m.title)}</div>
        <div class="body-text">${esc(m.case_number)} · One sheet per participant. Give each person only their own sheet.</div>
      </div>
      <div class="char-grid">${cards}</div>
    `;
  }

  function facilitatorTemplate(m) {
    const g = m.facilitator_guide || {};
    const scenes = (g.scenes || []).map((s, i) => `
      <div class="scene-card anim-card">
        <div class="scene-num">Scene ${i + 1} of ${g.scenes.length}</div>
        <div class="scene-title">${esc(s.scene_title)}</div>
        <div class="scene-script">${esc(s.facilitator_script)}</div>
        ${s.clue_to_reveal ? `<div class="scene-clue">🔎 Reveal: ${esc(s.clue_to_reveal)}</div>` : ''}
        ${(s.discussion_prompts && s.discussion_prompts.length) ? `<ul class="scene-prompts">${s.discussion_prompts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      </div>
    `).join('');

    return `
      <div class="section-print-heading" style="margin-bottom:14px;">
        <div class="card-title">Facilitator Guide — STAFF ONLY — ${esc(m.title)}</div>
        <div class="body-text">${esc(m.case_number)} · Contains the full solution. Do not share with participants before the reveal.</div>
      </div>
      <div class="card anim-card">
        <div class="card-label">Opening Briefing</div>
        <div class="scene-script">${esc(g.opening_briefing)}</div>
      </div>
      ${scenes}
      <div class="card anim-card">
        <div class="card-label">Closing Reveal</div>
        <div class="scene-script">${esc(g.closing_reveal)}</div>
      </div>
      <div class="card solution-box anim-card">
        <div class="card-label">Solution Recap (Staff Only)</div>
        <div class="body-text" style="margin-bottom:6px;"><strong>Culprit:</strong> ${esc(m.solution.culprit_character_name)}</div>
        <div class="body-text" style="margin-bottom:6px;"><strong>Motive:</strong> ${esc(m.solution.motive)}</div>
        <div class="body-text" style="margin-bottom:6px;"><strong>Method:</strong> ${esc(m.solution.method)}</div>
        <div class="body-text"><strong>Key Evidence:</strong> ${esc(m.solution.key_evidence)}</div>
      </div>
    `;
  }

  function cluesTemplate(m) {
    const cards = (m.clue_cards || []).map(c => `
      <div class="clue-card anim-card">
        <div class="clue-type">${esc(c.card_type)}</div>
        <div class="clue-title">${esc(c.card_title)}</div>
        <div class="clue-text">${esc(c.card_text)}</div>
      </div>
    `).join('');

    return `
      <div class="section-print-heading" style="margin-bottom:14px;">
        <div class="card-title">Clue &amp; Evidence Cards — ${esc(m.title)}</div>
        <div class="body-text">${esc(m.case_number)} · Print and cut apart before the session.</div>
      </div>
      <div class="clue-grid">${cards}</div>
    `;
  }

  function wireResultEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.tab-panel').forEach(p => { p.style.display = (p.dataset.tab === state.activeTab) ? 'block' : 'none'; });
      });
    });

    const solutionToggle = $('solution-toggle');
    if (solutionToggle) {
      solutionToggle.addEventListener('click', () => {
        const body = $('solution-body');
        const shown = body.classList.toggle('shown');
        solutionToggle.textContent = shown ? '🙈 Hide Solution' : '👁 Reveal Solution (Staff Only)';
      });
    }

    $('btn-print-characters').addEventListener('click', () => printPacket(['characters']));
    $('btn-print-facilitator').addEventListener('click', () => printPacket(['facilitator']));
    $('btn-print-clues').addEventListener('click', () => printPacket(['clues']));
    $('btn-print-all').addEventListener('click', () => printPacket(['characters', 'facilitator', 'clues']));
    $('btn-regenerate').addEventListener('click', handleGenerate);
    $('btn-new-session').addEventListener('click', () => {
      state.view = 'setup';
      state.mystery = null;
      render();
    });
  }

  function printPacket(sections) {
    const container = document.createElement('div');
    container.className = 'print-target' + (state.config.largePrint ? ' large-print' : '');
    container.id = 'print-container';
    sections.forEach(sec => {
      const src = document.querySelector(`.tab-panel[data-tab="${sec}"]`);
      if (src) {
        const clone = src.cloneNode(true);
        clone.style.display = 'block';
        clone.classList.add('print-page-break');
        container.appendChild(clone);
      }
    });
    document.body.appendChild(container);
    window.print();
    const cleanup = () => { if (container.parentNode) container.remove(); window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 4000);
  }

  /* ══════════════════════ SETTINGS MODAL ══════════════════════ */

  function openSettings() {
    $('api-key-input').value = '';
    $('api-key-input').placeholder = state.apiKey ? 'Key saved — enter a new one to replace it' : 'sk-ant-...';
    $('model-input').value = state.model;
    $('settings-modal').classList.remove('hidden');
  }

  function closeSettings() {
    $('settings-modal').classList.add('hidden');
  }

  function wireSettingsModal() {
    $('btn-settings').addEventListener('click', openSettings);
    $('btn-close-settings').addEventListener('click', closeSettings);
    $('settings-modal').addEventListener('click', (e) => { if (e.target.id === 'settings-modal') closeSettings(); });

    $('btn-save-key').addEventListener('click', () => {
      const keyVal = $('api-key-input').value.trim();
      const modelVal = $('model-input').value.trim();
      if (keyVal) {
        state.apiKey = keyVal;
        localStorage.setItem(STORAGE_KEY_API, keyVal);
      }
      state.model = modelVal || DEFAULT_MODEL;
      localStorage.setItem(STORAGE_KEY_MODEL, state.model);
      closeSettings();
      updateModelBadge();
      if (state.view === 'setup') showSetupStatus('', 'info');
    });

    $('btn-clear-key').addEventListener('click', () => {
      state.apiKey = '';
      localStorage.removeItem(STORAGE_KEY_API);
      $('api-key-input').value = '';
      $('api-key-input').placeholder = 'sk-ant-...';
      updateModelBadge();
    });
  }

  /* ══════════════════════ INIT ══════════════════════ */

  document.addEventListener('DOMContentLoaded', () => {
    wireSettingsModal();
    render();
    if (!state.apiKey) openSettings();
  });
})();
