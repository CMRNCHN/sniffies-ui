// ==UserScript==
// @name         Sniffies Dock System (1–5 Auto Send)
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  Bottom dock + instant hotkey send system
// @match        https://*.sniffies.com/*
// @match        https://sniffies.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const ID = 'sniffies-dock-system';
    if (document.getElementById(ID)) return;

    const phrases = [
        "Hey, what's up man? what're you up to?",
        "Not much here just hanging in my hotel room, Looking around for some fun. How about you?",
        "What brings you on? What're you into? Any pics?",
        "I'm into group play or one-on-one. Top here, love eating ass, making out, body contact, open to some stuff but nothing too extreme or anything that involves a fist. pnp as well.",
        "Where in the city are you at?"
    ];

    function getInput() {
        return document.querySelector(
            'textarea[placeholder*="message" i], textarea[placeholder*="type" i], ' +
            'input[placeholder*="message" i], textarea, input[type="text"], [contenteditable="true"]'
        );
    }

    // Use native property setter so React detects the change
    function setText(el, text) {
        if (!el) return;
        el.focus();
        if (el.isContentEditable) {
            el.textContent = text;
        } else {
            const proto = el.tagName === 'TEXTAREA'
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            setter ? setter.call(el, text) : (el.value = text);
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function sendMessage(el) {
        if (!el) return;
        el.focus();
        for (const type of ['keydown', 'keypress', 'keyup']) {
            el.dispatchEvent(new KeyboardEvent(type, {
                key: 'Enter', code: 'Enter', keyCode: 13,
                which: 13, bubbles: true, cancelable: true
            }));
        }
    }

    function flash(buttonEl) {
        const orig = buttonEl.style.background;
        buttonEl.style.background = '#16a34a';
        setTimeout(() => { buttonEl.style.background = orig; }, 300);
    }

    function sendPhrase(index, buttonEl) {
        const el = getInput();
        if (!el) return;
        setText(el, phrases[index]);
        setTimeout(() => {
            sendMessage(el);
            if (buttonEl) flash(buttonEl);
        }, 60);
    }

    const dock = document.createElement('div');
    dock.id = ID;
    Object.assign(dock.style, {
        position: 'fixed',
        bottom: '0', left: '0', right: '0',
        zIndex: '999999',
        display: 'flex',
        justifyContent: 'center',
        background: 'rgba(15,15,15,0.96)',
        borderTop: '1px solid #333',
        backdropFilter: 'blur(12px)',
        padding: '8px 0',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    document.body.style.paddingBottom = '70px';

    const inner = document.createElement('div');
    Object.assign(inner.style, {
        display: 'flex', gap: '10px', alignItems: 'center',
        maxWidth: '900px', width: '100%', padding: '0 12px'
    });

    function btn(label, bg, onClick) {
        const b = document.createElement('button');
        b.textContent = label;
        Object.assign(b.style, {
            padding: '8px 12px', borderRadius: '18px',
            border: 'none', background: bg, color: '#fff',
            cursor: 'pointer', fontSize: '13px', fontWeight: '600',
            whiteSpace: 'nowrap', transition: 'background 0.2s'
        });
        b.addEventListener('click', onClick);
        return b;
    }

    const nav = document.createElement('div');
    Object.assign(nav.style, { display: 'flex', gap: '8px' });
    nav.appendChild(btn("Map", "#333", () =>
        document.querySelector('[aria-label*="Map" i], .map')?.click()
    ));
    nav.appendChild(btn("Chat", "#333", () =>
        document.querySelector('[aria-label*="Chat" i], [aria-label*="Message" i]')?.click()
    ));
    nav.appendChild(btn("Back", "#333", () => history.back()));

    const replies = document.createElement('div');
    Object.assign(replies.style, { display: 'flex', gap: '6px' });

    const replyBtns = phrases.map((p, i) => {
        const b = btn(String(i + 1), '#1e3a8a', () => sendPhrase(i, b));
        b.title = p;
        replies.appendChild(b);
        return b;
    });

    let expanded = true;
    const toggle = btn("▾", "#444", () => {
        expanded = !expanded;
        nav.style.display = replies.style.display = expanded ? 'flex' : 'none';
        toggle.textContent = expanded ? "▾" : "▴";
    });

    document.addEventListener('keydown', (e) => {
        const t = e.target;
        if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return;
        const index = parseInt(e.key, 10) - 1;
        if (index >= 0 && index < phrases.length) sendPhrase(index, replyBtns[index]);
    });

    inner.appendChild(toggle);
    inner.appendChild(nav);
    inner.appendChild(replies);
    dock.appendChild(inner);
    document.body.appendChild(dock);
})();
