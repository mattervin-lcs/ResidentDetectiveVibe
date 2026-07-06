(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  let statusTimer = null;

  /* ── Sample session used for the preview ── */

  const SAMPLE_CONFIG = {
    eventType: 'dinner-party',
    themeId: 'speakeasy',
    customTheme: '',
    seasonal: 'newyear',
    tone: 'classic',
    participants: [
      { name: 'Eleanor', details: 'retired schoolteacher, loves gardening, sharp memory', participation: 'full' },
      { name: 'Frank', details: 'Navy veteran, plays harmonica', participation: 'full' },
      { name: 'Dorothy', details: '', participation: 'full' },
      { name: 'Walter', details: 'prefers to listen, great laugh', participation: 'observer' }
    ],
    length: 60,
    cognitive: 'standard',
    mobility: 'limited',
    roleplay: 'light',
    largePrint: true,
    specialRequests: "It's Dorothy's birthday week — give her character a small moment to shine."
  };

  function findOpt(list, id) { return list.find(o => o.id === id) || list[0]; }

  function buildSampleVars(cfg) {
    const evt = findOpt(RD_OPTIONS.EVENT_TYPES, cfg.eventType);
    const theme = findOpt(RD_OPTIONS.THEMES, cfg.themeId);
    const seasonal = findOpt(RD_OPTIONS.SEASONAL, cfg.seasonal);
    const tone = findOpt(RD_OPTIONS.TONES, cfg.tone);
    const lengthOpt = RD_OPTIONS.LENGTHS.find(l => l.minutes === cfg.length) || RD_OPTIONS.LENGTHS[3];
    const named = cfg.participants.filter(p => p.name.trim());

    const participants = named.map((p, i) => {
      const part = findOpt(RD_OPTIONS.PARTICIPATION, p.participation);
      let line = `${i + 1}. ${p.name.trim()} — ${part.promptText}`;
      if (p.details.trim()) line += `. Character notes: ${p.details.trim()}`;
      return line;
    }).join('\n');

    return {
      event_type: evt.label,
      event_type_guidance: evt.guidance,
      theme: theme.name + (theme.flavor ? ' — ' + theme.flavor : ''),
      seasonal: seasonal.promptText || 'None',
      tone: tone.label,
      tone_guidance: tone.guidance,
      participants: participants,
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

  /* ── UI helpers ── */

  function showStatus(msg, isError) {
    const el = $('admin-status');
    el.textContent = msg;
    el.className = 'admin-status' + (isError ? ' is-error' : ' is-ok');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { el.textContent = ''; el.className = 'admin-status'; }, 3500);
  }

  function updateBadge() {
    const badge = $('custom-badge');
    if (RD_PROMPTS.isCustomized()) {
      badge.textContent = 'Custom templates active';
      badge.classList.add('badge-custom');
    } else {
      badge.textContent = 'Default templates';
      badge.classList.remove('badge-custom');
    }
  }

  function updateCounts() {
    $('system-count').textContent = `${$('system-template').value.length.toLocaleString()} chars`;
    $('user-count').textContent = `${$('user-template').value.length.toLocaleString()} chars`;
  }

  function loadIntoEditors() {
    const t = RD_PROMPTS.load();
    $('system-template').value = t.system;
    $('user-template').value = t.user;
    updateCounts();
    updateBadge();
  }

  /* ── Placeholder chips ── */

  function renderChips() {
    const grid = $('placeholder-chips');
    grid.innerHTML = RD_PROMPTS.PLACEHOLDERS.map(p => `
      <button type="button" class="chip" data-key="${p.key}" title="${p.desc.replace(/"/g, '&quot;')}">
        <span class="chip-key">{{${p.key}}}</span>
        <span class="chip-desc">${p.desc}</span>
      </button>
    `).join('');

    grid.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const text = `{{${chip.dataset.key}}}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          () => showStatus(`Copied ${text} to clipboard`),
          () => showStatus(`Copy failed — select and copy manually: ${text}`, true)
        );
      } else {
        showStatus(`Clipboard unavailable — type it manually: ${text}`, true);
      }
    });
  }

  /* ── Actions ── */

  function saveTemplates() {
    const system = $('system-template').value;
    const user = $('user-template').value;

    if (!system.trim() || !user.trim()) {
      showStatus('Templates can\'t be empty — use Reset to restore the defaults instead.', true);
      return;
    }

    const warnings = [];
    if (!user.includes('{{participants}}') && !system.includes('{{participants}}')) {
      warnings.push('no {{participants}} placeholder — the cast list won\'t reach the writer');
    }
    if (!system.toLowerCase().includes('submit_mystery')) {
      warnings.push('no mention of the submit_mystery tool (generation still works — the tool call is enforced — but the instruction helps quality)');
    }

    RD_PROMPTS.save({ system, user });
    updateBadge();

    if (warnings.length) {
      showStatus('Saved, with warnings: ' + warnings.join('; '), true);
    } else {
      showStatus('Saved — the next generation will use these templates.');
    }
  }

  function resetTemplates() {
    if (!confirm('Reset both templates to the built-in defaults? Your customizations will be discarded.')) return;
    RD_PROMPTS.reset();
    loadIntoEditors();
    $('preview-card').classList.add('hidden');
    showStatus('Reset to defaults.');
  }

  function previewTemplates() {
    const vars = buildSampleVars(SAMPLE_CONFIG);
    const system = RD_PROMPTS.render($('system-template').value, vars);
    const user = RD_PROMPTS.render($('user-template').value, vars);
    $('preview-system').textContent = system;
    $('preview-user').textContent = user;
    $('preview-scenario-label').textContent =
      'Sample: Dinner Party Mystery · 1920s Speakeasy · New Year\'s Eve · Classic Whodunit · 4 participants (1 observer) · 60 min · limited mobility · large print';
    const card = $('preview-card');
    card.classList.remove('hidden');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const unresolved = (system + user).match(/\{\{\s*\w+\s*\}\}/g);
    if (unresolved) {
      showStatus('Heads up — unresolved placeholders in preview: ' + [...new Set(unresolved)].join(', '), true);
    }
  }

  /* ── Init ── */

  document.addEventListener('DOMContentLoaded', () => {
    loadIntoEditors();
    renderChips();

    $('system-template').addEventListener('input', updateCounts);
    $('user-template').addEventListener('input', updateCounts);

    $('btn-save-templates').addEventListener('click', saveTemplates);
    $('btn-reset-templates').addEventListener('click', resetTemplates);
    $('btn-preview-templates').addEventListener('click', previewTemplates);
  });
})();
