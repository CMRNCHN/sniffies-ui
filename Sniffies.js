// ==UserScript==
// @name         Sniffies Intent Bar v3 (Clean)
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  Stable quick message + navigation bar for Sniffies
// @match        https://sniffies.com/*
// @match        https://www.sniffies.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
'use strict';

/* ---------------- STORAGE ---------------- */

const STORAGE_KEY = 'sniffies-intent-bar-v3';

const DEFAULT_STATE = {
  quickMessages: [
    { id: '1', label: 'Sup', text: 'Sup?' },
    { id: '2', label: 'Wyd', text: 'Wyd?' },
    { id: '3', label: 'Into', text: 'Into what?' },
    { id: '4', label: 'Host', text: 'Top here.' },
    { id: '5', label: 'Looking', text: 'Where at?' },
  ]
};

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ---------------- DOM ---------------- */

function getInput() {
  return document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
}

function getSendButton() {
  return [...document.querySelectorAll('button')]
    .find(b => (b.textContent || '').toLowerCase().includes('send'));
}

function setInputValue(el, value) {
  if (!el) return;

  if (el.isContentEditable) {
    el.textContent = value;
  } else {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set;

    setter?.call(el, value);
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ---------------- STATE ---------------- */

function getView() {
  const p = location.pathname;

  if (/\/chats\/[^/]+/.test(p)) return 'CHAT';
  if (p === '/chats') return 'CHATS';
  return 'MAP';
}

/* ---------------- ACTIONS ---------------- */

function sendMessage(text) {
  const input = getInput();
  const btn = getSendButton();

  if (!input || !btn) return false;

  setInputValue(input, text);
  btn.click();
  return true;
}

function go(path) {
  window.location.href = window.location.origin + path;
}

/* ---------------- UI HELPERS ---------------- */

function btn(label, onClick, style = {}) {
  const b = document.createElement('button');
  b.textContent = label;

  Object.assign(b.style, {
    fontSize: '12px',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #333',
    background: '#111',
    color: '#fff',
    cursor: 'pointer',
    ...style
  });

  b.onclick = onClick;
  return b;
}

function divider() {
  const d = document.createElement('div');
  d.style.width = '1px';
  d.style.height = '18px';
  d.style.background = '#333';
  return d;
}

/* ---------------- BAR ---------------- */

const BAR_ID = 'sniffies-bar-v3';

function render() {
  let bar = document.getElementById(BAR_ID);

  if (!bar) {
    bar = document.createElement('div');
    bar.id = BAR_ID;

    Object.assign(bar.style, {
      position: 'fixed',
      bottom: '0',
      left: '0',
      width: '100%',
      background: '#0b0b0b',
      borderTop: '1px solid #222',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 999999
    });

    document.body.appendChild(bar);
  }

  bar.innerHTML = '';

  const state = loadState();
  const view = getView();

  /* QUICK MESSAGES */
  const row1 = document.createElement('div');
  row1.style.cssText = 'display:flex;gap:6px;padding:8px;overflow-x:auto;';

  if (view === 'CHAT') {
    state.quickMessages.forEach(m => {
      row1.appendChild(
        btn(m.label, () => sendMessage(m.text))
      );
    });
  }

  /* NAV */
  const row2 = document.createElement('div');
  row2.style.cssText = 'display:flex;gap:8px;padding:8px;border-top:1px solid #222;';

  if (view === 'MAP') {
    row2.appendChild(btn('Chats', () => go('/chats')));
  }

  if (view === 'CHATS') {
    row2.appendChild(btn('Map', () => go('/')));
    row2.appendChild(btn('Back', () => history.back()));
  }

  if (view === 'CHAT') {
    row2.appendChild(btn('Map', () => go('/')));
    row2.appendChild(btn('Back', () => history.back()));
    row2.appendChild(btn('Send', () => {
      const input = getInput();
      if (input?.value?.trim()) sendMessage(input.value);
    }, { background: '#1a3a5c' }));
  }

  bar.appendChild(row1);
  bar.appendChild(row2);
}

/* ---------------- BOOT ---------------- */

function boot() {
  render();
  setInterval(render, 1000);
}

if (document.body) boot();
else document.addEventListener('DOMContentLoaded', boot);

})();