/**
 * FlowForge – Simulated AI engine
 * Deterministic + template-based outputs with small random variation.
 * Used for: builder suggestions, generate reply, classify, summarize, dashboard insights.
 */

(function (global) {
  'use strict';

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function slightVariation(str) {
    var variants = {
      'Thank you': ['Thanks', 'Thank you', 'Many thanks'],
      'I will': ['I\'ll', 'I will', 'I\'d be glad to'],
      'please': ['please', 'kindly', 'when you can'],
    };
    var k = Object.keys(variants).find(function (key) { return str.indexOf(key) !== -1; });
    return k ? str.replace(k, pick(variants[k])) : str;
  }

  // --- Mask PII in strings (emails, phone numbers) ---
  function maskPII(text) {
    if (text == null || typeof text !== 'string') return text;
    var s = text
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[email redacted]')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone redacted]')
      .replace(/\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/g, '[phone redacted]');
    return s;
  }

  function maskPIIInObject(obj) {
    if (obj == null) return obj;
    if (typeof obj === 'string') return maskPII(obj);
    if (Array.isArray(obj)) return obj.map(maskPIIInObject);
    if (typeof obj === 'object') {
      var out = {};
      for (var key in obj) out[key] = maskPIIInObject(obj[key]);
      return out;
    }
    return obj;
  }

  // --- Suggest next step in builder (Condition or Action based on Trigger) ---
  var TRIGGER_TO_SUGGESTIONS = {
    schedule: [
      { type: 'condition', label: 'Only on weekdays', field: 'weekday', operator: 'in', value: 'mon-fri' },
      { type: 'condition', label: 'Only if no conflict', field: 'calendar_free', operator: 'equals', value: 'true' },
      { type: 'action', typeId: 'create_task', label: 'Create task', config: { title: 'Scheduled follow-up', priority: 'medium' } },
      { type: 'action', typeId: 'send_email', label: 'Send email', config: { template: 'reminder' } },
    ],
    email_received: [
      { type: 'condition', label: 'Subject contains keyword', field: 'subject_contains', operator: 'contains', value: 'urgent' },
      { type: 'condition', label: 'From external domain', field: 'from_domain', operator: 'not_equals', value: 'internal' },
      { type: 'action', typeId: 'classify_request', label: 'Classify request', config: {} },
      { type: 'action', typeId: 'summarize_text', label: 'Summarize email', config: {} },
      { type: 'action', typeId: 'generate_reply', label: 'Generate reply', config: { tone: 'professional' } },
    ],
    form_submitted: [
      { type: 'condition', label: 'Form type equals', field: 'form_type', operator: 'equals', value: 'contact' },
      { type: 'action', typeId: 'create_task', label: 'Create task from submission', config: { title: 'New form submission', priority: 'high' } },
      { type: 'action', typeId: 'send_email', label: 'Send confirmation email', config: { template: 'form_confirmation' } },
    ],
    purchase_made: [
      { type: 'condition', label: 'Amount above', field: 'amount', operator: 'greater_than', value: '100' },
      { type: 'action', typeId: 'log_expense', label: 'Log expense', config: { category: 'purchase' } },
      { type: 'action', typeId: 'summarize_text', label: 'Summarize purchase', config: {} },
    ],
  };

  function suggestNextStep(triggerType, existingConditions, existingActions) {
    var list = TRIGGER_TO_SUGGESTIONS[triggerType] || TRIGGER_TO_SUGGESTIONS.email_received;
    var available = list.filter(function (s) {
      if (s.type === 'condition') return existingConditions.length < 5;
      return existingActions.length < 6;
    });
    var chosen = pick(available.length ? available : list);
    return {
      type: chosen.type,
      label: chosen.label,
      field: chosen.field,
      operator: chosen.operator,
      value: chosen.value,
      typeId: chosen.typeId,
      config: chosen.config || {},
    };
  }

  // --- Generate reply (given mock inbound message) ---
  var REPLY_TEMPLATES = {
    professional: [
      'Thank you for your message. I have received your request and will look into it shortly. I will get back to you within 24 hours.',
      'Thanks for reaching out. I\'ve noted the details and will follow up with you by end of day. Please let me know if you have any urgent questions in the meantime.',
    ],
    friendly: [
      'Hi! Thanks for getting in touch. I\'ll look into this and get back to you soon. Have a great day!',
      'Hey there – received your message. I\'ll circle back with a proper response shortly. Thanks!',
    ],
    direct: [
      'Received. We will respond within 24 hours.',
      'Request noted. Expect a follow-up by end of day.',
    ],
    helpful: [
      'Thank you for contacting us. Based on your message, here are the next steps: 1) We\'ll verify the details, 2) Process your request within 1–2 business days. You\'ll receive a confirmation email once complete.',
      'Thanks for reaching out. I\'ve forwarded this to the right team. You should hear back within 24 hours. In the meantime, you can check our help center for common answers.',
    ],
  };

  function generateReply(inboundMessage, options) {
    options = options || {};
    var tone = options.tone || 'professional';
    var templates = REPLY_TEMPLATES[tone] || REPLY_TEMPLATES.professional;
    var base = pick(templates);
    var withVariation = slightVariation(base);
    return {
      body: withVariation,
      tone: tone,
      preview: withVariation.slice(0, 80) + (withVariation.length > 80 ? '…' : ''),
    };
  }

  // --- Classify request: Billing / Scheduling / Complaint / General ---
  var CLASSES = ['Billing', 'Scheduling', 'Complaint', 'General'];

  function classifyRequest(text) {
    text = (text || '').toLowerCase();
    var scores = {
      Billing: (text.match(/\b(bill|invoice|payment|charge|refund|subscription)\b/g) || []).length,
      Scheduling: (text.match(/\b(meeting|schedule|appointment|calendar|reschedule|time)\b/g) || []).length,
      Complaint: (text.match(/\b(issue|problem|wrong|unhappy|disappointed|fix)\b/g) || []).length,
      General: 1,
    };
    var best = CLASSES.reduce(function (a, c) { return scores[c] > scores[a] ? c : a; }, 'General');
    var confidence = 0.75 + Math.random() * 0.2;
    return {
      classification: best,
      confidence: Math.round(confidence * 100) / 100,
      alternatives: CLASSES.filter(function (c) { return c !== best && scores[c] > 0; }).slice(0, 2),
    };
  }

  // --- Summarize: 3 bullets + follow-up questions ---
  var BULLET_TEMPLATES = [
    ['Key request or topic identified.', 'Sender is asking for a response or action.', 'Suggested next step: reply or assign.'],
    ['Main point summarized in one line.', 'Additional context or detail noted.', 'Follow-up recommended within 48 hours.'],
    ['Topic: inquiry or feedback.', 'Action needed: response or internal routing.', 'Priority: normal unless keywords suggest otherwise.'],
  ];

  var FOLLOWUP_TEMPLATES = [
    'Do you want to reply now or schedule for later?',
    'Should this be escalated or handled in-house?',
    'Any specific deadline or SLA to meet?',
  ];

  function summarizeText(text) {
    var bullets = pick(BULLET_TEMPLATES);
    var followUp = pick(FOLLOWUP_TEMPLATES);
    return {
      bullets: bullets,
      followUpQuestions: [followUp],
      summary: bullets.join(' '),
    };
  }

  // --- Dashboard insights (based on automations + runs) ---
  function getDashboardInsights(automations, runs) {
    var active = (automations || []).filter(function (a) { return a.status === 'active'; }).length;
    var totalRuns = (runs || []).length;
    var successRuns = (runs || []).filter(function (r) { return r.status === 'success'; }).length;
    var successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 100;

    var insights = [];
    if (active === 0) {
      insights.push({
        type: 'tip',
        title: 'Create your first automation',
        text: 'Start with a template from the Templates gallery, or build one from scratch in the Builder. Most users begin with "Support triage" or "Meeting follow-up".',
      });
    }
    if (totalRuns > 0 && successRate < 90) {
      insights.push({
        type: 'warning',
        title: 'Success rate below 90%',
        text: successRate + '% of runs succeeded. Review failed runs in the Activity log and consider adding conditions or adjusting triggers.',
      });
    }
    if (active >= 2 && totalRuns >= 5) {
      insights.push({
        type: 'positive',
        title: 'Automations are running well',
        text: 'You have ' + active + ' active automation(s) and ' + totalRuns + ' run(s) recorded. Consider adding a "Summarize" or "Classify" step to save more time.',
      });
    }
    var lastRun = (runs || [])[0];
    if (lastRun && active > 0) {
      insights.push({
        type: 'info',
        title: 'Last run: ' + lastRun.automationName,
        text: 'Status: ' + lastRun.status + ', duration ' + (lastRun.durationMs || 0) + ' ms. View details in Activity.',
      });
    }
    if (insights.length === 0) {
      insights.push({
        type: 'tip',
        title: 'Try the Builder',
        text: 'Use "Suggest next step" in the Automation Builder to get AI-recommended conditions and actions based on your trigger.',
      });
    }
    return insights.slice(0, 4); // max 4
  }

  // --- Simulate run: execute automation steps and return run record ---
  // mockInput (payload): email: from, subject, body; schedule: dateTime, timezone; form: formName, responses (JSON); purchase: vendor, amount, items, notes
  // options: tone, riskLevel, maskPII (apply to aiOutput before return if true)
  function simulateRun(automation, mockInput, options) {
    mockInput = mockInput || {};
    options = options || {};
    var stepsExecuted = [];
    var start = Date.now();
    var triggerType = (automation.trigger && automation.trigger.type) || 'email_received';

    var emailBody = mockInput.body || mockInput.emailBody || mockInput.text || 'Customer inquiry about service.';
    var textForAI = mockInput.body || mockInput.emailBody || mockInput.text || (mockInput.responses && typeof mockInput.responses === 'string' ? mockInput.responses : JSON.stringify(mockInput.responses || {})) || (mockInput.notes || '') || 'Sample content.';

    stepsExecuted.push({
      step: 'trigger',
      result: 'Trigger fired: ' + (triggerType === 'schedule' ? (mockInput.dateTime || 'scheduled') : triggerType === 'email_received' ? (mockInput.subject || 'email') : triggerType === 'form_submitted' ? (mockInput.formName || 'form') : triggerType === 'purchase_made' ? (mockInput.vendor || 'purchase') : 'event'),
      aiOutput: null,
    });

    (automation.conditions || []).forEach(function (c) {
      stepsExecuted.push({
        step: 'condition',
        result: c.field + ' ' + c.operator + ' ' + c.value,
        aiOutput: null,
      });
    });

    var actionOpts = { tone: options.tone || 'professional' };
    (automation.actions || []).forEach(function (a) {
      var aiOutput = null;
      var config = a.config || {};
      var tone = config.tone || options.tone || 'professional';
      if (a.type === 'classify_request') {
        aiOutput = classifyRequest(textForAI);
      } else if (a.type === 'generate_reply') {
        aiOutput = generateReply(emailBody, { tone: tone });
      } else if (a.type === 'summarize_text') {
        aiOutput = summarizeText(textForAI);
      } else if (a.type === 'send_email') {
        aiOutput = { sent: true, to: config.to || 'recipient', template: config.template || 'default' };
      } else if (a.type === 'create_task') {
        aiOutput = { created: true, title: config.title || 'Task', priority: config.priority || 'medium' };
      } else if (a.type === 'log_expense') {
        aiOutput = { logged: true, category: config.category || 'general', amount: mockInput.amount, vendor: mockInput.vendor };
      }
      if (options.maskPII && aiOutput != null) {
        aiOutput = maskPIIInObject(aiOutput);
      }
      stepsExecuted.push({
        step: 'action',
        actionType: a.type,
        result: a.type.replace(/_/g, ' ') + ' completed',
        aiOutput: aiOutput,
      });
    });

    var durationMs = Date.now() - start;
    return {
      status: 'success',
      stepsExecuted: stepsExecuted,
      durationMs: durationMs,
    };
  }

  // --- Executive summary for case study (consulting-style, from automations + runs) ---
  function generateExecutiveSummary(data) {
    var automations = data.automations || [];
    var runs = data.runs || [];
    var settings = data.settings || {};
    var active = automations.filter(function (a) { return a.status === 'active'; }).length;
    var totalRuns = runs.length;
    var successRuns = runs.filter(function (r) { return r.status === 'success'; }).length;
    var successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 100;
    var estMins = totalRuns * 2;
    var feedbackUp = runs.filter(function (r) { return r.feedback === 'up'; }).length;
    var feedbackDown = runs.filter(function (r) { return r.feedback === 'down'; }).length;
    var flags = runs.filter(function (r) { return r.feedback === 'flag'; }).length;
    var helpfulRate = feedbackUp + feedbackDown > 0 ? Math.round((feedbackUp / (feedbackUp + feedbackDown)) * 100) : null;

    var lines = [];
    lines.push('EXECUTIVE SUMMARY — FlowForge Automation Deployment');
    lines.push('');
    lines.push('This summary reflects the current deployment state and measurable impact.');
    lines.push('');
    lines.push('Scope: ' + automations.length + ' automation(s) configured, ' + active + ' active. Total runs recorded: ' + totalRuns + ', with a ' + successRate + '% success rate. Estimated time saved: approximately ' + estMins + ' minutes.');
    if (helpfulRate != null) {
      lines.push('Quality: User feedback indicates a ' + helpfulRate + '% helpful rate on run outcomes.' + (flags > 0 ? ' ' + flags + ' run(s) have been flagged for review.' : ''));
    }
    lines.push('');
    lines.push('Governance settings: Tone ' + (settings.tone || 'professional') + ', risk level ' + (settings.riskLevel || 'low') + '. PII masking in logs: ' + (settings.maskPIIInLogs ? 'enabled' : 'disabled') + '.');
    lines.push('');
    lines.push('Recommendation: Continue monitoring success rate and flagged runs; consider expanding automations for high-volume processes.');
    return lines.join('\n');
  }

  global.FlowForgeAI = {
    suggestNextStep: suggestNextStep,
    generateReply: generateReply,
    classifyRequest: classifyRequest,
    summarizeText: summarizeText,
    getDashboardInsights: getDashboardInsights,
    simulateRun: simulateRun,
    generateExecutiveSummary: generateExecutiveSummary,
    maskPII: maskPII,
    maskPIIInObject: maskPIIInObject,
  };
})(typeof window !== 'undefined' ? window : this);
