/**
 * FlowForge – Shared UI components
 * Modals, toasts, badges, form helpers. Vanilla JS, no framework.
 */

(function (global) {
  'use strict';

  // --- Toast notifications ---
  var toastContainer = null;

  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      toastContainer.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function toast(message, type) {
    type = type || 'info';
    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', 'status');
    el.textContent = message;
    getToastContainer().appendChild(el);
    requestAnimationFrame(function () { el.classList.add('toast-visible'); });
    setTimeout(function () {
      el.classList.remove('toast-visible');
      setTimeout(function () { el.remove(); }, 300);
    }, 3000);
  }

  // --- Modal ---
  function modal(options) {
    var title = options.title || '';
    var body = options.body || '';
    var buttons = options.buttons || [{ label: 'Close', primary: false, action: function () { close(); } }];
    var onClose = options.onClose || function () {};

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-title');

    var bodyHtml = typeof body === 'string' ? body : '';
    var bodyNode = typeof body === 'object' && body.nodeType ? body : null;

    var html = '<div class="modal">';
    html += '<div class="modal-header"><h2 id="modal-title" class="modal-title">' + escapeHtml(title) + '</h2><button type="button" class="modal-close" aria-label="Close">&times;</button></div>';
    html += '<div class="modal-body">' + (bodyNode ? '' : bodyHtml) + '</div>';
    html += '<div class="modal-footer">';
    buttons.forEach(function (b) {
      var cls = b.primary ? 'btn btn-primary' : 'btn btn-secondary';
      html += '<button type="button" class="' + cls + '" data-action="' + escapeHtml(b.label) + '">' + escapeHtml(b.label) + '</button>';
    });
    html += '</div></div>';

    overlay.innerHTML = html;

    if (bodyNode) {
      var bodyContainer = overlay.querySelector('.modal-body');
      bodyContainer.appendChild(bodyNode);
    }

    function close() {
      overlay.classList.remove('modal-visible');
      setTimeout(function () {
        overlay.remove();
        onClose();
      }, 200);
    }

    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    buttons.forEach(function (b, i) {
      var btn = overlay.querySelectorAll('.modal-footer button')[i];
      if (btn) {
        btn.addEventListener('click', function () {
          if (b.action) b.action();
          else close();
        });
      }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('modal-visible'); });
    return { close: close };
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // --- Badge (status) ---
  function badge(status) {
    var map = { success: 'Success', failed: 'Failed', partial: 'Partial', active: 'Active', paused: 'Paused' };
    var label = map[status] || status;
    var el = document.createElement('span');
    el.className = 'badge badge-' + (status === 'success' || status === 'active' ? 'success' : status === 'failed' ? 'error' : 'muted');
    el.textContent = label;
    return el;
  }

  // --- Form helpers: input, select, checkbox ---
  function formField(label, name, opts) {
    opts = opts || {};
    var type = opts.type || 'text';
    var value = opts.value !== undefined ? opts.value : '';
    var placeholder = opts.placeholder || '';
    var required = opts.required ? ' required' : '';
    var options = opts.options || [];
    var wrap = document.createElement('div');
    wrap.className = 'form-group';

    if (type === 'select') {
      var select = document.createElement('select');
      select.name = name;
      select.id = 'field-' + name;
      select.innerHTML = options.map(function (o) {
        return '<option value="' + escapeHtml(o.value) + '"' + (o.value === value ? ' selected' : '') + '>' + escapeHtml(o.label) + '</option>';
      }).join('');
      wrap.innerHTML = '<label for="field-' + name + '">' + escapeHtml(label) + '</label>';
      wrap.appendChild(select);
      return wrap;
    }

    if (type === 'checkbox') {
      var checked = opts.checked ? ' checked' : '';
      wrap.innerHTML = '<label><input type="checkbox" name="' + escapeHtml(name) + '" id="field-' + name + '"' + checked + '> ' + escapeHtml(label) + '</label>';
      return wrap;
    }

    var input = document.createElement('input');
    input.type = type;
    input.name = name;
    input.id = 'field-' + name;
    input.value = value;
    if (placeholder) input.placeholder = placeholder;
    if (required) input.required = true;
    wrap.innerHTML = '<label for="field-' + name + '">' + escapeHtml(label) + '</label>';
    wrap.appendChild(input);
    return wrap;
  }

  function copyToClipboard(text) {
    if (!text) return Promise.resolve(false);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function downloadFile(filename, content, mimeType) {
    mimeType = mimeType || 'application/octet-stream';
    var blob = new Blob([content], { type: mimeType });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  // --- Command palette: search input + list of actions ---
  function commandPalette(options) {
    options = options || {};
    var title = options.title || 'Commands';
    var actions = options.actions || [];
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay palette-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', title);

    var html = '<div class="palette-modal">' +
      '<input type="text" class="palette-input" placeholder="Search commands..." id="palette-search" autocomplete="off">' +
      '<ul class="palette-list" id="palette-list"></ul>' +
      '</div>';
    overlay.innerHTML = html;

    var listEl = overlay.querySelector('#palette-list');
    var inputEl = overlay.querySelector('#palette-input');
    var filtered = actions.slice();

    function renderList() {
      var q = (inputEl.value || '').toLowerCase().trim();
      filtered = actions.filter(function (a) {
        if (!q) return true;
        var label = (a.label || '').toLowerCase();
        var kw = (a.keywords || '').toLowerCase();
        return label.indexOf(q) !== -1 || kw.indexOf(q) !== -1;
      });
      listEl.innerHTML = filtered.map(function (a, i) {
        return '<li class="palette-item" data-index="' + i + '" role="button" tabindex="0">' + escapeHtml(a.label) + '</li>';
      }).join('');
      listEl.querySelectorAll('.palette-item').forEach(function (li, i) {
        li.addEventListener('click', function () { runFiltered(i); });
        li.addEventListener('keydown', function (e) { if (e.key === 'Enter') runFiltered(i); });
      });
    }

    function runFiltered(index) {
      var a = filtered[index];
      if (a && a.action) a.action();
      close();
    }

    function close() {
      overlay.classList.remove('modal-visible');
      setTimeout(function () { overlay.remove(); }, 200);
      if (options.onClose) options.onClose();
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    inputEl.addEventListener('input', renderList);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered.length) runFiltered(0);
      }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      overlay.classList.add('modal-visible');
      inputEl.focus();
      renderList();
    });
    return { close: close };
  }

  global.FlowForgeUI = {
    toast: toast,
    modal: modal,
    badge: badge,
    formField: formField,
    escapeHtml: escapeHtml,
    copyToClipboard: copyToClipboard,
    downloadFile: downloadFile,
    commandPalette: commandPalette,
  };
})(typeof window !== 'undefined' ? window : this);
