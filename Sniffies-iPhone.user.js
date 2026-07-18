// ==UserScript==
// @name         Sniffies Intent Bar (iPhone)
// @namespace    http://tampermonkey.net/
// @version      1.1.1
// @description  Floating bar + profile sidebar for Tampermonkey on iOS (no Split View)
// @author       You
// @match        https://sniffies.com/*
// @match        https://www.sniffies.com/*
// @match        https://sniffies.com/
// @match        https://www.sniffies.com/
// @updateURL    https://raw.githubusercontent.com/CMRNCHN/sniffies-ui/main/Sniffies-iPhone.user.js
// @downloadURL  https://raw.githubusercontent.com/CMRNCHN/sniffies-ui/main/Sniffies-iPhone.user.js
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  if (window.__sniffiesIntentBarIPhone) return;
  window.__sniffiesIntentBarIPhone = true;

  var VERSION = "1.1.1";
  var STORAGE_KEY = "sniffies-intent-bar-iphone-v1";
  // Migrate quick messages from desktop keys when iPhone storage is empty
  var DESKTOP_MIGRATE_KEYS = [
    "sniffies-intent-bar-v50",
    "sniffies-intent-bar-v60",
    "sniffies-intent-bar-v40"
  ];
  var MAX_QUICK_MESSAGES = 30;
  var MAX_QM_LABEL = 40;
  var MAX_QM_TEXT = 500;
  var INSET_STYLE_ID = "sniffies-iphone-inset";

  var BAR_ID = "sniffies-iphone-bar";
  var SIDEBAR_ID = "sniffies-iphone-sidebar";
  var COMPOSER_ID = "sniffies-iphone-composer";
  var SETTINGS_ID = "sniffies-iphone-settings";
  var DETAILS_ID = "sniffies-iphone-profile-details";
  var TOAST_ID = "sniffies-iphone-toast";
  var HIDE_STYLE_ID = "sniffies-iphone-hide-native";

  // Cohesive 24×24 stroke icons (currentColor). Bottom bar + profile sidebar share one set.
  var NAV_ICONS = {
    back: { icon: "back", label: "Back" },
    favorites: { icon: "star", label: "Favorites" },
    chats: { icon: "chat", label: "Chats" },
    map: { icon: "map", label: "Map" },
    settings: { icon: "settings", label: "Settings" },
    pinned: { icon: "pin", label: "Pinned" },
    message: { icon: "send", label: "Message" },
    details: { icon: "info", label: "Details" },
    send: { icon: "send", label: "Send" },
    pics: { icon: "pics", label: "Send pics" },
    shield: { icon: "block", label: "Block" }
  };

  var SVG_PATHS = {
    back:
      '<path d="M14.75 5.25 8.5 12l6.25 6.75" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    star:
      '<path d="M12 3.75l2.2 4.46 4.92.72-3.56 3.47.84 4.9L12 15.1l-4.4 2.3.84-4.9-3.56-3.47 4.92-.72L12 3.75z" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"/>',
    chat:
      '<path d="M7 17.25 4.75 19.5V7.75A2.5 2.5 0 0 1 7.25 5.25h9.5A2.5 2.5 0 0 1 19.25 7.75v6.5a2.5 2.5 0 0 1-2.5 2.5H7z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    map:
      '<path d="M12 20.5s5.75-4.85 5.75-9.55a5.75 5.75 0 1 0-11.5 0C6.25 15.65 12 20.5 12 20.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="10.7" r="2.1" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    settings:
      '<circle cx="12" cy="12" r="2.85" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 3.6v1.9M12 18.5v1.9M3.6 12h1.9M18.5 12h1.9M6.05 6.05l1.35 1.35M16.6 16.6l1.35 1.35M17.95 6.05l-1.35 1.35M7.4 16.6l-1.35 1.35" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    pin:
      '<path d="M12 21V11.5M9.2 5.8a3.4 3.4 0 0 1 5.6 0l.9 1.35H8.3L9.2 5.8zM8.3 7.15h7.4v1.6a2.2 2.2 0 0 1-2.2 2.2h-3a2.2 2.2 0 0 1-2.2-2.2v-1.6z" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>',
    block:
      '<path d="M12 3.4 19.1 6.6v5.4c0 4.55-2.95 7.85-7.1 9.25-4.15-1.4-7.1-4.7-7.1-9.25V6.6L12 3.4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.2 12h5.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    info:
      '<circle cx="12" cy="12" r="8.1" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 10.85V16.4M12 7.7h.01" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>',
    pics:
      '<rect x="3.8" y="6.6" width="12.2" height="10.6" rx="1.7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.8 14.1 6.9 11l3.1 2.95 2.05-1.7 3.95 3.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8.1" cy="10" r="1.05" fill="currentColor"/><path d="M14.6 4.8h5.6v5.6" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/><path d="m20.2 4.8-6.3 6.3" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/>',
    send:
      '<path d="M4.4 11.15 19.6 4.55l-4.05 15.1-3.55-5.55-5.5-1.35 5.35-1.75 1.85-4.85z" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"/>'
  };

  var DEFAULTS = {
    quickMessages: [
      { id: "1", label: "Sup", text: "Sup?" },
      { id: "2", label: "Wyd", text: "Wyd?" },
      { id: "3", label: "Into", text: "Into what?" },
      { id: "4", label: "Host", text: "Top here." },
      { id: "5", label: "Looking", text: "Where at?" }
    ],
    aiEnabled: true,
    aiEndpoint: ""
  };

  var THEME = {
    bg: "rgba(10, 14, 20, 0.94)",
    bgSolid: "#0a0e14",
    barBg: "#ffffff",
    barText: "#1a1d22",
    barMute: "#6b7280",
    sidebarBg: "rgba(22, 24, 28, 0.78)",
    sidebarBorder: "rgba(255,255,255,0.14)",
    border: "rgba(255,255,255,0.08)",
    borderHover: "rgba(255,255,255,0.16)",
    text: "#f2f4f8",
    textDim: "#9aa3b2",
    textMute: "#6b7380",
    accent: "#5b9dff",
    accentBg: "#2f6fed",
    gold: "#f0a43a",
    green: "#3dd68c",
    danger: "#f07178",
    chipBg: "rgba(255,255,255,0.05)",
    chipBgHover: "rgba(255,255,255,0.10)",
    aiBg: "rgba(47, 111, 237, 0.14)",
    aiBorder: "rgba(91, 157, 255, 0.28)"
  };

  var SEL = {
    map: '[data-testid="mainMap"], [data-testid="mapFrameRoot"], app-map-container, app-map, mgl-map, .mapboxgl-map',
    mapFrame: '[data-testid="mapFrameRoot"], mgl-map',
    chatListHost:
      "app-chat-list-vertical, app-chat-list-horizontal, app-chat-list-tabs, app-chat-list-recents, .list-container, .chat-grouping",
    chatList: "app-chat-list",
    chatListTab: '[data-testid^="chatListTab-"]',
    chatListRow: '[data-testid="sniffiesChatRow"]',
    chatInputPanel: '[data-testid="chatInputPanel"], #chat-input-panel, app-chat-input',
    chatTextArea: '[data-testid="chatTextArea"], textarea[name="chatTextArea"]',
    sendButton: '[data-testid="sendButton"], #chat-input-send-text-or-saved-photo',
    profile: "app-profile",
    chatListNav: '[data-testid="chatButtonIcon"]',
    addMedia: '[data-testid="addMediaButton"]',
    mapLayers: '[data-testid="mapLayersButton"]'
  };

  var aiSuggestionsCache = [];
  var aiLoading = false;

  // ============================================================
  // STORAGE
  // ============================================================

  function stripControls(s) {
    return String(s == null ? "" : s).replace(/[\u0000-\u001F\u007F]/g, "");
  }

  function sanitizeQuickMessage(msg, idx) {
    if (!msg || typeof msg !== "object") return null;
    var label = stripControls(msg.label).trim().slice(0, MAX_QM_LABEL);
    var text = stripControls(msg.text).trim().slice(0, MAX_QM_TEXT);
    if (!label && !text) return null;
    if (!label) label = text.slice(0, 12) || "Msg";
    return {
      id: stripControls(msg.id || Date.now() + "-" + idx)
        .trim()
        .slice(0, 48),
      label: label,
      text: text
    };
  }

  function sanitizeQuickMessages(list) {
    if (!Array.isArray(list)) return DEFAULTS.quickMessages.slice();
    var out = [];
    for (var i = 0; i < list.length && out.length < MAX_QUICK_MESSAGES; i++) {
      var m = sanitizeQuickMessage(list[i], i);
      if (m) out.push(m);
    }
    return out.length ? out : DEFAULTS.quickMessages.slice();
  }

  // Only https:// endpoints — never http, javascript:, data:, etc.
  function sanitizeAiEndpoint(url) {
    if (!url || typeof url !== "string") return "";
    var trimmed = url.trim();
    if (!trimmed) return "";
    try {
      var u = new URL(trimmed);
      if (u.protocol !== "https:") return "";
      if (u.username || u.password) return "";
      return u.href;
    } catch (e) {
      return "";
    }
  }

  function normalizeState(parsed) {
    if (!parsed || typeof parsed !== "object") parsed = {};
    parsed.quickMessages = sanitizeQuickMessages(parsed.quickMessages);
    if (typeof parsed.aiEnabled !== "boolean") parsed.aiEnabled = DEFAULTS.aiEnabled;
    parsed.aiEndpoint = sanitizeAiEndpoint(
      typeof parsed.aiEndpoint === "string" ? parsed.aiEndpoint : DEFAULTS.aiEndpoint
    );
    return parsed;
  }

  function migrateQuickMessagesFromDesktop() {
    for (var i = 0; i < DESKTOP_MIGRATE_KEYS.length; i++) {
      try {
        var raw = localStorage.getItem(DESKTOP_MIGRATE_KEYS[i]);
        if (!raw) continue;
        var desk = JSON.parse(raw);
        if (desk && desk.quickMessages && desk.quickMessages.length) {
          return sanitizeQuickMessages(desk.quickMessages);
        }
      } catch (e) {}
    }
    return null;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        var migrated = migrateQuickMessagesFromDesktop();
        var base = normalizeState({});
        if (migrated) base.quickMessages = migrated;
        saveState(base);
        return base;
      }
      return normalizeState(JSON.parse(raw));
    } catch (e) {
      return normalizeState({});
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
    } catch (e) {}
  }

  function loadQuickMessages() {
    return loadState().quickMessages;
  }

  function saveQuickMessages(messages) {
    var state = loadState();
    state.quickMessages = messages;
    saveState(state);
  }

  // ============================================================
  // DOM HELPERS
  // ============================================================

  function isVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    try {
      var cs = window.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) {
        return false;
      }
    } catch (e) {}
    return true;
  }

  function qs(selector, root) {
    try {
      return (root || document).querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  function qsa(selector, root) {
    try {
      return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    } catch (e) {
      return [];
    }
  }

  function ourUiIds() {
    return [BAR_ID, SIDEBAR_ID, COMPOSER_ID, SETTINGS_ID, DETAILS_ID, TOAST_ID];
  }

  function isOurUi(el) {
    if (!el) return false;
    var ids = ourUiIds();
    for (var i = 0; i < ids.length; i++) {
      var node = document.getElementById(ids[i]);
      if (node && (node === el || node.contains(el))) return true;
    }
    if (
      el.closest &&
      el.closest(
        "#" +
          BAR_ID +
          ", #" +
          SIDEBAR_ID +
          ", #" +
          COMPOSER_ID +
          ", #" +
          SETTINGS_ID +
          ", #" +
          DETAILS_ID
      )
    ) {
      return true;
    }
    return false;
  }

  function firstVisible(selectors, root) {
    var list = Array.isArray(selectors) ? selectors : String(selectors).split(",");
    for (var i = 0; i < list.length; i++) {
      var nodes = qsa(list[i].trim(), root);
      for (var j = 0; j < nodes.length; j++) {
        if (isVisible(nodes[j]) && !isOurUi(nodes[j])) return nodes[j];
      }
    }
    return null;
  }

  function findChatListHost() {
    // Do NOT trust 0×0 app-chat-list — use visible children / rows / tabs
    var host = firstVisible(SEL.chatListHost);
    if (host) return host;
    var row = firstVisible(SEL.chatListRow);
    if (row) {
      return (
        row.closest(
          "app-chat-list-vertical, app-chat-list-horizontal, app-chat-list-tabs, .list-container"
        ) || row
      );
    }
    var tab = firstVisible(SEL.chatListTab);
    if (tab) return tab.closest("app-chat-list-tabs, app-chat-list") || tab;
    return null;
  }

  function findChatComposerPanel() {
    return firstVisible(SEL.chatInputPanel);
  }

  function findProfileHost() {
    var host = firstVisible(SEL.profile);
    if (host) return host;
    // Some mobile layouts keep app-profile in DOM with odd visibility — still treat as profile
    var parked = qs(SEL.profile);
    if (parked && !isOurUi(parked)) {
      var r = parked.getBoundingClientRect();
      if (r.width >= 2 && r.height >= 2) return parked;
    }
    var headline =
      firstVisible('[data-testid="profileHeadlineTableContainer"]') ||
      firstVisible('[data-testid*="profileHeadline"]') ||
      firstVisible('[data-testid*="ProfileHeadline"]');
    if (headline) {
      return (
        headline.closest("app-profile") ||
        headline.closest('[class*="profile"]') ||
        headline
      );
    }
    var t = titleHint();
    if (t.indexOf("cruiser profile") !== -1 || t.indexOf("registered cruiser") !== -1) {
      return qs(SEL.profile) || headline || document.body;
    }
    return null;
  }

  function getNativeChatTextArea() {
    var panel = findChatComposerPanel();
    if (panel) {
      var inPanel = qs(SEL.chatTextArea, panel) || qs("textarea", panel);
      if (inPanel && !isOurUi(inPanel)) return inPanel;
    }
    var area = firstVisible(SEL.chatTextArea);
    if (area && !isOurUi(area)) return area;
    var areas = qsa("textarea");
    for (var i = 0; i < areas.length; i++) {
      if (isOurUi(areas[i]) || !isVisible(areas[i])) continue;
      var name =
        (areas[i].getAttribute("name") || "") + (areas[i].getAttribute("data-testid") || "");
      if (/chat|message/i.test(name) || areas[i].closest("app-chat-input, #chat-input-panel")) {
        return areas[i];
      }
    }
    return null;
  }

  function getNativeSendButton() {
    var panel = findChatComposerPanel();
    if (panel) {
      var btn = qs(SEL.sendButton, panel);
      if (btn) return btn;
    }
    return firstVisible(SEL.sendButton) || qs(SEL.sendButton);
  }

  function getChatListNav() {
    var icon = qs(SEL.chatListNav);
    if (!icon) return null;
    return icon.closest("button") || icon;
  }

  function setNativeInputValue(el, value) {
    if (!el) return;
    el.focus();
    if (el.isContentEditable) {
      el.textContent = value;
    } else {
      var proto =
        el.tagName === "TEXTAREA"
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      var desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) desc.set.call(el, value);
      else el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function titleHint() {
    return ((document.title || "") + " " + (location.pathname || "")).toLowerCase();
  }

  function isChatListOpen() {
    if (findChatListHost()) return true;
    if (firstVisible(SEL.chatListRow) || firstVisible(SEL.chatListTab)) return true;
    var t = titleHint();
    return t.indexOf("chat list") !== -1 || /\/chat\/?$/.test(location.pathname || "");
  }

  function isChatThreadOpen() {
    // Profile pages embed a Message composer — that is NOT a private chat thread.
    if (findProfileHost()) return false;
    if (findChatComposerPanel()) return true;
    if (getNativeChatTextArea()) return true;
    var t = titleHint();
    return t.indexOf("private chat") !== -1;
  }

  function resolveViewState() {
    // Profile must win over CHAT: cruiser profiles include chatInputPanel / textarea.
    if (findProfileHost()) return "PROFILE";
    if (isChatThreadOpen()) return "CHAT";
    if (isChatListOpen()) return "CHATS_LIST";
    return "MAP";
  }

  // ============================================================
  // UI PRIMITIVES
  // ============================================================

  function lighten(hex) {
    try {
      if (!hex || hex.indexOf("rgb") === 0 || hex.indexOf("rgba") === 0) return hex;
      var n = parseInt(hex.slice(1), 16);
      var r = Math.min(255, (n >> 16) + 18);
      var g = Math.min(255, ((n >> 8) & 0xff) + 18);
      var b = Math.min(255, (n & 0xff) + 18);
      return "rgb(" + r + "," + g + "," + b + ")";
    } catch (e) {
      return hex;
    }
  }

  function makeBtn(label, action, opts) {
    opts = opts || {};
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    var bg = opts.bg || THEME.chipBg;
    var color = opts.color || THEME.text;
    var bgHover = opts.bg ? lighten(opts.bg) : THEME.chipBgHover;

    Object.assign(b.style, {
      color: color,
      background: bg,
      border: opts.primary ? "1px solid transparent" : "1px solid " + THEME.border,
      padding: opts.compact ? "8px 12px" : "10px 14px",
      minHeight: "40px",
      borderRadius: "999px",
      cursor: "pointer",
      fontSize: "13px",
      fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      fontWeight: opts.bold ? "600" : "500",
      letterSpacing: "0.01em",
      whiteSpace: "nowrap",
      flexShrink: "0",
      transition: "background 0.14s ease, border-color 0.14s ease, transform 0.1s ease",
      webkitTapHighlightColor: "transparent",
      userSelect: "none",
      touchAction: "manipulation"
    });

    b.addEventListener(
      "touchstart",
      function () {
        b.style.background = bgHover;
        b.style.transform = "scale(0.97)";
      },
      { passive: true }
    );
    b.addEventListener("touchend", function () {
      b.style.background = bg;
      b.style.transform = "scale(1)";
    });
    b.onmouseenter = function () {
      b.style.background = bgHover;
      if (!opts.primary) b.style.borderColor = THEME.borderHover;
    };
    b.onmouseleave = function () {
      b.style.background = bg;
      b.style.borderColor = opts.primary ? "transparent" : THEME.border;
    };
    if (action) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        action(e);
      });
    }
    return b;
  }

  function makeIconBtn(glyph, action, color) {
    var b = makeBtn(glyph, action, { color: color || THEME.textDim, compact: true });
    Object.assign(b.style, {
      width: "44px",
      height: "44px",
      minHeight: "44px",
      minWidth: "44px",
      padding: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "18px",
      lineHeight: "1",
      borderRadius: "50%"
    });
    return b;
  }

  function makeNavIconBtn(cmd, color) {
    return makeFloatingNavBtn(cmd);
  }

  function makeRow() {
    var row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 10px",
      overflowX: "auto",
      webkitOverflowScrolling: "touch",
      scrollbarWidth: "none"
    });
    return row;
  }

  function makeChipRow() {
    var row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "7px",
      overflowX: "auto",
      webkitOverflowScrolling: "touch",
      scrollbarWidth: "none"
    });
    return row;
  }

  function spacer() {
    var s = document.createElement("div");
    s.style.flex = "1";
    s.style.minWidth = "4px";
    return s;
  }

  function makeSectionLabel(text) {
    var el = document.createElement("div");
    el.textContent = text;
    Object.assign(el.style, {
      color: THEME.textMute,
      fontWeight: "600",
      fontSize: "11px",
      letterSpacing: "0.08em",
      marginTop: "16px",
      marginBottom: "9px",
      textTransform: "uppercase"
    });
    return el;
  }

  function styleInput(input) {
    Object.assign(input.style, {
      padding: "10px 12px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid " + THEME.border,
      borderRadius: "10px",
      color: THEME.text,
      fontSize: "16px",
      fontFamily: "-apple-system, system-ui, sans-serif",
      outline: "none",
      boxSizing: "border-box"
    });
    input.onfocus = function () {
      input.style.borderColor = THEME.accent;
    };
    input.onblur = function () {
      input.style.borderColor = THEME.border;
    };
  }

  function showToast(msg, kind) {
    try {
      var existing = document.getElementById(TOAST_ID);
      if (existing) existing.remove();
      var toast = document.createElement("div");
      toast.id = TOAST_ID;
      Object.assign(toast.style, {
        position: "fixed",
        bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%) translateY(8px)",
        background:
          kind === "error"
            ? THEME.danger
            : kind === "success"
              ? THEME.green
              : "rgba(20,24,32,0.94)",
        color: "#fff",
        padding: "10px 16px",
        borderRadius: "999px",
        fontSize: "12.5px",
        fontWeight: "500",
        fontFamily: "-apple-system, system-ui, sans-serif",
        zIndex: "1000002",
        boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
        border: "1px solid " + THEME.border,
        opacity: "0",
        transition: "opacity 0.18s, transform 0.18s",
        maxWidth: "90vw",
        pointerEvents: "none"
      });
      toast.textContent = msg;
      document.body.appendChild(toast);
      requestAnimationFrame(function () {
        toast.style.opacity = "1";
        toast.style.transform = "translateX(-50%) translateY(0)";
      });
      setTimeout(function () {
        toast.style.opacity = "0";
        setTimeout(function () {
          try {
            toast.remove();
          } catch (e) {}
        }, 200);
      }, 1500);
    } catch (e) {}
  }

  function whenReady(check, fn, tries) {
    tries = tries == null ? 14 : tries;
    if (check()) {
      fn(true);
      return;
    }
    if (tries <= 0) {
      fn(false);
      return;
    }
    setTimeout(function () {
      whenReady(check, fn, tries - 1);
    }, 120);
  }

  // ============================================================
  // NATIVE COMPOSER HIDE / SEND BRIDGE
  // ============================================================

  function ensureHideNativeStyle() {
    if (document.getElementById(HIDE_STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = HIDE_STYLE_ID;
    style.textContent =
      "body.sniffies-iphone-composer-takeover [data-testid='chatInputPanel']," +
      "body.sniffies-iphone-composer-takeover #chat-input-panel," +
      "body.sniffies-iphone-composer-takeover app-chat-input {" +
      "  opacity: 0 !important;" +
      "  pointer-events: none !important;" +
      "  position: fixed !important;" +
      "  left: -9999px !important;" +
      "  height: 1px !important;" +
      "  width: 1px !important;" +
      "  overflow: hidden !important;" +
      "}" +
      "#" +
      BAR_ID +
      "," +
      "#" +
      BAR_ID +
      " button," +
      "#" +
      SIDEBAR_ID +
      "," +
      "#" +
      SIDEBAR_ID +
      " button," +
      "#" +
      COMPOSER_ID +
      "," +
      "#" +
      COMPOSER_ID +
      " button," +
      "#" +
      COMPOSER_ID +
      " textarea {" +
      "  pointer-events: auto !important;" +
      "}";
    document.head.appendChild(style);
  }

  function ensureInsetStyle() {
    if (document.getElementById(INSET_STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = INSET_STYLE_ID;
    style.textContent =
      "html.sniffies-iphone-has-bar app-profile," +
      "html.sniffies-iphone-has-bar [data-testid*='profile']," +
      "html.sniffies-iphone-has-bar [data-testid*='Profile']," +
      "html.sniffies-iphone-has-bar [class*='profile-detail']," +
      "html.sniffies-iphone-has-bar [class*='profileDetail']," +
      "html.sniffies-iphone-has-bar [class*='ProfileContainer'] {" +
      "  padding-bottom: calc(var(--sniffies-iphone-inset-bottom, 72px) + 24px) !important;" +
      "  scroll-padding-bottom: calc(var(--sniffies-iphone-inset-bottom, 72px) + 24px) !important;" +
      "  box-sizing: border-box !important;" +
      "}" +
      "html.sniffies-iphone-has-bar app-profile {" +
      "  max-height: none !important;" +
      "}" +
      /* Keep the profile's native Message row above our icon bar */ +
      "html[data-sniffies-view='PROFILE'] [data-testid='chatInputPanel']," +
      "html[data-sniffies-view='PROFILE'] #chat-input-panel," +
      "html[data-sniffies-view='PROFILE'] app-chat-input {" +
      "  margin-bottom: calc(var(--sniffies-iphone-bar-h, 56px) + 10px) !important;" +
      "  position: relative !important;" +
      "  z-index: 1000012 !important;" +
      "}";
    document.head.appendChild(style);
  }

  function updateContentInset() {
    ensureInsetStyle();
    document.documentElement.classList.add("sniffies-iphone-has-bar");
    var bar = document.getElementById(BAR_ID);
    var h = bar ? Math.ceil(bar.getBoundingClientRect().height || 56) : 56;
    var composer = document.getElementById(COMPOSER_ID);
    if (
      composer &&
      composer.style.display !== "none" &&
      composer.getBoundingClientRect().height > 8
    ) {
      h += Math.ceil(composer.getBoundingClientRect().height);
    }
    h += 12;
    document.documentElement.style.setProperty(
      "--sniffies-iphone-inset-bottom",
      h + "px"
    );
    document.documentElement.style.setProperty("--sniffies-iphone-bar-h", h + "px");
  }

  function setComposerTakeover(on) {
    ensureHideNativeStyle();
    if (on) document.body.classList.add("sniffies-iphone-composer-takeover");
    else document.body.classList.remove("sniffies-iphone-composer-takeover");
  }

  function getActiveChatFingerprint() {
    var input = getNativeChatTextArea();
    var sendBtn = getNativeSendButton();
    if (!input || !sendBtn) return null;
    // Private threads OR profile inline Message box (compose-on-profile)
    if (!isChatThreadOpen() && !findProfileHost()) return null;
    var header =
      firstVisible(
        '[data-testid*="chatHeader"], [data-testid*="conversationHeader"], app-chat-header, .chat-header'
      ) ||
      findProfileHost() ||
      firstVisible(SEL.chatInputPanel);
    var title = stripControls((header && header.textContent) || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    return {
      input: input,
      sendBtn: sendBtn,
      title: title,
      path: location.pathname || "",
      profile: !!findProfileHost()
    };
  }

  function sameChatFingerprint(a, b) {
    if (!a || !b) return false;
    if (a.path !== b.path) return false;
    if (!!a.profile !== !!b.profile) return false;
    // Prefer the same textarea node — title text changes as the user types
    if (a.input && b.input && a.input.isConnected && b.input.isConnected) {
      return a.input === b.input;
    }
    if (a.title && b.title && a.title !== b.title) return false;
    return true;
  }

  function isSendButtonReady(btn) {
    if (!btn || !isVisible(btn)) return false;
    if (btn.disabled) return false;
    if (btn.getAttribute("aria-disabled") === "true") return false;
    if (btn.classList && btn.classList.contains("disabled")) return false;
    return true;
  }

  function waitUntil(check, done, tries) {
    tries = tries == null ? 25 : tries;
    if (check()) {
      requestAnimationFrame(function () {
        done(true);
      });
      return;
    }
    if (tries <= 0) {
      done(false);
      return;
    }
    setTimeout(function () {
      waitUntil(check, done, tries - 1);
    }, 40);
  }

  function sendViaNative(text) {
    text = stripControls(text).trim().slice(0, MAX_QM_TEXT);
    if (!text) return false;

    var before = getActiveChatFingerprint();
    if (!before) {
      showToast("Native chat controls not found", "error");
      return false;
    }

    setNativeInputValue(before.input, text);

    waitUntil(
      function () {
        var now = getActiveChatFingerprint();
        if (!sameChatFingerprint(before, now)) return false;
        var input = getNativeChatTextArea();
        if (!input) return false;
        var current = input.isContentEditable
          ? input.textContent || ""
          : input.value || "";
        if (current.indexOf(text) === -1 && current !== text) return false;
        return isSendButtonReady(getNativeSendButton());
      },
      function (ready) {
        var now = getActiveChatFingerprint();
        if (!ready || !sameChatFingerprint(before, now)) {
          showToast("Send cancelled — chat changed", "error");
          return;
        }
        var btn = getNativeSendButton();
        if (!isSendButtonReady(btn)) {
          showToast("Send button not ready", "error");
          return;
        }
        btn.click();
      }
    );
    return true;
  }

  function insertAndSendMessage(text) {
    return sendViaNative(text);
  }

  // ============================================================
  // AI SUGGESTIONS
  // ============================================================

  function getRecentChatTexts() {
    var texts = [];
    var nodes = qsa(
      '[data-testid="chatListMsgPreview"], [class*="chat-message"], [class*="message-body"], [class*="received_message"], [class*="sent_message"]'
    );
    for (var i = 0; i < nodes.length; i++) {
      if (isOurUi(nodes[i])) continue;
      var t = (nodes[i].textContent || "").replace(/\s+/g, " ").trim();
      if (t && t.length > 1 && t.length < 280) texts.push(t);
    }
    return texts.slice(-8);
  }

  function localAiSuggestions(recent) {
    var last = (recent[recent.length - 1] || "").toLowerCase();
    var out = [];

    function add(label, text) {
      if (out.length >= 4) return;
      for (var i = 0; i < out.length; i++) if (out[i].text === text) return;
      out.push({ label: label, text: text });
    }

    if (!last) {
      add("Hey", "Hey, what's up?");
      add("Wyd", "Wyd rn?");
      add("Into", "What are you into?");
      add("Pics", "Got any pics?");
      return out;
    }

    if (/pic|photo|face|body|snap/i.test(last)) {
      add("Sure", "Sure, sending now.");
      add("You first", "You first?");
      add("Trade", "Wanna trade?");
    }
    if (/where|locat|area|near|hotel|host|place/i.test(last)) {
      add("Nearby", "I'm nearby — you?");
      add("Host", "I can host.");
      add("Come thru", "Want to come through?");
    }
    if (/wyd|up to|doing|free|now|tonight/i.test(last)) {
      add("Free", "Free now, you?");
      add("Looking", "Looking for fun.");
      add("Chill", "Just chilling, bored.");
    }
    if (/into|like|down for|want/i.test(last)) {
      add("Vers", "Vers here, open-minded.");
      add("Top", "Top here.");
      add("Same", "Same — what are you looking for?");
    }

    add("Nice", "Nice.");
    add("Sounds good", "Sounds good.");
    add("Where", "Where you at?");
    return out.slice(0, 4);
  }

  function refreshAiSuggestions(done) {
    var state = loadState();
    if (!state.aiEnabled) {
      aiSuggestionsCache = [];
      if (done) done([]);
      return;
    }

    var recent = getRecentChatTexts();
    var local = localAiSuggestions(recent);
    var endpoint = sanitizeAiEndpoint(state.aiEndpoint);

    if (!endpoint) {
      aiSuggestionsCache = local;
      if (done) done(local);
      return;
    }

    aiLoading = true;
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recentMessages: recent,
        quickMessages: loadQuickMessages()
      })
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : data && data.suggestions;
        if (Array.isArray(list) && list.length) {
          aiSuggestionsCache = list
            .map(function (s) {
              if (typeof s === "string") {
                var t = stripControls(s).trim().slice(0, MAX_QM_TEXT);
                return { label: t.slice(0, 18), text: t };
              }
              var text = stripControls(s && s.text).trim().slice(0, MAX_QM_TEXT);
              var label = stripControls(s && s.label)
                .trim()
                .slice(0, MAX_QM_LABEL);
              return {
                label: label || text.slice(0, 18),
                text: text
              };
            })
            .filter(function (s) {
              return s.text;
            })
            .slice(0, 4);
        } else {
          aiSuggestionsCache = local;
        }
      })
      .catch(function () {
        aiSuggestionsCache = local;
      })
      .then(function () {
        aiLoading = false;
        if (done) done(aiSuggestionsCache);
      });
  }

  // ============================================================
  // NAV ACTIONS
  // ============================================================

  function cmdOpenChats() {
    var btn = getChatListNav();
    if (btn) {
      btn.click();
      return true;
    }
    showToast("Could not open chats", "error");
    return false;
  }

  function cmdClosePanels() {
    var state = resolveViewState();
    if (state === "CHATS_LIST" || state === "CHAT") {
      var btn = getChatListNav();
      if (btn) btn.click();
    }
    var profile = qs(SEL.profile);
    if (profile && isVisible(profile)) {
      var back = findBackButton(profile);
      if (back) back.click();
      else {
        var anyClose = findBackButton(document);
        if (anyClose) anyClose.click();
      }
    }
  }

  function cmdGoToMap() {
    var attempts = 0;
    var start = resolveViewState();

    function done(ok) {
      if (ok || start === "MAP") showToast("Map", "success");
      else showToast("Couldn't reach map", "error");
    }

    function step() {
      var state = resolveViewState();
      if (state === "MAP") {
        var mapEl = firstVisible(SEL.mapFrame) || firstVisible(SEL.map);
        if (mapEl) {
          try {
            mapEl.click();
          } catch (e) {}
        }
        done(true);
        return;
      }
      if (attempts >= 6) {
        done(false);
        return;
      }
      attempts++;
      var before = state;
      if (state === "CHAT" || state === "CHATS_LIST") {
        var nav = getChatListNav();
        if (nav) nav.click();
        else history.back();
      } else if (state === "PROFILE") {
        var back = findBackButton(qs(SEL.profile));
        if (back) back.click();
        else history.back();
      } else {
        history.back();
      }
      whenReady(
        function () {
          return resolveViewState() !== before || resolveViewState() === "MAP";
        },
        function () {
          setTimeout(step, 60);
        },
        10
      );
    }

    step();
  }

  function findBackButton(root) {
    return qsa('button, [role="button"]', root || document).find(function (b) {
      if (isOurUi(b) || !isVisible(b)) return false;
      var label = ((b.getAttribute("aria-label") || "") + " " + (b.textContent || ""))
        .toLowerCase()
        .trim();
      return label.indexOf("back") !== -1 || label.indexOf("close") !== -1;
    });
  }

  function clickChatListTab(hints, opts) {
    hints = (hints || []).map(function (h) {
      return String(h).toLowerCase();
    });
    opts = opts || {};
    var exclude = (opts.exclude || []).map(function (h) {
      return String(h).toLowerCase();
    });

    function blobOf(el) {
      return (
        (el.getAttribute("data-testid") || "") +
        " " +
        (el.getAttribute("aria-label") || "") +
        " " +
        (el.textContent || "")
      ).toLowerCase();
    }

    function matches(blob) {
      for (var e = 0; e < exclude.length; e++) {
        if (blob.indexOf(exclude[e]) !== -1) return false;
      }
      for (var h = 0; h < hints.length; h++) {
        if (blob.indexOf(hints[h]) !== -1) return true;
      }
      return false;
    }

    var preferredTestIds = opts.testIds || [];
    for (var p = 0; p < preferredTestIds.length; p++) {
      var el = qs(preferredTestIds[p]);
      if (el && (isVisible(el) || el.getBoundingClientRect().width > 0)) {
        el.click();
        return true;
      }
    }

    var tabs = qsa(SEL.chatListTab);
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      if (!isVisible(tab) && tab.getBoundingClientRect().width === 0) continue;
      if (matches(blobOf(tab))) {
        tab.click();
        return true;
      }
    }

    var root = qs(SEL.chatList) || document;
    var candidates = qsa('button, [role="tab"], [role="button"], a', root);
    for (var c = 0; c < candidates.length; c++) {
      var node = candidates[c];
      if (isOurUi(node)) continue;
      if (matches(blobOf(node))) {
        node.click();
        return true;
      }
    }
    return false;
  }

  function openChatListThenTab(hints, label, opts) {
    function finish(ok) {
      if (ok) showToast(label, "success");
      else showToast("Couldn't open " + label, "error");
    }

    if (resolveViewState() === "CHATS_LIST") {
      finish(clickChatListTab(hints, opts));
      return;
    }

    if (resolveViewState() === "CHAT") cmdOpenChats();
    else if (!cmdOpenChats()) return;

    whenReady(
      function () {
        return !!qs(SEL.chatList) || qsa(SEL.chatListTab).length > 0 || !!findChatListHost();
      },
      function () {
        finish(clickChatListTab(hints, opts));
      }
    );
  }

  function cmdPinned() {
    openChatListThenTab(["pinned"], "Pinned", {
      exclude: ["unpin"],
      testIds: [
        '[data-testid="chatListTab-PINNED"]',
        '[data-testid="chatListTab-pinned"]',
        '[data-testid="chatListTab-Pinned"]'
      ]
    });
  }

  // Favorited user profiles — NOT Places / cruising spots
  function cmdFavorites() {
    openChatListThenTab(["favorites", "favourites", "favorite", "favourite"], "Favorites", {
      exclude: ["places", "place", "pinned", "pin"],
      testIds: [
        '[data-testid="chatListTab-FAVORITES"]',
        '[data-testid="chatListTab-favorites"]',
        '[data-testid="chatListTab-Favorites"]',
        '[data-testid="chatListTab-FAVORITE"]',
        '[data-testid="chatListTab-favorite"]'
      ]
    });
  }

  function cmdBack() {
    var state = resolveViewState();
    if (state === "PROFILE") {
      var back = findBackButton(qs(SEL.profile));
      if (back) back.click();
      else history.back();
    } else if (state === "CHAT" || state === "CHATS_LIST") {
      var nav = getChatListNav();
      if (nav) nav.click();
    } else {
      history.back();
    }
  }

  // Native profile right-rail (shield / star / info / pics / plane)
  function getProfileActionRail() {
    var profile = findProfileHost() || qs(SEL.profile);
    if (!profile) return [];
    var pr = profile.getBoundingClientRect();
    if (pr.width < 40 || pr.height < 40) return [];
    var items = [];
    var nodes = qsa('button, [role="button"], a', profile);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (isOurUi(el)) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.width > 84 || r.height > 84) continue;
      // Right strip of the profile / viewport
      var onRightHalf = r.left > Math.min(pr.left + pr.width * 0.62, window.innerWidth * 0.58);
      var nearRightEdge = r.right > pr.right - 72 || r.right > window.innerWidth - 88;
      if (!onRightHalf && !nearRightEdge) continue;
      items.push({
        el: el,
        top: r.top,
        label: (
          (el.getAttribute("aria-label") || "") +
          " " +
          (el.getAttribute("title") || "") +
          " " +
          (el.getAttribute("data-testid") || "") +
          " " +
          (el.textContent || "")
        )
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim()
      });
    }
    items.sort(function (a, b) {
      return a.top - b.top;
    });
    return items;
  }

  function pickProfileRailButton(hints, indexFallback) {
    var rail = getProfileActionRail();
    var h, i;
    for (i = 0; i < rail.length; i++) {
      for (h = 0; h < hints.length; h++) {
        if (rail[i].label.indexOf(hints[h]) !== -1) return rail[i].el;
      }
    }
    if (indexFallback != null && rail[indexFallback]) return rail[indexFallback].el;
    return null;
  }

  function findNativeProfileInfoButton() {
    return pickProfileRailButton(
      ["info", "detail", "about", "more info", "profile info", "information"],
      2
    );
  }

  function findNativeProfileMessageButton() {
    return (
      pickProfileRailButton(["message", "send message", "paper plane", "airplane", "dm"], 4) ||
      pickProfileRailButton(["send", "plane", "chat"], 4)
    );
  }

  function findNativeProfileFavoriteButton() {
    return pickProfileRailButton(
      ["favorit", "star", "bookmark", "save", "pin for later", "pin later", "pinned for later", "pin"],
      1
    );
  }

  function findNativeProfilePicsButton() {
    return (
      pickProfileRailButton(["photo", "pic", "media", "album", "image", "gallery", "camera"], 3) ||
      qs(SEL.addMedia)
    );
  }

  function findNativeProfileShieldButton() {
    return pickProfileRailButton(["shield", "report", "block", "safety", "secure"], 0);
  }

  function clickNative(el, toast) {
    if (!el) return false;
    try {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (e) {}
    try {
      el.click();
    } catch (e2) {
      return false;
    }
    if (toast) showToast(toast, "success");
    return true;
  }

  function dispatchSwipeUp(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    var x = Math.min(window.innerWidth - 24, Math.max(24, r.left + r.width * 0.42));
    var y0 = r.top + r.height * 0.78;
    var y1 = r.top + r.height * 0.28;

    function firePointer(type, y) {
      try {
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: "touch",
            isPrimary: true,
            clientX: x,
            clientY: y,
            buttons: type === "pointerup" ? 0 : 1
          })
        );
      } catch (e) {}
      try {
        el.dispatchEvent(
          new MouseEvent(
            type === "pointerdown" ? "mousedown" : type === "pointerup" ? "mouseup" : "mousemove",
            { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: type === "pointerup" ? 0 : 1 }
          )
        );
      } catch (e2) {}
    }

    firePointer("pointerdown", y0);
    firePointer("pointermove", (y0 + y1) / 2);
    firePointer("pointermove", y1);
    firePointer("pointerup", y1);
    try {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y1 }));
    } catch (e3) {}
    return true;
  }

  function getProfileChatButton() {
    var plane = findNativeProfileMessageButton();
    if (plane) return plane;
    var profile = findProfileHost() || qs(SEL.profile);
    var roots = [profile, document.body].filter(Boolean);
    for (var r = 0; r < roots.length; r++) {
      var candidates = qsa('button, [role="button"], a', roots[r]);
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (isOurUi(el) || !isVisible(el)) continue;
        var label = (
          (el.getAttribute("aria-label") || "") +
          " " +
          (el.getAttribute("data-testid") || "") +
          " " +
          (el.textContent || "")
        )
          .toLowerCase()
          .trim();
        if (label.indexOf("message") !== -1 || label.indexOf("send message") !== -1) {
          if (profile && profile.contains(el)) return el;
          if (!profile) return el;
        }
      }
    }
    return null;
  }

  function cmdStartChat() {
    var profile = findProfileHost();
    if (!profile) {
      showToast("Open a profile first", "error");
      return;
    }
    if (clickNative(findNativeProfileMessageButton() || getProfileChatButton(), "Message")) return;
    var native = getNativeChatTextArea();
    if (native) {
      try {
        native.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch (e) {}
      native.focus();
      showToast("Type your message", "success");
      return;
    }
    showToast("Message control not found", "error");
  }

  function cmdShowProfileDetails() {
    var profile = findProfileHost();
    if (!profile) {
      showToast("Open a profile first", "error");
      return;
    }

    // 1) Native (i) on the right rail — opens the in-profile swipe-up sheet
    if (clickNative(findNativeProfileInfoButton(), "Details")) return;

    // 2) Swipe up on the profile photo / media (native gesture)
    var media =
      qs("img", profile) ||
      qs('[class*="photo"], [class*="media"], [class*="carousel"], [class*="gallery"]', profile);
    if (media && dispatchSwipeUp(media)) {
      showToast("Details", "success");
      return;
    }

    // 3) Tap name/stats overlay (sometimes expands details)
    var overlay =
      qs('[data-testid="profileHeadlineTableContainer"]', profile) ||
      qs('[class*="profileName"], [class*="cruiser-name"], [class*="headline"]', profile);
    if (overlay && !isOurUi(overlay) && clickNative(overlay, "Details")) return;

    // 4) Last resort: our readable sheet
    renderProfileDetailsModal();
  }

  function cmdProfilePics() {
    if (clickNative(findNativeProfilePicsButton(), "Pics")) return;
    cmdPics();
  }

  function cmdProfileFavorite() {
    if (clickNative(findNativeProfileFavoriteButton(), "Favorited")) return;
    cmdFavoriteProfile();
  }

  function cmdProfileShield() {
    if (clickNative(findNativeProfileShieldButton(), "Safety")) return;
    showToast("Safety control not found", "error");
  }

  function scrapeProfileDetails() {
    var profile = findProfileHost() || qs(SEL.profile);
    if (!profile) return { title: "Profile", lines: [] };

    var lines = [];
    var seen = {};

    function addLine(text, weight) {
      text = stripControls(text).replace(/\s+/g, " ").trim();
      if (!text || text.length < 2 || text.length > 400) return;
      var key = text.toLowerCase();
      if (seen[key]) return;
      // Skip obvious chrome / our UI / single icon glyphs
      if (/^(message|send|back|close|favorite|pin|chat|map|saved)$/i.test(text)) return;
      seen[key] = true;
      lines.push({ text: text, weight: weight || 0 });
    }

    var headline =
      qs('[data-testid="profileHeadlineTableContainer"]', profile) ||
      qs('[data-testid*="profileHeadline"]', profile) ||
      qs('[data-testid*="Headline"]', profile);
    if (headline) addLine(headline.textContent, 10);

    var titleBits = qsa("h1, h2, h3, [class*='headline'], [class*='title']", profile);
    for (var t = 0; t < titleBits.length; t++) addLine(titleBits[t].textContent, 8);

    // Stats / chips / tags often sit under the photo (covered by our bar)
    var chips = qsa(
      '[class*="tag"], [class*="chip"], [class*="badge"], [class*="stat"], [class*="trait"], [role="listitem"]',
      profile
    );
    for (var c = 0; c < chips.length; c++) {
      if (isOurUi(chips[c])) continue;
      addLine(chips[c].textContent, 5);
    }

    var paras = qsa("p, li, [class*='about'], [class*='bio'], [class*='description'], td, th", profile);
    for (var p = 0; p < paras.length; p++) {
      if (isOurUi(paras[p])) continue;
      addLine(paras[p].textContent, 3);
    }

    // Last resort: split visible text blocks
    if (lines.length < 2) {
      var raw = stripControls(profile.innerText || profile.textContent || "")
        .split(/\n+/)
        .map(function (s) {
          return s.replace(/\s+/g, " ").trim();
        });
      for (var i = 0; i < raw.length; i++) addLine(raw[i], 1);
    }

    lines.sort(function (a, b) {
      return b.weight - a.weight;
    });

    var title = lines.length ? lines[0].text : "Profile details";
    var body = lines
      .slice(title === (lines[0] && lines[0].text) ? 1 : 0)
      .map(function (l) {
        return l.text;
      })
      .filter(function (t, idx, arr) {
        return arr.indexOf(t) === idx;
      })
      .slice(0, 40);

    return { title: title.slice(0, 80), lines: body };
  }

  function scrollProfileDetailsIntoView() {
    var profile = findProfileHost();
    if (!profile) return;
    var candidates = qsa(
      '[class*="about"], [class*="bio"], [class*="detail"], [class*="stats"], [class*="tag"], [data-testid*="profile"]',
      profile
    );
    var target = null;
    for (var i = candidates.length - 1; i >= 0; i--) {
      if (!isOurUi(candidates[i]) && isVisible(candidates[i])) {
        target = candidates[i];
        break;
      }
    }
    if (!target) target = profile;
    try {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (e) {}
  }

  function renderProfileDetailsModal() {
    closeModals();
    var data = scrapeProfileDetails();
    scrollProfileDetailsIntoView();

    var overlay = document.createElement("div");
    overlay.id = DETAILS_ID;
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.55)",
      zIndex: "1000004",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      paddingBottom: "env(safe-area-inset-bottom, 0px)"
    });
    overlay.onclick = function (e) {
      if (e.target === overlay) overlay.remove();
    };

    var sheet = document.createElement("div");
    Object.assign(sheet.style, {
      background: THEME.bgSolid,
      border: "1px solid " + THEME.border,
      borderRadius: "18px 18px 0 0",
      padding: "18px 16px 28px",
      width: "100%",
      maxHeight: "78vh",
      overflowY: "auto",
      color: THEME.text,
      fontFamily: "-apple-system, system-ui, sans-serif",
      boxShadow: "0 -12px 40px rgba(0,0,0,0.45)",
      boxSizing: "border-box"
    });

    var title = document.createElement("div");
    title.textContent = data.title || "Profile details";
    Object.assign(title.style, {
      fontWeight: "650",
      fontSize: "18px",
      marginBottom: "6px",
      lineHeight: "1.3"
    });
    sheet.appendChild(title);

    var hint = document.createElement("div");
    hint.textContent = "Pulled from the open profile (details often sit under the bar).";
    Object.assign(hint.style, {
      color: THEME.textMute,
      fontSize: "12px",
      marginBottom: "14px",
      lineHeight: "1.4"
    });
    sheet.appendChild(hint);

    if (!data.lines.length) {
      var empty = document.createElement("div");
      empty.textContent = "Couldn't read extra details — try scrolling the profile, then open Details again.";
      Object.assign(empty.style, {
        color: THEME.textDim,
        fontSize: "14px",
        lineHeight: "1.45",
        marginBottom: "12px"
      });
      sheet.appendChild(empty);
    } else {
      data.lines.forEach(function (line) {
        var row = document.createElement("div");
        row.textContent = line;
        Object.assign(row.style, {
          fontSize: "14px",
          lineHeight: "1.45",
          padding: "10px 0",
          borderBottom: "1px solid " + THEME.border,
          color: THEME.text
        });
        sheet.appendChild(row);
      });
    }

    var actions = document.createElement("div");
    Object.assign(actions.style, {
      display: "flex",
      gap: "8px",
      marginTop: "16px"
    });
    var msgBtn = makeBtn(
      "✉  Message",
      function () {
        overlay.remove();
        cmdStartChat();
      },
      { bg: THEME.accentBg, color: "#fff", bold: true, primary: true }
    );
    msgBtn.style.flex = "1";
    msgBtn.style.minHeight = "44px";
    var done = makeBtn(
      "Done",
      function () {
        overlay.remove();
      },
      { color: THEME.textDim }
    );
    done.style.flex = "1";
    done.style.minHeight = "44px";
    actions.appendChild(msgBtn);
    actions.appendChild(done);
    sheet.appendChild(actions);

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  }

  function getFavoriteButton() {
    var profile = qs(SEL.profile);
    if (!profile) return null;
    var buttons = qsa('button, [role="button"]', profile);
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (isOurUi(b) || !isVisible(b)) continue;
      var label = ((b.getAttribute("aria-label") || "") + " " + (b.textContent || "")).toLowerCase();
      if (
        label.indexOf("favorit") !== -1 ||
        label.indexOf("bookmark") !== -1 ||
        label.indexOf("pin") !== -1 ||
        label.indexOf("save") !== -1
      ) {
        return b;
      }
    }
    return null;
  }

  function cmdFavoriteProfile() {
    var fav = getFavoriteButton();
    if (fav) {
      fav.click();
      showToast("Favorited", "success");
    } else showToast("Favorite control not found", "error");
  }

  // ============================================================
  // QUICK MESSAGE COMPOSER
  // ============================================================

  function getComposerTextarea() {
    var box = document.getElementById(COMPOSER_ID);
    if (!box) return null;
    return box.querySelector("textarea");
  }

  function setComposerText(text) {
    var ta = getComposerTextarea();
    if (!ta) return;
    ta.value = text;
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function cmdComposerSend() {
    var ta = getComposerTextarea();
    var val = ta ? stripControls(ta.value || "").trim() : "";
    if (!val) {
      var native = getNativeChatTextArea();
      if (!native) {
        showToast("Nothing to send", "error");
        return;
      }
      val = stripControls(
        native.isContentEditable ? native.textContent || "" : native.value || ""
      ).trim();
      if (!val) {
        try {
          native.focus();
        } catch (e) {}
        showToast("Type a message first", "error");
        return;
      }
      if (sendViaNative(val)) showToast("Sent", "success");
      return;
    }
    if (sendViaNative(val)) {
      ta.value = "";
      ta.style.height = "40px";
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      showToast("Sent", "success");
      setTimeout(function () {
        refreshAiSuggestions(function () {
          if (resolveViewState() === "CHAT") renderComposer("CHAT");
        });
      }, 400);
    }
  }

  function cmdPics() {
    var media = qs(SEL.addMedia);
    if (media && isVisible(media)) {
      media.click();
      return;
    }
    setComposerTakeover(false);
    setTimeout(function () {
      var m = qs(SEL.addMedia);
      if (m) m.click();
      setTimeout(function () {
        if (isChatThreadOpen()) setComposerTakeover(true);
      }, 600);
    }, 50);
  }

  function ensureComposerHost() {
    var el = document.getElementById(COMPOSER_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = COMPOSER_ID;
    Object.assign(el.style, {
      position: "fixed",
      left: "0",
      right: "0",
      bottom: "52px",
      zIndex: "1000000",
      display: "none",
      flexDirection: "column",
      gap: "6px",
      padding: "8px 10px 8px",
      boxSizing: "border-box",
      background: THEME.bg,
      borderTop: "1px solid " + THEME.border,
      boxShadow: "0 -8px 28px rgba(0,0,0,0.35)",
      backdropFilter: "blur(18px) saturate(1.2)",
      webkitBackdropFilter: "blur(18px) saturate(1.2)"
    });
    document.body.appendChild(el);
    return el;
  }

  function hideComposer() {
    var el = document.getElementById(COMPOSER_ID);
    if (el) el.style.display = "none";
    setComposerTakeover(false);
  }

  function buildAiStrip(onRefresh) {
    var aiWrap = document.createElement("div");
    Object.assign(aiWrap.style, {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      padding: "6px 8px",
      borderRadius: "12px",
      border: "1px solid " + THEME.aiBorder,
      background: THEME.aiBg,
      position: "relative",
      overflow: "hidden"
    });

    var aiHead = document.createElement("div");
    Object.assign(aiHead.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      minHeight: "28px"
    });
    var aiLbl = document.createElement("div");
    aiLbl.textContent = "Suggest";
    Object.assign(aiLbl.style, {
      color: THEME.accent,
      fontSize: "11px",
      fontWeight: "600",
      letterSpacing: "0.04em",
      textTransform: "uppercase"
    });
    aiHead.appendChild(aiLbl);
    aiHead.appendChild(
      makeIconBtn(
        "↻",
        function () {
          refreshAiSuggestions(function () {
            if (onRefresh) onRefresh();
          });
        },
        THEME.accent
      )
    );
    aiWrap.appendChild(aiHead);

    var aiRow = makeChipRow();
    var suggestions = aiSuggestionsCache.length
      ? aiSuggestionsCache
      : localAiSuggestions(getRecentChatTexts());
    if (aiLoading && !suggestions.length) {
      var loading = document.createElement("div");
      loading.textContent = "…";
      loading.style.color = THEME.textMute;
      loading.style.fontSize = "12px";
      aiRow.appendChild(loading);
    } else if (!suggestions.length) {
      var empty = document.createElement("div");
      empty.textContent = "No suggestions yet";
      empty.style.color = THEME.textMute;
      empty.style.fontSize = "12px";
      aiRow.appendChild(empty);
    } else {
      suggestions.forEach(function (s) {
        aiRow.appendChild(
          makeBtn(
            s.label,
            function () {
              setComposerText(s.text);
            },
            { color: THEME.accent, compact: true }
          )
        );
      });
    }
    aiWrap.appendChild(aiRow);
    return aiWrap;
  }

  function renderComposer(state) {
    // Never take over the profile's native Message row — only full chat threads.
    var inChat = state === "CHAT" && isChatThreadOpen();
    if (!inChat) {
      hideComposer();
      return;
    }

    setComposerTakeover(true);
    var existingText = "";
    var prevTa = getComposerTextarea();
    if (prevTa) existingText = prevTa.value || "";

    var stateData = loadState();
    var el = ensureComposerHost();
    el.innerHTML = "";
    Object.assign(el.style, {
      position: "fixed",
      left: "0",
      right: "0",
      zIndex: "1000000",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      padding: "8px 10px 8px",
      boxSizing: "border-box",
      background: THEME.bg,
      borderTop: "1px solid " + THEME.border,
      boxShadow: "0 -8px 28px rgba(0,0,0,0.35)",
      backdropFilter: "blur(18px) saturate(1.2)",
      webkitBackdropFilter: "blur(18px) saturate(1.2)"
    });

    if (stateData.aiEnabled) {
      el.appendChild(
        buildAiStrip(function () {
          renderComposer("CHAT");
        })
      );
    }

    var quickRow = makeChipRow();
    loadQuickMessages().forEach(function (msg) {
      var text = msg.text;
      quickRow.appendChild(
        makeBtn(
          msg.label,
          function () {
            setComposerText(text);
          },
          { compact: true }
        )
      );
    });
    quickRow.appendChild(makeBtn("Pics", cmdPics, { color: THEME.gold, compact: true }));
    el.appendChild(quickRow);

    var inputRow = document.createElement("div");
    Object.assign(inputRow.style, {
      display: "flex",
      alignItems: "flex-end",
      gap: "8px"
    });

    var ta = document.createElement("textarea");
    ta.rows = 1;
    ta.placeholder = "Message…";
    ta.value = existingText;
    Object.assign(ta.style, {
      flex: "1",
      resize: "none",
      minHeight: "40px",
      maxHeight: "96px",
      padding: "10px 12px",
      borderRadius: "14px",
      border: "1px solid " + THEME.border,
      background: "rgba(255,255,255,0.04)",
      color: THEME.text,
      fontSize: "16px",
      lineHeight: "1.35",
      fontFamily: "-apple-system, system-ui, sans-serif",
      outline: "none"
    });
    ta.addEventListener("focus", function () {
      ta.style.borderColor = THEME.accent;
    });
    ta.addEventListener("blur", function () {
      ta.style.borderColor = THEME.border;
    });
    ta.addEventListener("input", function () {
      ta.style.height = "auto";
      ta.style.height = Math.min(96, ta.scrollHeight) + "px";
    });
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        cmdComposerSend();
      }
    });

    var sendBtn = makeBtn("Send", cmdComposerSend, {
      bg: THEME.accentBg,
      color: "#fff",
      bold: true,
      primary: true
    });
    sendBtn.style.height = "40px";
    sendBtn.style.minHeight = "40px";
    sendBtn.style.padding = "0 16px";

    inputRow.appendChild(ta);
    inputRow.appendChild(sendBtn);
    el.appendChild(inputRow);

    var bar = document.getElementById(BAR_ID);
    var barH = bar ? Math.ceil(bar.getBoundingClientRect().height) : 52;
    el.style.bottom = barH + "px";

    if (!aiSuggestionsCache.length && stateData.aiEnabled && !aiLoading) {
      refreshAiSuggestions(function () {
        if (resolveViewState() === "CHAT" || isChatThreadOpen()) renderComposer("CHAT");
      });
    }
  }

  // ============================================================
  // SETTINGS
  // ============================================================

  function closeModals() {
    var s = document.getElementById(SETTINGS_ID);
    if (s) s.remove();
    var d = document.getElementById(DETAILS_ID);
    if (d) d.remove();
  }

  function makeToggle(initial, onChange) {
    var wrap = document.createElement("div");
    Object.assign(wrap.style, {
      width: "46px",
      height: "28px",
      borderRadius: "14px",
      background: initial ? THEME.green : THEME.border,
      position: "relative",
      cursor: "pointer",
      transition: "background 0.18s",
      flexShrink: "0"
    });
    var knob = document.createElement("div");
    Object.assign(knob.style, {
      width: "22px",
      height: "22px",
      borderRadius: "50%",
      background: "#fff",
      position: "absolute",
      top: "3px",
      left: initial ? "21px" : "3px",
      transition: "left 0.18s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.4)"
    });
    wrap.appendChild(knob);
    var on = initial;
    wrap.onclick = function () {
      on = !on;
      wrap.style.background = on ? THEME.green : THEME.border;
      knob.style.left = on ? "21px" : "3px";
      if (onChange) onChange(on);
    };
    return wrap;
  }

  function renderSettingsModal() {
    closeModals();
    var overlay = document.createElement("div");
    overlay.id = SETTINGS_ID;
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.55)",
      zIndex: "1000003",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      paddingBottom: "env(safe-area-inset-bottom, 0px)"
    });
    overlay.onclick = function (e) {
      if (e.target === overlay) overlay.remove();
    };

    var sheet = document.createElement("div");
    Object.assign(sheet.style, {
      background: THEME.bgSolid,
      border: "1px solid " + THEME.border,
      borderRadius: "18px 18px 0 0",
      padding: "18px 16px 28px",
      width: "100%",
      maxHeight: "78vh",
      overflowY: "auto",
      color: THEME.text,
      fontFamily: "-apple-system, system-ui, sans-serif",
      boxShadow: "0 -12px 40px rgba(0,0,0,0.45)",
      boxSizing: "border-box"
    });

    var title = document.createElement("div");
    title.textContent = "iPhone Settings";
    Object.assign(title.style, { fontWeight: "650", fontSize: "18px", marginBottom: "2px" });
    sheet.appendChild(title);

    var ver = document.createElement("div");
    ver.textContent = "Sniffies Intent Bar (iPhone) v" + VERSION;
    Object.assign(ver.style, {
      color: THEME.textMute,
      fontSize: "12px",
      marginBottom: "8px"
    });
    sheet.appendChild(ver);

    sheet.appendChild(makeSectionLabel("Quick Messages"));
    var messages = loadQuickMessages();
    messages.forEach(function (msg, idx) {
      var row = document.createElement("div");
      Object.assign(row.style, {
        display: "flex",
        gap: "8px",
        marginBottom: "8px",
        alignItems: "center"
      });
      var labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.placeholder = "Label";
      labelInput.value = msg.label || "";
      styleInput(labelInput);
      labelInput.style.flex = "0 0 72px";
      var textInput = document.createElement("input");
      textInput.type = "text";
      textInput.placeholder = "Message text";
      textInput.value = msg.text || "";
      styleInput(textInput);
      textInput.style.flex = "1";
      var deleteBtn = makeIconBtn(
        "\u2715",
        function () {
          messages.splice(idx, 1);
          saveQuickMessages(messages);
          renderSettingsModal();
          renderBar(resolveViewState());
        },
        THEME.textMute
      );
      labelInput.onchange = function () {
        messages[idx].label = stripControls(labelInput.value).trim().slice(0, MAX_QM_LABEL);
        labelInput.value = messages[idx].label;
        saveQuickMessages(messages);
        renderBar(resolveViewState());
      };
      textInput.onchange = function () {
        messages[idx].text = stripControls(textInput.value).trim().slice(0, MAX_QM_TEXT);
        textInput.value = messages[idx].text;
        saveQuickMessages(messages);
      };
      row.appendChild(labelInput);
      row.appendChild(textInput);
      row.appendChild(deleteBtn);
      sheet.appendChild(row);
    });

    var addMsgBtn = makeBtn(
      "+ Add message",
      function () {
        messages.push({ id: String(Date.now()), label: "New", text: "" });
        saveQuickMessages(messages);
        renderSettingsModal();
        renderBar(resolveViewState());
      },
      { color: THEME.accent }
    );
    addMsgBtn.style.width = "100%";
    sheet.appendChild(addMsgBtn);

    sheet.appendChild(makeSectionLabel("AI Suggestions"));
    var st = loadState();
    var aiRow = document.createElement("div");
    Object.assign(aiRow.style, {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "10px"
    });
    var aiLbl = document.createElement("div");
    aiLbl.textContent = "Show AI suggestion bar";
    aiLbl.style.flex = "1";
    aiLbl.style.fontSize = "14px";
    aiRow.appendChild(aiLbl);
    aiRow.appendChild(
      makeToggle(st.aiEnabled, function (val) {
        var s = loadState();
        s.aiEnabled = val;
        saveState(s);
        renderBar(resolveViewState());
      })
    );
    sheet.appendChild(aiRow);

    var epLabel = document.createElement("div");
    epLabel.textContent =
      "Optional HTTPS API (POST JSON → { suggestions: [{label,text}] }). Blank = local heuristics. http:// and other schemes are rejected.";
    Object.assign(epLabel.style, {
      color: THEME.textMute,
      fontSize: "12px",
      marginBottom: "8px",
      lineHeight: "1.4"
    });
    sheet.appendChild(epLabel);
    var epInput = document.createElement("input");
    epInput.type = "url";
    epInput.placeholder = "https://…/suggest";
    epInput.value = st.aiEndpoint || "";
    styleInput(epInput);
    epInput.style.width = "100%";
    epInput.onchange = function () {
      var raw = epInput.value.trim();
      var clean = sanitizeAiEndpoint(raw);
      if (raw && !clean) {
        showToast("AI endpoint must be https://", "error");
        epInput.value = loadState().aiEndpoint || "";
        return;
      }
      var s = loadState();
      s.aiEndpoint = clean;
      saveState(s);
      epInput.value = clean;
    };
    sheet.appendChild(epInput);

    var done = makeBtn(
      "Done",
      function () {
        overlay.remove();
        renderBar(resolveViewState());
      },
      { bg: THEME.accentBg, color: "#fff", bold: true, primary: true }
    );
    done.style.width = "100%";
    done.style.marginTop = "18px";
    sheet.appendChild(done);

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  }

  // ============================================================
  // PROFILE SIDEBAR + FLOATING BOTTOM BAR
  // ============================================================

  function onBarAction(cmd) {
    try {
      if (cmd === "map") cmdGoToMap();
      else if (cmd === "chats") cmdOpenChats();
      else if (cmd === "pinned") cmdPinned();
      else if (cmd === "favorites" || cmd === "saved") {
        if (resolveViewState() === "PROFILE") cmdProfileFavorite();
        else cmdFavorites();
      } else if (cmd === "message" || cmd === "chat") cmdStartChat();
      else if (cmd === "details") cmdShowProfileDetails();
      else if (cmd === "pics") cmdProfilePics();
      else if (cmd === "shield") cmdProfileShield();
      else if (cmd === "send") cmdComposerSend();
      else if (cmd === "back") cmdBack();
      else if (cmd === "settings") renderSettingsModal();
    } catch (err) {
      console.error("[Sniffies iPhone] bar action:", err);
      showToast("Action failed", "error");
    }
  }

  function makeSvgIcon(iconKey, size) {
    size = size || 22;
    var paths = SVG_PATHS[iconKey] || "";
    var span = document.createElement("span");
    span.setAttribute("aria-hidden", "true");
    Object.assign(span.style, {
      display: "inline-flex",
      width: size + "px",
      height: size + "px",
      lineHeight: "0",
      pointerEvents: "none"
    });
    span.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      size +
      '" height="' +
      size +
      '" viewBox="0 0 24 24" fill="none">' +
      paths +
      "</svg>";
    return span;
  }

  function makeFloatingNavBtn(cmd) {
    var meta = NAV_ICONS[cmd] || { icon: "back", label: cmd };
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("data-cmd", cmd);
    b.setAttribute("aria-label", meta.label);
    b.title = meta.label;
    b.appendChild(makeSvgIcon(meta.icon, 21));
    Object.assign(b.style, {
      width: "40px",
      height: "36px",
      minWidth: "40px",
      minHeight: "36px",
      padding: "0",
      margin: "0",
      border: "none",
      background: "transparent",
      color: THEME.barText,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "10px",
      flex: "1 1 0",
      webkitTapHighlightColor: "transparent",
      userSelect: "none",
      touchAction: "manipulation",
      opacity: "0.92"
    });
    return b;
  }

  function makeSidebarBtn(cmd, iconKey, label) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("data-cmd", cmd);
    b.setAttribute("aria-label", label);
    b.title = label;
    b.appendChild(makeSvgIcon(iconKey, 22));
    Object.assign(b.style, {
      width: "40px",
      height: "40px",
      minWidth: "40px",
      minHeight: "40px",
      padding: "0",
      margin: "0",
      border: "none",
      background: "transparent",
      color: "rgba(255,255,255,0.94)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "12px",
      webkitTapHighlightColor: "transparent",
      userSelect: "none",
      touchAction: "manipulation"
    });
    return b;
  }

  function ensureSidebar() {
    var side = document.getElementById(SIDEBAR_ID);
    if (side && side.getAttribute("data-ready") === "2") return side;

    if (side) side.remove();
    side = document.createElement("div");
    side.id = SIDEBAR_ID;
    side.setAttribute("data-ready", "2");
    Object.assign(side.style, {
      position: "fixed",
      top: "auto",
      right: "10px",
      bottom: "160px",
      transform: "none",
      zIndex: "1000016",
      display: "none",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      padding: "10px 7px",
      boxSizing: "border-box",
      width: "52px",
      borderRadius: "20px",
      background: THEME.sidebarBg,
      border: "1px solid " + THEME.sidebarBorder,
      boxShadow: "0 10px 28px rgba(0,0,0,0.38)",
      backdropFilter: "blur(16px) saturate(1.15)",
      webkitBackdropFilter: "blur(16px) saturate(1.15)",
      pointerEvents: "auto"
    });

    // Block · Star · Info · Send pics · Send message
    side.appendChild(makeSidebarBtn("shield", "block", "Block"));
    side.appendChild(makeSidebarBtn("favorites", "star", "Favorite"));
    side.appendChild(makeSidebarBtn("details", "info", "Profile details"));
    side.appendChild(makeSidebarBtn("pics", "pics", "Send pics"));
    side.appendChild(makeSidebarBtn("message", "send", "Send message"));

    side.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        while (t && t !== side && !(t.getAttribute && t.getAttribute("data-cmd"))) t = t.parentNode;
        if (!t || t === side) return;
        e.preventDefault();
        e.stopPropagation();
        onBarAction(t.getAttribute("data-cmd"));
      },
      true
    );

    document.body.appendChild(side);
    return side;
  }

  function positionSidebar() {
    var side = document.getElementById(SIDEBAR_ID);
    if (!side || side.style.display === "none") return;

    var profile = findProfileHost();
    var bar = document.getElementById(BAR_ID);
    var barTop = bar ? bar.getBoundingClientRect().top : window.innerHeight - 48;
    var sideH = side.offsetHeight || 250;
    var minTop = Math.max(72, Math.round(window.innerHeight * 0.12));

    // Sit just above where profile details / stats start (bottom of rail near that band)
    var anchor =
      (profile &&
        (qs('[data-testid="profileHeadlineTableContainer"]', profile) ||
          qs('[class*="profileName"], [class*="headline"], [class*="stats"]', profile))) ||
      null;

    var detailsTop = null;
    if (anchor) {
      detailsTop = anchor.getBoundingClientRect().top;
    } else if (profile) {
      var pr = profile.getBoundingClientRect();
      detailsTop = pr.top + pr.height * 0.72;
    } else {
      detailsTop = barTop - 92;
    }

    // Bottom of sidebar ~8px above details start; clamp so it never covers the bar
    var top = Math.round(detailsTop - sideH - 8);
    var maxTop = Math.round(barTop - sideH - 10);
    if (top > maxTop) top = maxTop;
    if (top < minTop) top = minTop;

    side.style.top = top + "px";
    side.style.bottom = "auto";
    side.style.transform = "none";
  }

  function renderSidebar(state) {
    var side = ensureSidebar();
    var onProfile = state === "PROFILE";
    side.style.display = onProfile ? "flex" : "none";
    side.setAttribute("aria-hidden", onProfile ? "false" : "true");
    if (!onProfile) {
      side.style.pointerEvents = "none";
      return;
    }
    side.style.pointerEvents = "auto";
    // Measure after show
    requestAnimationFrame(function () {
      positionSidebar();
    });
  }

  function ensureBar() {
    var bar = document.getElementById(BAR_ID);
    if (bar && bar.getAttribute("data-ready") === "7") return bar;

    if (bar) bar.remove();
    bar = document.createElement("div");
    bar.id = BAR_ID;
    bar.setAttribute("data-ready", "7");
    Object.assign(bar.style, {
      position: "fixed",
      bottom: "0",
      left: "0",
      right: "0",
      width: "100%",
      transform: "none",
      zIndex: "1000015",
      background: THEME.barBg,
      border: "none",
      borderTop: "1px solid rgba(0,0,0,0.08)",
      borderRadius: "16px 16px 0 0",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      gap: "0",
      padding: "4px 6px calc(4px + env(safe-area-inset-bottom, 0px))",
      boxShadow: "0 -4px 18px rgba(0,0,0,0.16)",
      pointerEvents: "auto"
    });

    // Full-width short bar: Back · Star · Chat · Map · Settings
    bar.appendChild(makeFloatingNavBtn("back"));
    bar.appendChild(makeFloatingNavBtn("favorites"));
    bar.appendChild(makeFloatingNavBtn("chats"));
    bar.appendChild(makeFloatingNavBtn("map"));
    bar.appendChild(makeFloatingNavBtn("settings"));

    bar.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        while (t && t !== bar && !(t.getAttribute && t.getAttribute("data-cmd"))) t = t.parentNode;
        if (!t || t === bar) return;
        e.preventDefault();
        e.stopPropagation();
        onBarAction(t.getAttribute("data-cmd"));
      },
      true
    );

    document.body.appendChild(bar);
    return bar;
  }

  function setBtnTone(btn, active, baseColor) {
    if (!btn) return;
    btn.style.color = active ? THEME.accentBg : baseColor || THEME.barText;
    btn.style.opacity = active ? "1" : "0.86";
  }

  function renderBar(state) {
    try {
      ensureHideNativeStyle();
      var bar = ensureBar();
      bar.setAttribute("data-view", state || "MAP");
      document.documentElement.setAttribute("data-sniffies-view", state || "MAP");

      renderSidebar(state);

      var btns = {};
      qsa("[data-cmd]", bar).forEach(function (b) {
        btns[b.getAttribute("data-cmd")] = b;
      });

      setBtnTone(btns.map, state === "MAP", THEME.barText);
      setBtnTone(btns.chats, state === "CHATS_LIST" || state === "CHAT", THEME.barText);
      setBtnTone(btns.favorites, false, THEME.barText);
      setBtnTone(btns.back, false, THEME.barMute);
      setBtnTone(btns.settings, false, THEME.barMute);

      updateContentInset();
      renderComposer(state);
      setTimeout(function () {
        updateContentInset();
        if (state === "PROFILE") positionSidebar();
      }, 50);
    } catch (e) {
      console.error("[Sniffies iPhone] render error:", e);
    }
  }

  // ============================================================
  // BOOT
  // ============================================================

  function shouldExposeDebugApi() {
    // Harness / local only — never ship send helpers onto sniffies.com
    if (document.querySelector('meta[name="sniffies-iphone-harness"]')) return true;
    var host = location.hostname || "";
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (location.protocol === "file:") return true;
    try {
      if (localStorage.getItem("sniffies-iphone-debug") === "1") return true;
    } catch (e) {}
    return false;
  }

  function hookHistoryNavigation(onNav) {
    var wrap = function (method) {
      var orig = history[method];
      if (typeof orig !== "function") return;
      history[method] = function () {
        var ret = orig.apply(this, arguments);
        try {
          onNav();
        } catch (e) {}
        return ret;
      };
    };
    wrap("pushState");
    wrap("replaceState");
    window.addEventListener("popstate", onNav);
  }

  function boot() {
    var lastState = null;
    var lastChat = null;
    var scheduled = false;
    var renderLockUntil = 0;

    var tick = function () {
      scheduled = false;
      try {
        if (Date.now() < renderLockUntil) return;

        var state = resolveViewState();
        var chat = isChatThreadOpen();
        var changed =
          state !== lastState ||
          chat !== lastChat ||
          !document.getElementById(BAR_ID);

        if (changed) {
          renderBar(state);
          lastState = state;
          lastChat = chat;
        } else if (state === "CHAT") {
          var comp = document.getElementById(COMPOSER_ID);
          if (!comp || comp.style.display === "none") renderComposer("CHAT");
          else setComposerTakeover(true);
        } else {
          hideComposer();
        }
      } catch (e) {
        console.error("[Sniffies iPhone] tick error:", e);
      }
    };

    var schedule = function () {
      if (scheduled) return;
      scheduled = true;
      setTimeout(tick, 120);
    };

    document.addEventListener(
      "pointerdown",
      function (e) {
        if (isOurUi(e.target)) renderLockUntil = Date.now() + 600;
      },
      true
    );

    if (window.MutationObserver && document.documentElement) {
      var moTimer = null;
      var observer = new MutationObserver(function () {
        if (moTimer) return;
        moTimer = setTimeout(function () {
          moTimer = null;
          schedule();
        }, 150);
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden", "aria-hidden"]
      });
    }

    hookHistoryNavigation(schedule);
    window.addEventListener("hashchange", schedule);
    window.addEventListener("resize", function () {
      schedule();
      if (resolveViewState() === "PROFILE") positionSidebar();
    });
    window.addEventListener("pageshow", schedule);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) schedule();
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", schedule);
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModals();
    });

    tick();
    setTimeout(tick, 800);
    // One-shot so a failed install vs invisible bar is easy to tell apart
    setTimeout(function () {
      if (document.getElementById(BAR_ID)) {
        showToast("Intent Bar " + VERSION, "success");
      }
    }, 900);

    if (shouldExposeDebugApi()) {
      window.__sniffiesIntentBarIPhoneApi = {
        resolveViewState: resolveViewState,
        renderBar: renderBar,
        renderSidebar: renderSidebar,
        renderComposer: renderComposer,
        refreshAiSuggestions: refreshAiSuggestions,
        getChatTextArea: getNativeChatTextArea,
        getSendButton: getNativeSendButton,
        insertAndSendMessage: insertAndSendMessage,
        findChatListHost: findChatListHost,
        cmdShowProfileDetails: cmdShowProfileDetails,
        cmdStartChat: cmdStartChat,
        SEL: SEL,
        version: VERSION
      };
      window.__sniffiesIntentBarApi = window.__sniffiesIntentBarIPhoneApi;
    }

    console.log("[Sniffies] Intent Bar (iPhone) " + VERSION + " — nav + quick bar");
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
