/**
 * FlowForge – localStorage as database
 * CRUD for automations, runs, user settings. Seed data on first load.
 */

(function (global) {
  'use strict';

  var PREFIX = 'flowforge_';
  var KEYS = {
    automations: PREFIX + 'automations',
    runs: PREFIX + 'runs',
    user: PREFIX + 'user',
    onboardingDone: PREFIX + 'onboarding_done',
  };

  function id() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  function get(key, defaultValue) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (defaultValue !== undefined ? defaultValue : null);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  // --- Automations ---
  function getAutomations() {
    return get(KEYS.automations, []);
  }

  function getAutomation(id) {
    var list = getAutomations();
    return list.find(function (a) { return a.id === id; }) || null;
  }

  function saveAutomation(automation) {
    var list = getAutomations();
    var idx = list.findIndex(function (a) { return a.id === automation.id; });
    var now = new Date().toISOString();
    if (!automation.createdAt) automation.createdAt = now;
    automation.updatedAt = now;
    if (idx >= 0) {
      list[idx] = automation;
    } else {
      list.push(automation);
    }
    set(KEYS.automations, list);
    return automation;
  }

  function deleteAutomation(id) {
    var list = getAutomations().filter(function (a) { return a.id !== id; });
    set(KEYS.automations, list);
    return true;
  }

  function duplicateAutomation(id) {
    var orig = getAutomation(id);
    if (!orig) return null;
    var copy = JSON.parse(JSON.stringify(orig));
    copy.id = id();
    copy.name = orig.name + ' (copy)';
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    copy.conditions = (copy.conditions || []).map(function (c) {
      c.id = id();
      return c;
    });
    copy.actions = (copy.actions || []).map(function (a) {
      a.id = id();
      return a;
    });
    return saveAutomation(copy);
  }

  // --- Runs ---
  function getRuns() {
    return get(KEYS.runs, []);
  }

  function addRun(record) {
    var list = getRuns();
    record.runId = record.runId || id();
    record.timestamp = record.timestamp || new Date().toISOString();
    list.unshift(record);
    if (list.length > 500) list = list.slice(0, 500);
    set(KEYS.runs, list);
    return record;
  }

  function updateRunFeedback(runId, feedback) {
    var list = getRuns();
    var idx = list.findIndex(function (r) { return r.runId === runId; });
    if (idx < 0) return null;
    list[idx].feedback = feedback;
    set(KEYS.runs, list);
    return list[idx];
  }

  // --- User / Settings ---
  function getUser() {
    var defaults = {
      name: 'Demo User',
      email: 'demo@example.com',
      notifications: true,
      privacyShareAnalytics: false,
      tone: 'professional',
      riskLevel: 'low',
      maskPIIInLogs: false,
      demoMode: false,
    };
    var user = get(KEYS.user, defaults);
    if (user.tone === undefined) user.tone = defaults.tone;
    if (user.riskLevel === undefined) user.riskLevel = defaults.riskLevel;
    if (user.maskPIIInLogs === undefined) user.maskPIIInLogs = defaults.maskPIIInLogs;
    if (user.demoMode === undefined) user.demoMode = defaults.demoMode;
    return user;
  }

  function saveUser(user) {
    set(KEYS.user, user);
    return user;
  }

  function isOnboardingDone() {
    return get(KEYS.onboardingDone, false) === true;
  }

  function setOnboardingDone() {
    set(KEYS.onboardingDone, true);
  }

  // --- Seed data (2 sample automations + sample runs) ---
  function seedIfEmpty() {
    var automations = getAutomations();
    if (automations.length > 0) return;

    var a1 = {
      id: id(),
      name: 'Meeting follow-up',
      trigger: { type: 'schedule', config: { cron: 'after_meeting', interval: '15m' } },
      conditions: [
        { id: id(), field: 'has_attendees', operator: 'equals', value: 'true' },
      ],
      actions: [
        { id: id(), type: 'send_email', config: { template: 'meeting_summary', to: 'attendees' } },
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    var a2 = {
      id: id(),
      name: 'Support triage',
      trigger: { type: 'email_received', config: { folder: 'inbox', from: 'any' } },
      conditions: [
        { id: id(), field: 'subject_contains', operator: 'contains', value: 'help' },
      ],
      actions: [
        { id: id(), type: 'classify_request', config: {} },
        { id: id(), type: 'generate_reply', config: { tone: 'professional' } },
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set(KEYS.automations, [a1, a2]);

    // Seed a few sample runs so dashboard isn't empty
    var runs = getRuns();
    if (runs.length === 0 && typeof global.FlowForgeAI !== 'undefined') {
      addRun({
        automationId: a1.id,
        automationName: a1.name,
        status: 'success',
        stepsExecuted: [
          { step: 'trigger', result: 'Schedule fired', aiOutput: null },
          { step: 'condition', result: 'has_attendees = true', aiOutput: null },
          { step: 'action', result: 'Email sent', aiOutput: { summary: 'Meeting summary sent to 3 attendees.' } },
        ],
        durationMs: 420,
      });
      addRun({
        automationId: a2.id,
        automationName: a2.name,
        status: 'success',
        stepsExecuted: [
          { step: 'trigger', result: 'Email received', aiOutput: null },
          { step: 'condition', result: 'subject contains "help"', aiOutput: null },
          { step: 'action', result: 'Classified', aiOutput: { classification: 'Support', confidence: 0.92 } },
          { step: 'action', result: 'Reply generated', aiOutput: { preview: 'Thank you for reaching out. We will look into this...' } },
        ],
        durationMs: 890,
      });
    }
  }

  function resetDemoData() {
    set(KEYS.automations, []);
    set(KEYS.runs, []);
    set(KEYS.onboardingDone, false);
    seedIfEmpty();
  }

  // --- Templates (static; used for 1-click import) ---
  var TEMPLATES = [
    {
      id: 'tpl_landlord',
      name: 'Auto-reply to landlords',
      description: 'Send a polite, professional reply when you receive a rental inquiry or landlord message.',
      trigger: { type: 'email_received', config: { folder: 'inbox' } },
      conditions: [{ id: 'c1', field: 'subject_contains', operator: 'contains', value: 'rental' }],
      actions: [{ id: 'a1', type: 'generate_reply', config: { tone: 'professional', context: 'rental_inquiry' } }],
    },
    {
      id: 'tpl_job_followup',
      name: 'Job application follow-up helper',
      description: 'Remind you to follow up on job applications after 1 week.',
      trigger: { type: 'schedule', config: { cron: 'weekly', day: 'monday' } },
      conditions: [{ id: 'c1', field: 'tag', operator: 'equals', value: 'application_sent' }],
      actions: [{ id: 'a1', type: 'create_task', config: { title: 'Follow up on job application', priority: 'high' } }],
    },
    {
      id: 'tpl_receipts',
      name: 'Receipts → expense log',
      description: 'When you receive an email with a receipt, classify and log it as an expense.',
      trigger: { type: 'email_received', config: { hasAttachment: true } },
      conditions: [{ id: 'c1', field: 'subject_contains', operator: 'contains', value: 'receipt' }],
      actions: [
        { id: 'a1', type: 'classify_request', config: {} },
        { id: 'a2', type: 'log_expense', config: { category: 'auto', fromAttachment: true } },
      ],
    },
    {
      id: 'tpl_gym_meal',
      name: 'Gym meal plan reminder',
      description: 'Daily reminder to log your meals and workout.',
      trigger: { type: 'schedule', config: { cron: 'daily', time: '08:00' } },
      conditions: [],
      actions: [{ id: 'a1', type: 'send_email', config: { template: 'meal_reminder', to: 'self' } }],
    },
    {
      id: 'tpl_support_triage',
      name: 'Customer support triage',
      description: 'Classify incoming support emails and suggest a reply.',
      trigger: { type: 'email_received', config: { folder: 'inbox' } },
      conditions: [{ id: 'c1', field: 'from_domain', operator: 'not_equals', value: 'internal' }],
      actions: [
        { id: 'a1', type: 'classify_request', config: {} },
        { id: 'a2', type: 'summarize_text', config: {} },
        { id: 'a3', type: 'generate_reply', config: { tone: 'helpful' } },
      ],
    },
    {
      id: 'tpl_missed_appt',
      name: 'Missed appointment rescheduler',
      description: 'When someone misses an appointment, send a gentle reschedule offer.',
      trigger: { type: 'form_submitted', config: { formId: 'no_show' } },
      conditions: [{ id: 'c1', field: 'event', operator: 'equals', value: 'no_show' }],
      actions: [
        { id: 'a1', type: 'generate_reply', config: { tone: 'friendly', template: 'reschedule_offer' } },
        { id: 'a2', type: 'create_task', config: { title: 'Follow up: reschedule', priority: 'medium' } },
      ],
    },
    {
      id: 'tpl_purchase_summary',
      name: 'Purchase confirmation summarizer',
      description: 'Summarize purchase confirmations and log key details.',
      trigger: { type: 'purchase_made', config: {} },
      conditions: [],
      actions: [
        { id: 'a1', type: 'summarize_text', config: {} },
        { id: 'a2', type: 'log_expense', config: { category: 'purchase' } },
      ],
    },
    {
      id: 'tpl_weekly_digest',
      name: 'Weekly digest',
      description: 'Every Monday, create a summary of last week\'s key emails and tasks.',
      trigger: { type: 'schedule', config: { cron: 'weekly', day: 'monday', time: '09:00' } },
      conditions: [],
      actions: [{ id: 'a1', type: 'summarize_text', config: { mode: 'weekly_digest' } }],
    },
  ];

  function getTemplates() {
    return TEMPLATES;
  }

  function importTemplate(templateId) {
    var tpl = TEMPLATES.find(function (t) { return t.id === templateId; });
    if (!tpl) return null;
    var automation = {
      id: id(),
      name: tpl.name,
      trigger: JSON.parse(JSON.stringify(tpl.trigger)),
      conditions: (tpl.conditions || []).map(function (c) {
        return { id: id(), field: c.field, operator: c.operator, value: c.value };
      }),
      actions: (tpl.actions || []).map(function (a) {
        return { id: id(), type: a.type, config: JSON.parse(JSON.stringify(a.config || {})) };
      }),
      status: 'paused',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return saveAutomation(automation);
  }

  // Public API
  global.FlowForgeStorage = {
    id: id,
    getAutomations: getAutomations,
    getAutomation: getAutomation,
    saveAutomation: saveAutomation,
    deleteAutomation: deleteAutomation,
    duplicateAutomation: duplicateAutomation,
    getRuns: getRuns,
    addRun: addRun,
    updateRunFeedback: updateRunFeedback,
    getUser: getUser,
    saveUser: saveUser,
    isOnboardingDone: isOnboardingDone,
    setOnboardingDone: setOnboardingDone,
    seedIfEmpty: seedIfEmpty,
    resetDemoData: resetDemoData,
    getTemplates: getTemplates,
    importTemplate: importTemplate,
  };
})(typeof window !== 'undefined' ? window : this);
