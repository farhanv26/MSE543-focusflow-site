/**
 * FlowForge – SPA routing and page renderers
 * Hash routes: #/dashboard | #/automations | #/builder | #/builder/:id | #/runs | #/templates | #/settings
 */

(function () {
  'use strict';

  var Storage = window.FlowForgeStorage;
  var AI = window.FlowForgeAI;
  var UI = window.FlowForgeUI;

  var pageEl = document.getElementById('page');
  var routeMap = { dashboard: true, automations: true, builder: true, runs: true, templates: true, caseStudy: true, settings: true };

  // ----- Hash routing -----
  function getRoute() {
    var hash = window.location.hash.slice(1) || '/dashboard';
    if (hash.charAt(0) !== '/') hash = '/' + hash;
    var parts = hash.split('/').filter(Boolean);
    return { path: parts[0] || 'dashboard', id: parts[1] || null };
  }

  function setActiveNav(routePath) {
    document.querySelectorAll('[data-route]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === routePath);
    });
  }

  function render(content) {
    if (typeof content === 'string') {
      pageEl.innerHTML = content;
    } else {
      pageEl.innerHTML = '';
      if (content) pageEl.appendChild(content);
    }
    setActiveNav(getRoute().path);
  }

  function navigate(path) {
    window.location.hash = '#/' + path;
  }

  var DEMO_STEP3_KEY = 'flowforge_demo_step3';

  var guidedDemoSteps = [
    { route: 'dashboard', title: 'Step 1: Dashboard', description: 'Review the Quality widget (helpful rate, flags). Metrics and AI Insights are driven by your automations and runs.', highlightId: 'demo-quality-widget' },
    { route: 'case-study', title: 'Step 2: Case Study', description: 'Use "Generate Executive Summary" to produce a data-driven consulting summary. Export Client Summary for a full .txt report.', highlightId: 'case-study-generate' },
    { route: 'builder', title: 'Step 3: Builder', description: 'Email trigger is selected with a sample payload (from, subject, body). Add conditions/actions, then run "Test automation" to create a run.', highlightId: 'builder-payload-section' },
    { route: 'runs', title: 'Step 4: Runs', description: 'Open the latest run via "View details". Leave feedback (Helpful / Not helpful / Flag) and use "Export Run Report" to download the step trace.', highlightId: null },
    { route: 'settings', title: 'Step 5: Settings', description: 'Toggle "Mask PII in logs" and change Tone. Re-run a test from Builder to see masked outputs and tone in run details.', highlightId: 'demo-mask-pii-wrap' },
  ];

  function removeDemoHighlights() {
    document.querySelectorAll('.demo-highlight').forEach(function (el) { el.classList.remove('demo-highlight'); });
  }

  function applyDemoHighlight(highlightId) {
    removeDemoHighlights();
    if (highlightId) {
      var el = document.getElementById(highlightId);
      if (el) el.classList.add('demo-highlight');
    }
  }

  function openGuidedDemo(stepIndex) {
    stepIndex = stepIndex == null ? 0 : Math.max(0, Math.min(stepIndex, guidedDemoSteps.length - 1));
    var step = guidedDemoSteps[stepIndex];
    var body = document.createElement('div');
    body.className = 'guided-demo-body';
    body.innerHTML =
      '<p class="guided-demo-desc">' + UI.escapeHtml(step.description) + '</p>' +
      '<div class="guided-demo-actions">' +
      '<button type="button" class="btn btn-secondary" id="guided-demo-back">Back</button>' +
      '<button type="button" class="btn btn-primary" id="guided-demo-goto">Go to step</button>' +
      '<button type="button" class="btn btn-secondary" id="guided-demo-next">Next</button>' +
      '</div>';
    var modalInstance = UI.modal({
      title: step.title,
      body: body,
      buttons: [{ label: 'Close', primary: false }],
    });
    body.querySelector('#guided-demo-goto').addEventListener('click', function () {
      if (stepIndex === 2) try { sessionStorage.setItem(DEMO_STEP3_KEY, '1'); } catch (e) {}
      navigate(step.route);
      setTimeout(function () { applyDemoHighlight(step.highlightId); }, 100);
    });
    body.querySelector('#guided-demo-back').addEventListener('click', function () {
      modalInstance.close();
      openGuidedDemo(stepIndex - 1);
    });
    body.querySelector('#guided-demo-next').addEventListener('click', function () {
      modalInstance.close();
      if (stepIndex + 1 < guidedDemoSteps.length) openGuidedDemo(stepIndex + 1);
      else modalInstance.close();
    });
  }

  function updateDemoButton() {
    var area = document.getElementById('header-demo-area');
    if (!area) return;
    var user = Storage.getUser();
    if (user.demoMode) {
      if (!area.querySelector('.btn-guided-demo')) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary btn-guided-demo';
        btn.textContent = 'Guided Demo';
        btn.addEventListener('click', function () { openGuidedDemo(0); });
        area.appendChild(btn);
      }
    } else {
      area.innerHTML = '';
    }
  }

  // ----- Onboarding & seed -----
  function maybeShowOnboarding() {
    if (Storage.isOnboardingDone()) return;
    var body = document.createElement('div');
    body.innerHTML = '<p>Create your first automation in 60 seconds. We\'ve added 2 sample automations to get you started.</p><p>Go to <strong>Automations</strong> to see them, or <strong>Builder</strong> to create a new one. Use <strong>Templates</strong> to import ready-made workflows.</p>';
    UI.modal({
      title: 'Welcome to FlowForge',
      body: body,
      buttons: [
        { label: 'Get started', primary: true, action: function () { Storage.setOnboardingDone(); navigate('dashboard'); } },
      ],
      onClose: function () { Storage.setOnboardingDone(); },
    });
  }

  // ----- Dashboard page -----
  function renderDashboard() {
    var automations = Storage.getAutomations();
    var runs = Storage.getRuns();
    var activeCount = automations.filter(function (a) { return a.status === 'active'; }).length;
    var today = new Date().toDateString();
    var runsToday = runs.filter(function (r) { return new Date(r.timestamp).toDateString() === today; }).length;
    var successCount = runs.filter(function (r) { return r.status === 'success'; }).length;
    var successRate = runs.length ? Math.round((successCount / runs.length) * 100) : 100;
    var timeSavedEst = runs.length * 2; // 2 min per run estimate

    var insights = AI.getDashboardInsights(automations, runs);
    var insightsHtml = insights.map(function (i) {
      return '<div class="insight-card insight-' + i.type + '"><strong>' + UI.escapeHtml(i.title) + '</strong><p>' + UI.escapeHtml(i.text) + '</p></div>';
    }).join('');

    var feedbackUp = runs.filter(function (r) { return r.feedback === 'up'; }).length;
    var feedbackDown = runs.filter(function (r) { return r.feedback === 'down'; }).length;
    var flagCount = runs.filter(function (r) { return r.feedback === 'flag'; }).length;
    var helpfulRate = feedbackUp + feedbackDown > 0 ? Math.round((feedbackUp / (feedbackUp + feedbackDown)) * 100) : null;
    var qualityHtml = '<div class="quality-widget" id="demo-quality-widget">' +
      '<h3>Quality</h3>' +
      (helpfulRate != null ? '<p><strong>Helpful rate:</strong> ' + helpfulRate + '%</p>' : '') +
      (flagCount > 0 ? '<p><strong>Flagged:</strong> ' + flagCount + ' run(s)</p><p class="quality-issue">Top issue: Review flagged runs</p>' : '<p><strong>Flagged:</strong> 0</p>') +
      '</div>';

    // Simple bar chart (last 7 days run counts)
    var dayCounts = [];
    for (var d = 6; d >= 0; d--) {
      var date = new Date();
      date.setDate(date.getDate() - d);
      var dayStr = date.toDateString();
      dayCounts.push(runs.filter(function (r) { return new Date(r.timestamp).toDateString() === dayStr; }).length);
    }
    var maxRuns = Math.max(1, Math.max.apply(null, dayCounts));
    var chartBars = dayCounts.map(function (c) {
      var h = maxRuns ? Math.round((c / maxRuns) * 100) : 0;
      return '<div class="chart-bar" style="height:' + h + '%" title="' + c + ' runs"></div>';
    }).join('');

    var html =
      '<div class="page-head"><h1>Dashboard</h1></div>' +
      '<div class="dashboard-metrics">' +
      '<div class="metric-card"><span class="metric-value">' + activeCount + '</span><span class="metric-label">Active automations</span></div>' +
      '<div class="metric-card"><span class="metric-value">' + runsToday + '</span><span class="metric-label">Runs today</span></div>' +
      '<div class="metric-card"><span class="metric-value">~' + timeSavedEst + ' min</span><span class="metric-label">Time saved (est.)</span></div>' +
      '<div class="metric-card"><span class="metric-value">' + successRate + '%</span><span class="metric-label">Success rate</span></div>' +
      '</div>' +
      '<div class="dashboard-chart">' +
      '<h3>Runs in the last 7 days</h3>' +
      '<div class="chart-bars">' + chartBars + '</div>' +
      '</div>' +
      '<div class="dashboard-bottom">' +
      '<div class="dashboard-insights"><h3>AI Insights</h3><div class="insights-grid">' + insightsHtml + '</div></div>' +
      qualityHtml +
      '</div>';
    render(html);
  }

  // ----- Automations list page -----
  function renderAutomations() {
    var list = Storage.getAutomations();
    var triggerFilter = document.createElement('select');
    triggerFilter.className = 'filter-select';
    triggerFilter.innerHTML = '<option value="">All triggers</option><option value="schedule">Schedule</option><option value="email_received">Email received</option><option value="form_submitted">Form submitted</option><option value="purchase_made">Purchase made</option>';
    var searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Search automations…';
    searchInput.className = 'search-input';

    function buildList(filterTrigger, query) {
      var items = list.filter(function (a) {
        var matchTrigger = !filterTrigger || (a.trigger && a.trigger.type === filterTrigger);
        var matchQuery = !query || a.name.toLowerCase().indexOf(query.toLowerCase()) !== -1;
        return matchTrigger && matchQuery;
      });

      if (items.length === 0) {
        return '<p class="empty-state">No automations yet. <a href="#/builder">Create one</a> or <a href="#/templates">import a template</a>.</p>';
      }

      return '<ul class="automation-list">' + items.map(function (a) {
        var triggerLabel = (a.trigger && a.trigger.type) ? a.trigger.type.replace(/_/g, ' ') : '—';
        return '<li class="automation-item" data-id="' + UI.escapeHtml(a.id) + '">' +
          '<div class="automation-item-main">' +
          '<span class="automation-name">' + UI.escapeHtml(a.name) + '</span>' +
          '<span class="automation-meta">' + triggerLabel + ' · ' + (a.actions ? a.actions.length : 0) + ' action(s)</span>' +
          '</div>' +
          '<div class="automation-item-actions">' +
          '<span class="badge badge-' + (a.status === 'active' ? 'success' : 'muted') + '">' + a.status + '</span>' +
          '<button type="button" class="btn-icon" data-action="toggle" title="Toggle status">' + (a.status === 'active' ? '⏸' : '▶') + '</button>' +
          '<a href="#/builder/' + a.id + '" class="btn-icon" title="Edit">✎</a>' +
          '<button type="button" class="btn-icon" data-action="duplicate" title="Duplicate">⎘</button>' +
          '<button type="button" class="btn-icon" data-action="delete" title="Delete">×</button>' +
          '</div></li>';
      }).join('') + '</ul>';
    }

    var html =
      '<div class="page-head">' +
      '<h1>Automations</h1>' +
      '<a href="#/builder" class="btn btn-primary">+ New automation</a>' +
      '</div>' +
      '<div class="toolbar">' +
      '<input type="search" class="search-input" placeholder="Search automations…" id="automation-search">' +
      '<select class="filter-select" id="automation-trigger-filter"><option value="">All triggers</option><option value="schedule">Schedule</option><option value="email_received">Email received</option><option value="form_submitted">Form submitted</option><option value="purchase_made">Purchase made</option></select>' +
      '</div>' +
      '<div id="automation-list-container">' + buildList('', '') + '</div>';
    render(html);

    var container = document.getElementById('automation-list-container');
    var searchEl = document.getElementById('automation-search');
    var filterEl = document.getElementById('automation-trigger-filter');

    function refresh() {
      list = Storage.getAutomations();
      container.innerHTML = buildList(filterEl.value, searchEl ? searchEl.value : '');
      bindAutomationListEvents();
    }

    function bindAutomationListEvents() {
      container.querySelectorAll('.automation-item').forEach(function (li) {
        var id = li.getAttribute('data-id');
        li.querySelector('[data-action="toggle"]').addEventListener('click', function () {
          var a = Storage.getAutomation(id);
          if (a) {
            a.status = a.status === 'active' ? 'paused' : 'active';
            Storage.saveAutomation(a);
            UI.toast('Automation ' + (a.status === 'active' ? 'activated' : 'paused') + '.', 'success');
            refresh();
          }
        });
        li.querySelector('[data-action="duplicate"]').addEventListener('click', function () {
          var dup = Storage.duplicateAutomation(id);
          if (dup) {
            UI.toast('Automation duplicated.', 'success');
            refresh();
          }
        });
        li.querySelector('[data-action="delete"]').addEventListener('click', function () {
          var a = Storage.getAutomation(id);
          if (a && confirm('Delete "' + a.name + '"?')) {
            Storage.deleteAutomation(id);
            UI.toast('Automation deleted.', 'info');
            refresh();
          }
        });
      });
    }

    bindAutomationListEvents();
    if (searchEl) searchEl.addEventListener('input', function () { refresh(); });
    if (filterEl) filterEl.addEventListener('change', function () { refresh(); });
  }

  // ----- Builder page -----
  var TRIGGER_TYPES = [
    { value: 'schedule', label: 'Schedule' },
    { value: 'email_received', label: 'Email received' },
    { value: 'form_submitted', label: 'Form submitted' },
    { value: 'purchase_made', label: 'Purchase made' },
  ];
  var ACTION_TYPES = [
    { value: 'send_email', label: 'Send email' },
    { value: 'create_task', label: 'Create task' },
    { value: 'summarize_text', label: 'Summarize text' },
    { value: 'classify_request', label: 'Classify request' },
    { value: 'generate_reply', label: 'Generate reply' },
    { value: 'log_expense', label: 'Log expense' },
  ];

  function renderBuilder(id) {
    var automation = id ? Storage.getAutomation(id) : null;
    var isNew = !automation;
    if (isNew) {
      automation = {
        id: Storage.id(),
        name: 'Untitled automation',
        trigger: { type: 'email_received', config: {} },
        conditions: [],
        actions: [],
        status: 'paused',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    var name = automation.name;
    var trigger = automation.trigger || { type: 'email_received', config: {} };
    var conditions = (automation.conditions || []).slice();
    var actions = (automation.actions || []).slice();
    var testPayload = automation.testPayload || {};

    function conditionRow(c, i) {
      c = c || {};
      var field = c.field || 'subject_contains';
      var op = c.operator || 'contains';
      return '<div class="builder-step-row" data-step="condition" data-index="' + i + '">' +
        '<select class="builder-field" data-name="field">' +
        ['subject_contains', 'from_domain', 'has_attachment', 'weekday'].map(function (f) {
          return '<option value="' + f + '"' + (field === f ? ' selected' : '') + '>' + f.replace(/_/g, ' ') + '</option>';
        }).join('') + '</select>' +
        ' <select class="builder-operator" data-name="operator">' +
        ['equals', 'contains', 'not_equals'].map(function (o) {
          return '<option value="' + o + '"' + (op === o ? ' selected' : '') + '>' + o + '</option>';
        }).join('') + '</select>' +
        ' <input type="text" class="builder-value" data-name="value" value="' + UI.escapeHtml(c.value || '') + '" placeholder="value">' +
        ' <button type="button" class="btn-icon" data-remove="condition" title="Remove">×</button></div>';
    }

    function actionRow(a, i) {
      return '<div class="builder-step-row" data-step="action" data-index="' + i + '">' +
        '<select class="builder-action-type" data-name="type">' +
        ACTION_TYPES.map(function (t) { return '<option value="' + t.value + '"' + (a.type === t.value ? ' selected' : '') + '>' + t.label + '</option>'; }).join('') +
        '</select>' +
        ' <input type="text" class="builder-action-config" data-name="config" value="' + UI.escapeHtml(JSON.stringify(a.config || {})) + '" placeholder="config JSON">' +
        ' <button type="button" class="btn-icon" data-remove="action" title="Remove">×</button></div>';
    }

    function payloadSection() {
      var t = trigger.type;
      if (t === 'schedule') {
        return '<div class="form-group"><label>Date / time</label><input type="datetime-local" id="payload-dateTime" value="' + (testPayload.dateTime || '') + '"></div>' +
          '<div class="form-group"><label>Timezone</label><input type="text" id="payload-timezone" placeholder="e.g. America/New_York" value="' + UI.escapeHtml(testPayload.timezone || '') + '"></div>';
      }
      if (t === 'email_received') {
        return '<div class="form-group"><label>From</label><input type="text" id="payload-from" placeholder="sender@example.com" value="' + UI.escapeHtml(testPayload.from || '') + '"></div>' +
          '<div class="form-group"><label>Subject</label><input type="text" id="payload-subject" placeholder="Subject line" value="' + UI.escapeHtml(testPayload.subject || '') + '"></div>' +
          '<div class="form-group"><label>Body</label><textarea id="payload-body" rows="4" placeholder="Email body...">' + UI.escapeHtml(testPayload.body || testPayload.emailBody || '') + '</textarea></div>';
      }
      if (t === 'form_submitted') {
        return '<div class="form-group"><label>Form name</label><input type="text" id="payload-formName" placeholder="Contact form" value="' + UI.escapeHtml(testPayload.formName || '') + '"></div>' +
          '<div class="form-group"><label>Responses (JSON)</label><textarea id="payload-responses" rows="4" placeholder="{&quot;email&quot;:&quot;...&quot;,&quot;message&quot;:&quot;...&quot;}">' + UI.escapeHtml(typeof testPayload.responses === 'string' ? testPayload.responses : JSON.stringify(testPayload.responses || {}, null, 2)) + '</textarea></div>';
      }
      if (t === 'purchase_made') {
        return '<div class="form-group"><label>Vendor</label><input type="text" id="payload-vendor" value="' + UI.escapeHtml(testPayload.vendor || '') + '"></div>' +
          '<div class="form-group"><label>Amount</label><input type="text" id="payload-amount" placeholder="99.00" value="' + UI.escapeHtml(testPayload.amount || '') + '"></div>' +
          '<div class="form-group"><label>Items (comma separated)</label><input type="text" id="payload-items" placeholder="item1, item2" value="' + UI.escapeHtml(Array.isArray(testPayload.items) ? testPayload.items.join(', ') : (testPayload.items || '')) + '"></div>' +
          '<div class="form-group"><label>Notes</label><input type="text" id="payload-notes" value="' + UI.escapeHtml(testPayload.notes || '') + '"></div>';
      }
      return '<p class="text-muted">No payload fields for this trigger.</p>';
    }

    var html =
      '<div class="page-head">' +
      '<h1>' + (isNew ? 'New automation' : 'Edit automation') + '</h1>' +
      '<div class="page-actions"><button type="button" class="btn btn-secondary" id="builder-export-json">Export Automation JSON</button>' +
      '<button type="button" class="btn btn-secondary" id="builder-test">Test automation</button>' +
      '<button type="button" class="btn btn-primary" id="builder-save">Save</button></div></div>' +
      '<div class="builder-form">' +
      '<div class="form-group"><label>Name</label><input type="text" id="builder-name" value="' + UI.escapeHtml(name) + '" placeholder="Automation name"></div>' +
      '<div class="builder-section"><h3>1. Trigger</h3>' +
      '<select id="builder-trigger">' + TRIGGER_TYPES.map(function (t) { return '<option value="' + t.value + '"' + (trigger.type === t.value ? ' selected' : '') + '>' + t.label + '</option>'; }).join('') + '</select></div>' +
      '<div class="builder-section"><h3>2. Conditions</h3><div id="builder-conditions">' + conditions.map(conditionRow).join('') + '</div>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="builder-add-condition">+ Add condition</button> ' +
      '<button type="button" class="btn btn-secondary btn-sm" id="builder-suggest-step">Suggest next step (AI)</button></div>' +
      '<div class="builder-section"><h3>3. Actions</h3><div id="builder-actions">' + actions.map(actionRow).join('') + '</div>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="builder-add-action">+ Add action</button></div>' +
      '<div class="builder-section" id="builder-payload-section"><h3>Test Input (Payload)</h3><div id="builder-payload-fields">' + payloadSection() + '</div></div>' +
      '</div>';

    render(html);

    var nameEl = document.getElementById('builder-name');
    var triggerEl = document.getElementById('builder-trigger');
    var conditionsContainer = document.getElementById('builder-conditions');
    var actionsContainer = document.getElementById('builder-actions');
    var payloadContainer = document.getElementById('builder-payload-fields');

    function getTestPayload() {
      var t = triggerEl.value;
      var p = {};
      if (t === 'schedule') {
        var dt = document.getElementById('payload-dateTime');
        var tz = document.getElementById('payload-timezone');
        if (dt) p.dateTime = dt.value;
        if (tz) p.timezone = tz.value;
      } else if (t === 'email_received') {
        var from = document.getElementById('payload-from');
        var subj = document.getElementById('payload-subject');
        var body = document.getElementById('payload-body');
        if (from) p.from = from.value;
        if (subj) p.subject = subj.value;
        if (body) { p.body = p.emailBody = p.text = body.value; }
      } else if (t === 'form_submitted') {
        var fn = document.getElementById('payload-formName');
        var resp = document.getElementById('payload-responses');
        if (fn) p.formName = fn.value;
        if (resp) {
          try { p.responses = JSON.parse(resp.value); } catch (e) { p.responses = resp.value; }
        }
      } else if (t === 'purchase_made') {
        var v = document.getElementById('payload-vendor');
        var amt = document.getElementById('payload-amount');
        var items = document.getElementById('payload-items');
        var notes = document.getElementById('payload-notes');
        if (v) p.vendor = v.value;
        if (amt) p.amount = amt.value;
        if (items) p.items = items.value ? items.value.split(',').map(function (s) { return s.trim(); }) : [];
        if (notes) p.notes = notes.value;
        p.text = [p.vendor, p.amount, (p.items || []).join(' '), p.notes].filter(Boolean).join(' ');
      }
      return p;
    }

    function getConditions() {
      var out = [];
      conditionsContainer.querySelectorAll('[data-step="condition"]').forEach(function (row, i) {
        var field = row.querySelector('[data-name="field"]');
        var op = row.querySelector('[data-name="operator"]');
        var val = row.querySelector('[data-name="value"]');
        out.push({ id: (conditions[i] && conditions[i].id) || Storage.id(), field: field ? field.value : 'subject_contains', operator: op ? op.value : 'contains', value: val ? val.value : '' });
      });
      return out;
    }

    function getActions() {
      var out = [];
      actionsContainer.querySelectorAll('[data-step="action"]').forEach(function (row, i) {
        var typeSel = row.querySelector('[data-name="type"]');
        var configIn = row.querySelector('[data-name="config"]');
        var type = typeSel ? typeSel.value : 'generate_reply';
        var config = {};
        try { if (configIn && configIn.value) config = JSON.parse(configIn.value); } catch (e) {}
        out.push({ id: (actions[i] && actions[i].id) || Storage.id(), type: type, config: config });
      });
      return out;
    }

    function addCondition(c) {
      c = c || { id: Storage.id(), field: 'subject_contains', operator: 'contains', value: '' };
      conditions.push(c);
      conditionsContainer.insertAdjacentHTML('beforeend', conditionRow(c, conditions.length - 1));
    }

    function addAction(a) {
      a = a || { id: Storage.id(), type: 'generate_reply', config: {} };
      actions.push(a);
      actionsContainer.insertAdjacentHTML('beforeend', actionRow(a, actions.length - 1));
    }

    document.getElementById('builder-add-condition').addEventListener('click', function () { addCondition(); });
    document.getElementById('builder-add-action').addEventListener('click', function () {
      addAction({ id: Storage.id(), type: 'generate_reply', config: { tone: 'professional' } });
    });

    document.getElementById('builder-suggest-step').addEventListener('click', function () {
      var suggestion = AI.suggestNextStep(triggerEl.value, getConditions(), getActions());
      if (suggestion.type === 'condition') {
        addCondition({
          id: Storage.id(),
          field: suggestion.field || 'subject_contains',
          operator: suggestion.operator || 'contains',
          value: suggestion.value || '',
        });
        UI.toast('Added suggested condition: ' + (suggestion.label || 'condition'), 'success');
      } else {
        addAction({
          id: Storage.id(),
          type: suggestion.typeId || 'generate_reply',
          config: suggestion.config || {},
        });
        UI.toast('Added suggested action: ' + (suggestion.label || 'action'), 'success');
      }
    });

    conditionsContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-remove="condition"]');
      if (btn) {
        var row = btn.closest('[data-step="condition"]');
        if (row) row.remove();
      }
    });
    actionsContainer.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-remove="action"]');
      if (btn) {
        var row = btn.closest('[data-step="action"]');
        if (row) row.remove();
      }
    });

    triggerEl.addEventListener('change', function () {
      trigger.type = triggerEl.value;
      testPayload = {};
      if (payloadContainer) payloadContainer.innerHTML = payloadSection();
    });

    try {
      if (sessionStorage.getItem(DEMO_STEP3_KEY)) {
        sessionStorage.removeItem(DEMO_STEP3_KEY);
        triggerEl.value = 'email_received';
        trigger.type = 'email_received';
        if (payloadContainer) payloadContainer.innerHTML = payloadSection();
        setTimeout(function () {
          var fromEl = document.getElementById('payload-from');
          var subjEl = document.getElementById('payload-subject');
          var bodyEl = document.getElementById('payload-body');
          if (fromEl) fromEl.value = 'support@customer.com';
          if (subjEl) subjEl.value = 'Billing inquiry – refund request';
          if (bodyEl) bodyEl.value = 'Hi, I need help with a refund for my last invoice. Order #8842. Can you process this by end of week? Thanks.';
        }, 0);
      }
    } catch (e) {}

    document.getElementById('builder-save').addEventListener('click', function () {
      automation.name = nameEl.value.trim() || 'Untitled automation';
      automation.trigger = { type: triggerEl.value, config: {} };
      automation.conditions = getConditions();
      automation.actions = getActions();
      automation.testPayload = getTestPayload();
      automation.updatedAt = new Date().toISOString();
      Storage.saveAutomation(automation);
      UI.toast('Automation saved.', 'success');
      navigate('automations');
    });

    document.getElementById('builder-export-json').addEventListener('click', function () {
      automation.name = nameEl.value.trim() || 'Untitled automation';
      automation.trigger = { type: triggerEl.value, config: {} };
      automation.conditions = getConditions();
      automation.actions = getActions();
      automation.testPayload = getTestPayload();
      var json = JSON.stringify(automation, null, 2);
      UI.downloadFile('automation.json', json, 'application/json');
      UI.toast('Automation exported.', 'success');
    });

    document.getElementById('builder-test').addEventListener('click', function () {
      automation.name = nameEl.value.trim() || 'Untitled automation';
      automation.trigger = { type: triggerEl.value, config: {} };
      automation.conditions = getConditions();
      automation.actions = getActions();
      var user = Storage.getUser();
      var payload = getTestPayload();
      var options = { tone: user.tone, riskLevel: user.riskLevel, maskPII: user.maskPIIInLogs };
      var result = AI.simulateRun(automation, payload, options);
      var runRecord = {
        automationId: automation.id,
        automationName: automation.name,
        status: result.status,
        stepsExecuted: result.stepsExecuted,
        durationMs: result.durationMs,
      };
      if (user.maskPIIInLogs && runRecord.stepsExecuted) {
        runRecord.stepsExecuted = runRecord.stepsExecuted.map(function (s) {
          if (s.aiOutput) s.aiOutput = AI.maskPIIInObject(s.aiOutput);
          return s;
        });
      }
      Storage.addRun(runRecord);
      UI.toast('Test run completed. View in Runs.', 'success');
      navigate('runs');
    });
  }

  // ----- Runs page -----
  function renderRuns() {
    var runs = Storage.getRuns();

    var html =
      '<div class="page-head"><h1>Runs</h1><p class="page-desc">Activity log of automation executions.</p></div>' +
      '<div class="runs-table-wrap">' +
      '<table class="runs-table"><thead><tr><th>Status</th><th>Automation</th><th>Time</th><th>Duration</th><th></th></tr></thead><tbody>' +
      (runs.length === 0 ? '<tr><td colspan="5" class="empty-cell">No runs yet. Run an automation from the Builder (Test automation).</td></tr>' :
        runs.map(function (r) {
          var time = r.timestamp ? new Date(r.timestamp).toLocaleString() : '—';
          var badgeClass = r.status === 'success' || r.status === 'active' ? 'success' : r.status === 'failed' ? 'error' : 'muted';
          return '<tr data-run-id="' + UI.escapeHtml(r.runId) + '">' +
            '<td><span class="badge badge-' + badgeClass + '">' + (r.status || '—') + '</span></td>' +
            '<td>' + UI.escapeHtml(r.automationName || '—') + '</td>' +
            '<td>' + time + '</td>' +
            '<td>' + (r.durationMs != null ? r.durationMs + ' ms' : '—') + '</td>' +
            '<td><button type="button" class="btn btn-sm btn-secondary btn-view-run">View details</button></td></tr>';
        }).join('')) +
      '</tbody></table></div>';

    render(html);

    document.querySelectorAll('.btn-view-run').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('tr');
        var runId = row.getAttribute('data-run-id');
        var run = runs.find(function (r) { return r.runId === runId; });
        if (!run) return;
        var stepsHtml = (run.stepsExecuted || []).map(function (s) {
          var ai = s.aiOutput ? '<pre class="run-detail-ai">' + UI.escapeHtml(JSON.stringify(s.aiOutput, null, 2)) + '</pre>' : '';
          return '<div class="run-detail-step"><strong>' + UI.escapeHtml(s.step) + '</strong>: ' + UI.escapeHtml(s.result) + ai + '</div>';
        }).join('');
        var body = document.createElement('div');
        body.className = 'run-detail-body';
        body.innerHTML =
          '<p><strong>Automation:</strong> ' + UI.escapeHtml(run.automationName || '—') + '</p>' +
          '<p><strong>Status:</strong> ' + run.status + ' · <strong>Duration:</strong> ' + (run.durationMs != null ? run.durationMs + ' ms' : '—') + '</p>' +
          '<div class="run-detail-feedback"><span>Feedback:</span> ' +
          '<button type="button" class="btn btn-sm btn-feedback" data-fb="up" title="Helpful">👍 Helpful</button> ' +
          '<button type="button" class="btn btn-sm btn-feedback" data-fb="down" title="Not helpful">👎 Not helpful</button> ' +
          '<button type="button" class="btn btn-sm btn-feedback" data-fb="flag" title="Flag">Flag</button>' +
          (run.feedback ? ' <span class="feedback-set">(' + (run.feedback === 'up' ? 'Helpful' : run.feedback === 'down' ? 'Not helpful' : 'Flagged') + ')</span>' : '') +
          '</div>' +
          '<h4>Step trace</h4><div class="run-detail-steps">' + stepsHtml + '</div>' +
          '<div class="run-detail-export"><button type="button" class="btn btn-secondary btn-sm" id="run-export-report">Export Run Report</button></div>';
        var modalInstance = UI.modal({
          title: 'Run details',
          body: body,
          buttons: [{ label: 'Close', primary: false }],
        });
        body.querySelectorAll('.btn-feedback').forEach(function (fb) {
          fb.addEventListener('click', function () {
            var feedback = fb.getAttribute('data-fb');
            Storage.updateRunFeedback(runId, feedback);
            UI.toast('Feedback recorded.', 'success');
            modalInstance.close();
            renderRuns();
          });
        });
        body.querySelector('#run-export-report').addEventListener('click', function () {
          var lines = [];
          lines.push('FlowForge Run Report');
          lines.push('==================');
          lines.push('Automation: ' + (run.automationName || '—'));
          lines.push('Timestamp: ' + (run.timestamp || '—'));
          lines.push('Status: ' + (run.status || '—'));
          lines.push('Duration: ' + (run.durationMs != null ? run.durationMs + ' ms' : '—'));
          lines.push('');
          lines.push('Step trace:');
          (run.stepsExecuted || []).forEach(function (s) {
            lines.push('  - ' + s.step + ': ' + s.result);
            if (s.aiOutput) lines.push('    AI: ' + JSON.stringify(s.aiOutput));
          });
          var txt = lines.join('\n');
          UI.downloadFile('run-report-' + (run.runId || 'run') + '.txt', txt, 'text/plain');
          UI.toast('Report downloaded.', 'success');
        });
      });
    });
  }

  // ----- Case Study page (consulting-ready) -----
  function renderCaseStudy() {
    var automations = Storage.getAutomations();
    var runs = Storage.getRuns();
    var activeCount = automations.filter(function (a) { return a.status === 'active'; }).length;
    var totalRuns = runs.length;
    var successCount = runs.filter(function (r) { return r.status === 'success'; }).length;
    var successRate = totalRuns ? Math.round((successCount / totalRuns) * 100) : 100;
    var estMins = totalRuns * 2;

    var html =
      '<div class="page-head">' +
      '<h1>Case Study</h1>' +
      '<p class="page-desc">Client-ready overview of FlowForge deployment. Use "Generate Executive Summary" to produce a data-driven summary.</p>' +
      '<div class="case-study-buttons">' +
      '<button type="button" class="btn btn-primary" id="case-study-generate">Generate Executive Summary</button>' +
      '<button type="button" class="btn btn-secondary" id="case-study-export-client">Export Client Summary (.txt)</button>' +
      '</div>' +
      '</div>' +
      '<div class="case-study-content">' +
      '<section class="case-study-section"><h2>Problem</h2><p>Manual, repetitive workflows (scheduling, email triage, expense logging, support routing) consume time and introduce inconsistency. Scaling requires either more headcount or automation with clear governance.</p></section>' +
      '<section class="case-study-section"><h2>Solution</h2><p>FlowForge provides AI-assisted workflow automation: triggers (schedule, email, form, purchase) drive configurable conditions and actions. Built-in AI supports classification, summarization, reply generation, and task/expense logging. All runs are logged for audit and quality feedback.</p></section>' +
      '<section class="case-study-section"><h2>Architecture</h2><p><strong>Pipeline:</strong> Trigger → Conditions → Actions. <strong>Storage:</strong> Automations and run history persist in browser localStorage (demo); production would use a backend. <strong>AI layer:</strong> Simulated AI in ai.js for suggestions, classify, summarize, generate reply; tone and risk level from settings influence outputs. <strong>Audit:</strong> Every run records timestamp, status, step trace, and optional AI outputs (with PII masking when enabled).</p></section>' +
      '<section class="case-study-section"><h2>Impact</h2><p>Measured from current data: <strong>' + activeCount + '</strong> active automation(s), <strong>' + totalRuns + '</strong> run(s), <strong>' + successRate + '%</strong> success rate, ~<strong>' + estMins + '</strong> minutes saved (est. 2 min/run).</p></section>' +
      '<section class="case-study-section"><h2>Governance &amp; Risk</h2><p><strong>Privacy / PII:</strong> Optional mask for emails and phone numbers in run logs. <strong>Human-in-the-loop:</strong> Automations can be Paused; feedback (Helpful / Not helpful / Flag) on runs informs quality. <strong>Monitoring:</strong> Dashboard shows success rate, runs today, and quality widget (helpful rate, flags). <strong>Auditability:</strong> Full step trace and AI outputs per run; export run report for compliance.</p></section>' +
      '<section class="case-study-section"><h2>Rollout Plan</h2><p><strong>30 days:</strong> Pilot 2–3 automations (e.g. support triage, meeting follow-up); validate success rate and feedback. <strong>60 days:</strong> Expand to expense and scheduling; enable PII masking where required. <strong>90 days:</strong> Full rollout; review flagged runs and tune conditions/actions; export artifacts for stakeholder reporting.</p></section>' +
      '</div>';
    render(html);

    document.getElementById('case-study-generate').addEventListener('click', function () {
      var summary = AI.generateExecutiveSummary({
        automations: Storage.getAutomations(),
        runs: Storage.getRuns(),
        settings: Storage.getUser(),
      });
      var body = document.createElement('div');
      body.className = 'exec-summary-modal';
      body.innerHTML = '<pre class="exec-summary-text">' + UI.escapeHtml(summary) + '</pre><button type="button" class="btn btn-secondary" id="exec-summary-copy">Copy to clipboard</button>';
      var modalInstance = UI.modal({
        title: 'Executive Summary',
        body: body,
        buttons: [{ label: 'Close', primary: false }],
      });
      document.getElementById('exec-summary-copy').addEventListener('click', function () {
        UI.copyToClipboard(summary).then(function (ok) {
          UI.toast(ok ? 'Copied to clipboard.' : 'Copy failed.', ok ? 'success' : 'warning');
        });
      });
    });

    document.getElementById('case-study-export-client').addEventListener('click', function () {
      var automations = Storage.getAutomations();
      var runs = Storage.getRuns();
      var user = Storage.getUser();
      var activeCount = automations.filter(function (a) { return a.status === 'active'; }).length;
      var totalRuns = runs.length;
      var successCount = runs.filter(function (r) { return r.status === 'success'; }).length;
      var successRate = totalRuns ? Math.round((successCount / totalRuns) * 100) : 100;
      var estMins = totalRuns * 2;
      var feedbackUp = runs.filter(function (r) { return r.feedback === 'up'; }).length;
      var feedbackDown = runs.filter(function (r) { return r.feedback === 'down'; }).length;
      var flagCount = runs.filter(function (r) { return r.feedback === 'flag'; }).length;
      var helpfulRate = feedbackUp + feedbackDown > 0 ? Math.round((feedbackUp / (feedbackUp + feedbackDown)) * 100) : null;
      var summary = AI.generateExecutiveSummary({ automations: automations, runs: runs, settings: user });
      var lines = [];
      lines.push('FLOWFORGE CLIENT SUMMARY');
      lines.push('=======================');
      lines.push('');
      lines.push(summary);
      lines.push('');
      lines.push('KEY METRICS');
      lines.push('-----------');
      lines.push('Active automations: ' + activeCount);
      lines.push('Total runs: ' + totalRuns);
      lines.push('Success rate: ' + successRate + '%');
      lines.push('Estimated minutes saved: ~' + estMins);
      lines.push('Helpful rate: ' + (helpfulRate != null ? helpfulRate + '%' : 'N/A'));
      lines.push('Flagged runs: ' + flagCount);
      lines.push('');
      lines.push('GOVERNANCE SETTINGS');
      lines.push('-------------------');
      lines.push('Tone: ' + (user.tone || 'professional'));
      lines.push('Risk level: ' + (user.riskLevel || 'low'));
      lines.push('Mask PII in logs: ' + (user.maskPIIInLogs ? 'yes' : 'no'));
      lines.push('Demo mode: ' + (user.demoMode ? 'on' : 'off'));
      var txt = lines.join('\n');
      UI.downloadFile('flowforge-client-summary.txt', txt, 'text/plain');
      UI.toast('Client summary downloaded.', 'success');
    });
  }

  // ----- Templates page -----
  function renderTemplates() {
    var templates = Storage.getTemplates();
    var html =
      '<div class="page-head"><h1>Templates</h1><p class="page-desc">One-click import. Automations are added as Paused so you can edit before enabling.</p></div>' +
      '<div class="templates-grid">' +
      templates.map(function (t) {
        return '<div class="template-card">' +
          '<h3>' + UI.escapeHtml(t.name) + '</h3>' +
          '<p>' + UI.escapeHtml(t.description) + '</p>' +
          '<button type="button" class="btn btn-primary btn-import-template" data-id="' + UI.escapeHtml(t.id) + '">Import</button>' +
          '</div>';
      }).join('') +
      '</div>';
    render(html);

    document.querySelectorAll('.btn-import-template').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var automation = Storage.importTemplate(id);
        if (automation) {
          UI.toast('Template imported. Edit it in Automations or Builder.', 'success');
          navigate('automations');
        }
      });
    });
  }

  // ----- Settings page -----
  function renderSettings() {
    var user = Storage.getUser();
    var html =
      '<div class="page-head"><h1>Settings</h1></div>' +
      '<div class="settings-section">' +
      '<h3>Profile</h3>' +
      '<div class="form-group"><label>Name</label><input type="text" id="settings-name" value="' + UI.escapeHtml(user.name || '') + '"></div>' +
      '<div class="form-group"><label>Email</label><input type="email" id="settings-email" value="' + UI.escapeHtml(user.email || '') + '"></div>' +
      '</div>' +
      '<div class="settings-section">' +
      '<h3>Preferences</h3>' +
      '<label class="setting-toggle"><input type="checkbox" id="settings-notifications"' + (user.notifications ? ' checked' : '') + '> Notifications</label>' +
      '<label class="setting-toggle"><input type="checkbox" id="settings-privacy"' + (user.privacyShareAnalytics ? ' checked' : '') + '> Share analytics (anonymous)</label>' +
      '</div>' +
      '<div class="settings-section">' +
      '<h3>Governance</h3>' +
      '<div class="form-group"><label>Tone</label><select id="settings-tone"><option value="professional"' + (user.tone === 'professional' ? ' selected' : '') + '>Professional</option><option value="friendly"' + (user.tone === 'friendly' ? ' selected' : '') + '>Friendly</option><option value="direct"' + (user.tone === 'direct' ? ' selected' : '') + '>Direct</option></select></div>' +
      '<div class="form-group"><label>Risk level</label><select id="settings-riskLevel"><option value="low"' + (user.riskLevel === 'low' ? ' selected' : '') + '>Low</option><option value="medium"' + (user.riskLevel === 'medium' ? ' selected' : '') + '>Medium</option><option value="high"' + (user.riskLevel === 'high' ? ' selected' : '') + '>High</option></select></div>' +
      '<div id="demo-mask-pii-wrap"><label class="setting-toggle"><input type="checkbox" id="settings-maskPII"' + (user.maskPIIInLogs ? ' checked' : '') + '> Mask PII in logs</label></div>' +
      '<p class="setting-hint">Tone and risk level influence AI outputs. When Mask PII is on, emails and phone numbers in run logs are redacted.</p>' +
      '</div>' +
      '<div class="settings-section">' +
      '<h3>Demo</h3>' +
      '<label class="setting-toggle"><input type="checkbox" id="settings-demoMode"' + (user.demoMode ? ' checked' : '') + '> Demo Mode</label>' +
      '<p class="setting-hint">When on, shows a "Guided Demo" button in the header for a step-by-step walkthrough.</p>' +
      '<button type="button" class="btn btn-secondary" id="settings-reset">Reset demo data</button>' +
      '<p class="setting-hint">Clears all automations and runs, then reseeds 2 sample automations.</p>' +
      '</div>';
    render(html);

    document.getElementById('settings-reset').addEventListener('click', function () {
      if (confirm('Reset all automations and runs? You will get 2 sample automations again.')) {
        Storage.resetDemoData();
        UI.toast('Demo data reset.', 'success');
        navigate('dashboard');
      }
    });

    function saveUser() {
      user.name = document.getElementById('settings-name').value.trim() || user.name;
      user.email = document.getElementById('settings-email').value.trim() || user.email;
      user.notifications = document.getElementById('settings-notifications').checked;
      user.privacyShareAnalytics = document.getElementById('settings-privacy').checked;
      var toneEl = document.getElementById('settings-tone');
      var riskEl = document.getElementById('settings-riskLevel');
      var maskEl = document.getElementById('settings-maskPII');
      var demoEl = document.getElementById('settings-demoMode');
      if (toneEl) user.tone = toneEl.value;
      if (riskEl) user.riskLevel = riskEl.value;
      if (maskEl) user.maskPIIInLogs = maskEl.checked;
      if (demoEl) user.demoMode = demoEl.checked;
      Storage.saveUser(user);
      updateDemoButton();
      UI.toast('Settings saved.', 'success');
    }

    document.getElementById('settings-name').addEventListener('blur', saveUser);
    document.getElementById('settings-email').addEventListener('blur', saveUser);
    document.getElementById('settings-notifications').addEventListener('change', saveUser);
    document.getElementById('settings-privacy').addEventListener('change', saveUser);
    var toneEl = document.getElementById('settings-tone');
    var riskEl = document.getElementById('settings-riskLevel');
    var maskEl = document.getElementById('settings-maskPII');
    var demoEl = document.getElementById('settings-demoMode');
    if (toneEl) toneEl.addEventListener('change', saveUser);
    if (riskEl) riskEl.addEventListener('change', saveUser);
    if (maskEl) maskEl.addEventListener('change', saveUser);
    if (demoEl) demoEl.addEventListener('change', saveUser);
  }

  // ----- Route dispatcher -----
  function dispatch() {
    var route = getRoute();
    if (route.path === 'dashboard') renderDashboard();
    else if (route.path === 'automations') renderAutomations();
    else if (route.path === 'builder') renderBuilder(route.id);
    else if (route.path === 'runs') renderRuns();
    else if (route.path === 'templates') renderTemplates();
    else if (route.path === 'case-study') renderCaseStudy();
    else if (route.path === 'settings') renderSettings();
    else renderDashboard();
    updateDemoButton();
  }

  function openCommandPalette() {
    var user = Storage.getUser();
    UI.commandPalette({
      title: 'Commands',
      actions: [
        { label: 'Go Dashboard', keywords: 'dashboard home', action: function () { navigate('dashboard'); } },
        { label: 'Go Automations', keywords: 'automations list', action: function () { navigate('automations'); } },
        { label: 'Go Builder', keywords: 'builder create', action: function () { navigate('builder'); } },
        { label: 'Go Runs', keywords: 'runs activity log', action: function () { navigate('runs'); } },
        { label: 'Go Case Study', keywords: 'case study', action: function () { navigate('case-study'); } },
        { label: 'Import Template', keywords: 'templates import', action: function () { navigate('templates'); } },
        { label: 'Toggle Mask PII', keywords: 'pii mask privacy', action: function () {
          user.maskPIIInLogs = !user.maskPIIInLogs;
          Storage.saveUser(user);
          UI.toast('Mask PII ' + (user.maskPIIInLogs ? 'on' : 'off') + '.', 'info');
        } },
        { label: 'Toggle Demo Mode', keywords: 'demo guided walkthrough', action: function () {
          user.demoMode = !user.demoMode;
          Storage.saveUser(user);
          updateDemoButton();
          UI.toast('Demo mode ' + (user.demoMode ? 'on' : 'off') + '.', 'info');
        } },
      ],
    });
  }

  // ----- Init -----
  function init() {
    Storage.seedIfEmpty();
    window.addEventListener('hashchange', dispatch);
    dispatch();
    updateDemoButton();
    setTimeout(maybeShowOnboarding, 300);

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
    });

    document.querySelector('.menu-toggle').addEventListener('click', function () {
      var nav = document.querySelector('.app-nav');
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      nav.classList.toggle('open');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
