// ==UserScript==
// @name         Sniffies Intent Bar (iPhone)
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Mobile nav + quick message bar for Tampermonkey on iOS (no Split View)
// @author       You
// @match        https://sniffies.com/*
// @match        https://www.sniffies.com/*
// @updateURL    https://raw.githubusercontent.com/CMRNCHN/sniffies-ui/main/Sniffies-iPhone.js
// @downloadURL  https://raw.githubusercontent.com/CMRNCHN/sniffies-ui/main/Sniffies-iPhone.js
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  if (window.__sniffiesIntentBarIPhone) return;
  window.__sniffiesIntentBarIPhone = true;

  var VERSION = "1.0.1";
  var STORAGE_KEY = "sniffies-intent-bar-iphone-v1";
  // Migrate quick messages from desktop keys when iPhone storage is empty
  var DESKTOP_MIGRATE_KEYS = [
    "sniffies-intent-bar-v50",
    "sniffies-intent-bar-v60",
    "sniffies-intent-bar-v40"
  ];

  var BAR_ID = "sniffies-iphone-bar";
  var COMPOSER_ID = "sniffies-iphone-composer";
  var SETTINGS_ID = "sniffies-iphone-settings";
  var TOAST_ID = "sniffies-iphone-toast";
  var HIDE_STYLE_ID = "sniffies-iphone-hide-native";

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

  function normalizeState(parsed) {
    if (!parsed || typeof parsed !== "object") parsed = {};
    if (!parsed.quickMessages || !parsed.quickMessages.length) {
      parsed.quickMessages = DEFAULTS.quickMessages.slice();
    }
    if (typeof parsed.aiEnabled !== "boolean") parsed.aiEnabled = DEFAULTS.aiEnabled;
    if (typeof parsed.aiEndpoint !== "string") parsed.aiEndpoint = DEFAULTS.aiEndpoint;
    return parsed;
  }

  function migrateQuickMessagesFromDesktop() {
    for (var i = 0; i < DESKTOP_MIGRATE_KEYS.length; i++) {
      try {
        var raw = localStorage.getItem(DESKTOP_MIGRATE_KEYS[i]);
        if (!raw) continue;
        var desk = JSON.parse(raw);
        if (desk && desk.quickMessages && desk.quickMessages.length) {
          return desk.quickMessages;
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
    return [BAR_ID, COMPOSER_ID, SETTINGS_ID, TOAST_ID];
  }

  function isOurUi(el) {
    if (!el) return false;
    var ids = ourUiIds();
    for (var i = 0; i < ids.length; i++) {
      var node = document.getElementById(ids[i]);
      if (node && (node === el || node.contains(el))) return true;
    }
    if (el.closest && el.closest("#" + BAR_ID + ", #" + COMPOSER_ID + ", #" + SETTINGS_ID)) {
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
    return firstVisible(SEL.profile);
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
    if (findChatComposerPanel()) return true;
    if (getNativeChatTextArea()) return true;
    var t = titleHint();
    return (
      t.indexOf("private chat") !== -1 ||
      (t.indexOf("cruiser profile") !== -1 && !!qs(SEL.chatInputPanel))
    );
  }

  function resolveViewState() {
    if (isChatThreadOpen()) return "CHAT";
    if (findProfileHost()) return "PROFILE";
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
      width: "40px",
      height: "40px",
      minHeight: "40px",
      padding: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
      borderRadius: "50%"
    });
    return b;
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

  function setComposerTakeover(on) {
    ensureHideNativeStyle();
    if (on) document.body.classList.add("sniffies-iphone-composer-takeover");
    else document.body.classList.remove("sniffies-iphone-composer-takeover");
  }

  function sendViaNative(text) {
    var input = getNativeChatTextArea();
    var sendBtn = getNativeSendButton();
    if (!input || !sendBtn) {
      showToast("Native chat controls not found", "error");
      return false;
    }
    setNativeInputValue(input, text);
    setTimeout(function () {
      sendBtn.click();
    }, 30);
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

    if (!state.aiEndpoint) {
      aiSuggestionsCache = local;
      if (done) done(local);
      return;
    }

    aiLoading = true;
    fetch(state.aiEndpoint, {
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
              if (typeof s === "string") return { label: s.slice(0, 18), text: s };
              return {
                label: s.label || String(s.text || "").slice(0, 18),
                text: s.text || ""
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
    }
  }

  function cmdGoToMap() {
    if (resolveViewState() === "MAP") return;
    cmdClosePanels();
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

  function clickChatListTab(hints) {
    hints = hints.map(function (h) {
      return h.toLowerCase();
    });
    var tabs = qsa(SEL.chatListTab);
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      if (!isVisible(tab) && tab.getBoundingClientRect().width === 0) continue;
      var blob = (
        (tab.getAttribute("data-testid") || "") +
        " " +
        (tab.getAttribute("aria-label") || "") +
        " " +
        (tab.textContent || "")
      ).toLowerCase();
      for (var h = 0; h < hints.length; h++) {
        if (blob.indexOf(hints[h]) !== -1) {
          tab.click();
          return true;
        }
      }
    }

    var root = qs(SEL.chatList) || document;
    var candidates = qsa('button, [role="tab"], [role="button"]', root);
    for (var c = 0; c < candidates.length; c++) {
      var node = candidates[c];
      if (isOurUi(node)) continue;
      var text = ((node.getAttribute("aria-label") || "") + " " + (node.textContent || ""))
        .toLowerCase()
        .trim();
      for (var j = 0; j < hints.length; j++) {
        if (text.indexOf(hints[j]) !== -1) {
          node.click();
          return true;
        }
      }
    }
    return false;
  }

  function openChatListThenTab(hints, label) {
    function finish(ok) {
      if (ok) showToast(label, "success");
      else showToast("Couldn't open " + label, "error");
    }

    if (resolveViewState() === "CHATS_LIST") {
      finish(clickChatListTab(hints));
      return;
    }

    if (resolveViewState() === "CHAT") cmdOpenChats();
    else if (!cmdOpenChats()) return;

    whenReady(
      function () {
        return !!qs(SEL.chatList) || qsa(SEL.chatListTab).length > 0 || !!findChatListHost();
      },
      function () {
        finish(clickChatListTab(hints));
      }
    );
  }

  function cmdPinned() {
    openChatListThenTab(["pinned", "pin"], "Pinned");
  }

  function cmdSaved() {
    openChatListThenTab(["places", "place", "saved", "favorit"], "Saved");
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

  function getProfileChatButton() {
    var profile = qs(SEL.profile);
    if (!profile) return null;
    var candidates = qsa('button, [role="button"], a', profile);
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (isOurUi(el) || !isVisible(el)) continue;
      var label = ((el.getAttribute("aria-label") || "") + " " + (el.textContent || ""))
        .toLowerCase()
        .trim();
      if (label.indexOf("message") !== -1 || label.indexOf("chat") !== -1) return el;
    }
    return null;
  }

  function cmdStartChat() {
    var btn = getProfileChatButton();
    if (btn) btn.click();
    else showToast("Chat button not found", "error");
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
      showToast("Saved", "success");
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
    if (!ta) return;
    var val = (ta.value || "").trim();
    if (!val) return;
    if (sendViaNative(val)) {
      ta.value = "";
      showToast("Sent", "success");
      setTimeout(function () {
        refreshAiSuggestions(function () {
          renderComposer(resolveViewState());
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
    var inChat = state === "CHAT" || isChatThreadOpen();
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
        messages[idx].label = labelInput.value;
        saveQuickMessages(messages);
        renderBar(resolveViewState());
      };
      textInput.onchange = function () {
        messages[idx].text = textInput.value;
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
      "Optional API endpoint (POST JSON → { suggestions: [{label,text}] }). Blank = local heuristics.";
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
      var s = loadState();
      s.aiEndpoint = epInput.value.trim();
      saveState(s);
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
  // BOTTOM NAV BAR
  // ============================================================

  function onBarAction(cmd) {
    try {
      if (cmd === "map") cmdGoToMap();
      else if (cmd === "chats") cmdOpenChats();
      else if (cmd === "pinned") cmdPinned();
      else if (cmd === "saved") {
        if (resolveViewState() === "PROFILE") cmdFavoriteProfile();
        else cmdSaved();
      } else if (cmd === "chat") cmdStartChat();
      else if (cmd === "back") cmdBack();
      else if (cmd === "settings") renderSettingsModal();
    } catch (err) {
      console.error("[Sniffies iPhone] bar action:", err);
      showToast("Action failed", "error");
    }
  }

  function ensureBar() {
    var bar = document.getElementById(BAR_ID);
    if (bar && bar.getAttribute("data-ready") === "1") return bar;

    if (bar) bar.remove();
    bar = document.createElement("div");
    bar.id = BAR_ID;
    bar.setAttribute("data-ready", "1");
    Object.assign(bar.style, {
      position: "fixed",
      bottom: "0",
      left: "0",
      right: "0",
      width: "100%",
      zIndex: "1000015",
      background: THEME.bg,
      borderTop: "1px solid " + THEME.border,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 -8px 28px rgba(0,0,0,0.35)",
      backdropFilter: "blur(18px) saturate(1.2)",
      webkitBackdropFilter: "blur(18px) saturate(1.2)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      pointerEvents: "auto"
    });

    var navRow = makeRow();
    navRow.setAttribute("data-nav-row", "1");
    navRow.style.paddingTop = "8px";
    navRow.style.paddingBottom = "8px";

    function addCmd(label, cmd, extra) {
      var b = makeBtn(label, null, Object.assign({ compact: true }, extra || {}));
      b.setAttribute("data-cmd", cmd);
      navRow.appendChild(b);
      return b;
    }

    addCmd("Map", "map");
    addCmd("Chats", "chats");
    addCmd("Pinned", "pinned", { color: THEME.gold });
    addCmd("Saved", "saved", { color: THEME.gold });
    addCmd("Chat", "chat", { color: THEME.accent });
    addCmd("Back", "back", { color: THEME.textMute });
    navRow.appendChild(spacer());
    var gear = makeIconBtn("\u2699", null, THEME.textDim);
    gear.setAttribute("data-cmd", "settings");
    navRow.appendChild(gear);

    bar.appendChild(navRow);
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
    btn.style.color = active ? THEME.accent : baseColor || THEME.textDim;
    btn.style.fontWeight = active ? "600" : "500";
  }

  function renderBar(state) {
    try {
      ensureHideNativeStyle();
      var bar = ensureBar();
      bar.setAttribute("data-view", state || "MAP");

      var btns = {};
      qsa("[data-cmd]", bar).forEach(function (b) {
        btns[b.getAttribute("data-cmd")] = b;
      });

      setBtnTone(btns.map, state === "MAP", THEME.textDim);
      setBtnTone(btns.chats, state === "CHATS_LIST" || state === "CHAT", THEME.text);
      if (btns.saved) btns.saved.textContent = state === "PROFILE" ? "Save" : "Saved";
      if (btns.chat) btns.chat.style.display = state === "PROFILE" ? "" : "none";

      document.documentElement.style.setProperty(
        "--sniffies-iphone-bar-h",
        Math.ceil(bar.getBoundingClientRect().height || 52) + "px"
      );

      renderComposer(state);
    } catch (e) {
      console.error("[Sniffies iPhone] render error:", e);
    }
  }

  // ============================================================
  // BOOT
  // ============================================================

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
      setTimeout(tick, 250);
    };

    document.addEventListener(
      "pointerdown",
      function (e) {
        if (isOurUi(e.target)) renderLockUntil = Date.now() + 600;
      },
      true
    );

    setInterval(schedule, 700);
    window.addEventListener("popstate", schedule);
    window.addEventListener("resize", schedule);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", schedule);
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModals();
    });

    tick();
    setTimeout(tick, 800);

    window.__sniffiesIntentBarIPhoneApi = {
      resolveViewState: resolveViewState,
      renderBar: renderBar,
      renderComposer: renderComposer,
      refreshAiSuggestions: refreshAiSuggestions,
      getChatTextArea: getNativeChatTextArea,
      getSendButton: getNativeSendButton,
      insertAndSendMessage: insertAndSendMessage,
      findChatListHost: findChatListHost,
      SEL: SEL,
      version: VERSION
    };
    // Alias for harness scripts that expect the desktop API name
    window.__sniffiesIntentBarApi = window.__sniffiesIntentBarIPhoneApi;

    console.log("[Sniffies] Intent Bar (iPhone) " + VERSION + " — nav + quick bar");
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
