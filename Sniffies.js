// ==UserScript==
// @name         Sniffies Intent Bar (Mac)
// @version      5.2.0
// @description  Split View that adapts to live Sniffies DOM (map / chat list / thread)
// @match        https://sniffies.com/*
// @match        https://www.sniffies.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  if (window.__sniffiesIntentBar) return;
  window.__sniffiesIntentBar = true;

  var STORAGE_KEY = "sniffies-intent-bar-v50";
  var LEGACY_STORAGE_KEYS = ["sniffies-intent-bar-v60", "sniffies-intent-bar-v40"];
  var BAR_ID = "sniffies-overlay-bar";
  var COMPOSER_ID = "sniffies-composer";
  var SHELL_ID = "sniffies-split-shell";
  var LEFT_PANE_ID = "sniffies-left-pane";
  var MESSENGER_ID = "sniffies-messenger";
  var PROFILE_PANEL_ID = "sniffies-profile-panel";
  var MODAL_ID = "sniffies-quick-modal";
  var SETTINGS_ID = "sniffies-settings-modal";
  var TOAST_ID = "sniffies-toast";
  var HIDE_STYLE_ID = "sniffies-hide-native-composer";
  var SPLIT_STYLE_ID = "sniffies-split-styles";
  var PROFILE_SAVE_ID = "sniffies-profile-save-btn";
  var SPLIT_FAB_ID = "sniffies-split-fab";
  var WIDE_BREAKPOINT = 1400;

  var DEFAULTS = {
    quickMessages: [
      { id: "1", label: "Sup", text: "Sup?" },
      { id: "2", label: "Wyd", text: "Wyd?" },
      { id: "3", label: "Into", text: "Into what?" },
      { id: "4", label: "Host", text: "Top here." },
      { id: "5", label: "Looking", text: "Where at?" }
    ],
    aiEnabled: true,
    aiEndpoint: "",
    splitEnabled: false,
    leftMode: "map",
    notes: {}
  };

  var THEME = {
    bg: "rgba(10, 14, 20, 0.94)",
    bgSolid: "#0a0e14",
    bgPane: "rgba(8, 11, 16, 0.97)",
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
    // Prefer content/testid signals — Angular host tags are often 0×0
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
    mapLayers: '[data-testid="mapLayersButton"]',
    lowerNav: "app-nav-lower-container",
    upperNav: "app-upper-nav-container",
    pinnedHeader: '[data-testid="pinnedForLaterHeader"]'
  };

  var aiSuggestionsCache = [];
  var aiLoading = false;
  var messengerMode = "chats"; // chats | pinned | saved | notes
  var lastGridCards = [];
  var shellDirty = true;
  var lastLayoutKey = "";

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
    if (typeof parsed.splitEnabled !== "boolean") parsed.splitEnabled = DEFAULTS.splitEnabled;
    if (parsed.leftMode !== "map" && parsed.leftMode !== "grid") parsed.leftMode = DEFAULTS.leftMode;
    if (!parsed.notes || typeof parsed.notes !== "object") parsed.notes = {};
    return parsed;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        for (var i = 0; i < LEGACY_STORAGE_KEYS.length; i++) {
          var legacy = localStorage.getItem(LEGACY_STORAGE_KEYS[i]);
          if (legacy) {
            var migrated = normalizeState(JSON.parse(legacy));
            saveState(migrated);
            return migrated;
          }
        }
        return normalizeState({});
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

  function isSplitEnabled() {
    return !!loadState().splitEnabled;
  }

  function setSplitEnabled(on) {
    var state = loadState();
    state.splitEnabled = !!on;
    saveState(state);
    shellDirty = true;
  }

  function getLeftMode() {
    return loadState().leftMode === "grid" ? "grid" : "map";
  }

  function setLeftMode(mode) {
    var state = loadState();
    state.leftMode = mode === "grid" ? "grid" : "map";
    saveState(state);
    shellDirty = true;
  }

  function getNotesMap() {
    return loadState().notes || {};
  }

  function getNote(userKey) {
    if (!userKey) return "";
    return getNotesMap()[userKey] || "";
  }

  function setNote(userKey, text) {
    if (!userKey) return;
    var state = loadState();
    if (!state.notes) state.notes = {};
    if (text && text.trim()) state.notes[userKey] = text;
    else delete state.notes[userKey];
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
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
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

  function measure(el) {
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return {
      el: el,
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom)
    };
  }

  function ourUiIds() {
    return [
      BAR_ID,
      COMPOSER_ID,
      SHELL_ID,
      LEFT_PANE_ID,
      MESSENGER_ID,
      PROFILE_PANEL_ID,
      MODAL_ID,
      SETTINGS_ID,
      TOAST_ID,
      PROFILE_SAVE_ID,
      SPLIT_FAB_ID
    ];
  }

  function isOurUi(el) {
    if (!el) return false;
    var ids = ourUiIds();
    for (var i = 0; i < ids.length; i++) {
      var node = document.getElementById(ids[i]);
      if (node && (node === el || node.contains(el))) return true;
    }
    if (el.closest && el.closest("#" + SHELL_ID + ", #" + BAR_ID + ", #" + COMPOSER_ID + ", #" + SPLIT_FAB_ID)) {
      return true;
    }
    return false;
  }

  // ---- Live DOM adapters (Sniffies hosts are often 0×0; use visible children) ----

  function findMap() {
    return firstVisible(SEL.mapFrame) || firstVisible(SEL.map);
  }

  function findChatListHost() {
    // app-chat-list itself is typically 0×0 — use vertical/tabs/rows
    var host = firstVisible(SEL.chatListHost);
    if (host) return host;
    var row = firstVisible(SEL.chatListRow);
    if (row) {
      return (
        row.closest("app-chat-list-vertical, app-chat-list-horizontal, app-chat-list-tabs, .list-container") ||
        row
      );
    }
    var tab = firstVisible(SEL.chatListTab);
    if (tab) return tab.closest("app-chat-list-tabs, app-chat-list") || tab;
    return null;
  }

  /** Full chat column (tabs + list), not just the row table. */
  function measureChatColumn() {
    var tabs = measure(firstVisible("app-chat-list-tabs"));
    var vert = measure(firstVisible("app-chat-list-vertical, app-chat-list-horizontal"));
    var row = measure(firstVisible(SEL.chatListRow));
    if (tabs && vert) {
      var left = Math.min(tabs.left, vert.left);
      var top = Math.min(tabs.top, vert.top);
      var right = Math.max(tabs.right, vert.right);
      var bottom = Math.max(tabs.bottom, vert.bottom);
      return { el: vert.el || tabs.el, left: left, top: top, width: right - left, height: bottom - top, right: right, bottom: bottom };
    }
    if (vert) return vert;
    if (tabs) return tabs;
    if (row) {
      return measure(
        row.el.closest("app-chat-list-tabs, app-chat-list-vertical, .list-container") || row.el
      );
    }
    return null;
  }

  function findChatComposerPanel() {
    return firstVisible(SEL.chatInputPanel);
  }

  function findProfileHost() {
    return firstVisible(SEL.profile);
  }

  function findLowerNav() {
    return firstVisible(SEL.lowerNav) || qs(SEL.lowerNav);
  }

  function getNativeChatTextArea() {
    var panel = findChatComposerPanel();
    if (panel) {
      var inPanel = qs(SEL.chatTextArea, panel) || qs("textarea", panel);
      if (inPanel && !isOurUi(inPanel)) return inPanel;
    }
    var area = firstVisible(SEL.chatTextArea);
    if (area && !isOurUi(area)) return area;
    // Fallback: any visible page textarea that looks like chat
    var areas = qsa("textarea");
    for (var i = 0; i < areas.length; i++) {
      if (isOurUi(areas[i]) || !isVisible(areas[i])) continue;
      var name = (areas[i].getAttribute("name") || "") + (areas[i].getAttribute("data-testid") || "");
      if (/chat|message/i.test(name) || areas[i].closest("app-chat-input, #chat-input-panel")) return areas[i];
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
    return t.indexOf("private chat") !== -1 || t.indexOf("cruiser profile") !== -1 && !!qs(SEL.chatInputPanel);
  }

  function resolveViewState() {
    if (isChatThreadOpen()) return "CHAT";
    if (findProfileHost()) return "PROFILE";
    if (isChatListOpen()) return "CHATS_LIST";
    return "MAP";
  }

  /** Measure native layout so our chrome docks to real panels instead of guessing. */
  function measureNativeLayout() {
    var bar = document.getElementById(BAR_ID);
    var barH = bar && isVisible(bar) ? Math.ceil(bar.getBoundingClientRect().height) : 58;
    var upper = measure(firstVisible(SEL.upperNav) || qs(SEL.upperNav));
    var map = measure(findMap());
    var chat = measureChatColumn();
    var profile = measure(findProfileHost());
    var composer = measure(findChatComposerPanel());
    var lower = measure(findLowerNav());

    // If chat list open but host measure failed, infer from mapFrame shift
    if (!chat && map && map.left > 40) {
      chat = {
        el: null,
        left: 0,
        top: upper ? upper.bottom : map.top,
        width: map.left,
        height: map.height,
        right: map.left,
        bottom: map.bottom
      };
    }

    return {
      barH: barH,
      upper: upper,
      map: map,
      chat: chat,
      profile: profile,
      composer: composer,
      lower: lower,
      view: resolveViewState()
    };
  }

  function isWideViewport() {
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    if (w >= WIDE_BREAKPOINT) return true;
    try {
      if (window.outerWidth && screen && screen.width && window.outerWidth >= screen.width - 24 && w >= 1200) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  function shouldShowThirdPanel() {
    return isSplitEnabled() && isWideViewport() && (isChatThreadOpen() || !!findProfileHost());
  }

  function fingerprintUser(parts) {
    var raw = (parts || [])
      .filter(Boolean)
      .join("|")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!raw) return "";
    var hash = 0;
    for (var i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return "u" + (hash >>> 0).toString(36) + ":" + raw.slice(0, 40);
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
      padding: opts.compact ? "6px 11px" : "8px 12px",
      borderRadius: "999px",
      cursor: "pointer",
      fontSize: "12.5px",
      fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      fontWeight: opts.bold ? "600" : "500",
      letterSpacing: "0.01em",
      whiteSpace: "nowrap",
      flexShrink: "0",
      transition: "background 0.14s ease, border-color 0.14s ease, transform 0.1s ease",
      webkitTapHighlightColor: "transparent",
      userSelect: "none"
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
      width: "34px",
      height: "34px",
      padding: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "15px",
      borderRadius: "50%"
    });
    return b;
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
      fontSize: "13px",
      fontFamily: "-apple-system, system-ui, sans-serif",
      outline: "none"
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
        bottom: "88px",
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
        transition: "opacity 0.18s, transform 0.18s"
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
      /* Only park the native composer while ours is bridged — never hide chat list / map / profile hosts */
      "body.sniffies-composer-takeover [data-testid='chatInputPanel']," +
      "body.sniffies-composer-takeover #chat-input-panel," +
      "body.sniffies-composer-takeover app-chat-input {" +
      "  opacity: 0 !important;" +
      "  pointer-events: none !important;" +
      "  position: fixed !important;" +
      "  left: -9999px !important;" +
      "  height: 1px !important;" +
      "  width: 1px !important;" +
      "  overflow: hidden !important;" +
      "}" +
      "#" + BAR_ID + "," +
      "#" + BAR_ID + " button," +
      "#" + SPLIT_FAB_ID + "," +
      "#" + COMPOSER_ID + "," +
      "#" + COMPOSER_ID + " button," +
      "#" + COMPOSER_ID + " textarea," +
      "#" + MESSENGER_ID + "," +
      "#" + MESSENGER_ID + " button," +
      "#" + MESSENGER_ID + " textarea," +
      "#" + PROFILE_PANEL_ID + "," +
      "#" + PROFILE_PANEL_ID + " button," +
      "#" + PROFILE_PANEL_ID + " textarea {" +
      "  pointer-events: auto !important;" +
      "}" +
      /* Pass clicks through messenger body to native chat list underneath */
      "#" + MESSENGER_ID + " .sniffies-pass-through {" +
      "  pointer-events: none !important;" +
      "  flex: 1 1 auto;" +
      "  min-height: 80px;" +
      "}";
    document.head.appendChild(style);
  }

  function setComposerTakeover(on) {
    ensureHideNativeStyle();
    if (on) document.body.classList.add("sniffies-composer-takeover");
    else document.body.classList.remove("sniffies-composer-takeover");
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
    if (/age|old|young/i.test(last)) {
      add("Skip", "All good either way.");
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
              return { label: s.label || String(s.text || "").slice(0, 18), text: s.text || "" };
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
    var state = resolveViewState();
    if (state === "MAP") return;
    cmdClosePanels();
  }

  function cmdNativeMapLayers() {
    var layers = qs(SEL.mapLayers);
    if (layers) {
      var btn = layers.closest ? layers.closest("button") || layers : layers;
      btn.click();
      return;
    }
    var byAria = qsa("button").find(function (b) {
      return ((b.getAttribute("aria-label") || "") + "").toLowerCase().indexOf("layer") !== -1;
    });
    if (byAria) byAria.click();
    else showToast("Map layers not found", "error");
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
        return !!qs(SEL.chatList) || qsa(SEL.chatListTab).length > 0;
      },
      function () {
        finish(clickChatListTab(hints));
      }
    );
  }

  function cmdPinned() {
    messengerMode = "pinned";
    openChatListThenTab(["pinned", "pin"], "Pinned");
    shellDirty = true;
    renderShell(resolveViewState());
  }

  function cmdSaved() {
    messengerMode = "saved";
    openChatListThenTab(["places", "place", "saved", "favorit"], "Saved");
    shellDirty = true;
    renderShell(resolveViewState());
  }

  function cmdNotesList() {
    messengerMode = "notes";
    shellDirty = true;
    renderShell(resolveViewState());
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
  // PROFILE / THREAD META
  // ============================================================

  function scrapeProfileMeta(root) {
    root = root || qs(SEL.profile);
    var meta = { name: "", distance: "", avatar: "", photos: [], key: "", bio: "" };
    if (!root) return meta;

    var imgs = qsa("img", root).filter(function (img) {
      if (isOurUi(img)) return false;
      var src = img.currentSrc || img.src || "";
      return src && src.indexOf("data:") !== 0;
    });
    imgs.forEach(function (img) {
      var src = img.currentSrc || img.src;
      if (src && meta.photos.indexOf(src) === -1) meta.photos.push(src);
    });
    if (meta.photos.length) meta.avatar = meta.photos[0];

    var headings = qsa("h1, h2, h3, [class*='name'], [class*='Name'], [data-testid*='name']", root);
    for (var i = 0; i < headings.length; i++) {
      if (isOurUi(headings[i])) continue;
      var t = (headings[i].textContent || "").replace(/\s+/g, " ").trim();
      if (t && t.length < 80) {
        meta.name = t;
        break;
      }
    }
    if (!meta.name) {
      var aria = root.getAttribute("aria-label") || "";
      if (aria) meta.name = aria.slice(0, 60);
    }

    var distNode = qsa("[class*='distance'], [class*='Distance'], [data-testid*='distance']", root)[0];
    if (distNode) meta.distance = (distNode.textContent || "").replace(/\s+/g, " ").trim();

    var bioNode = qsa("[class*='bio'], [class*='Bio'], [class*='about'], p", root).find(function (n) {
      if (isOurUi(n)) return false;
      var t = (n.textContent || "").replace(/\s+/g, " ").trim();
      return t.length > 12 && t.length < 400;
    });
    if (bioNode) meta.bio = (bioNode.textContent || "").replace(/\s+/g, " ").trim();

    meta.key = fingerprintUser([meta.name, meta.avatar, meta.distance]);
    return meta;
  }

  function scrapeActiveThreadTitle() {
    var candidates = qsa(
      '[data-testid*="chatHeader"], [class*="chat-header"], [class*="ChatHeader"], app-chat-header, [class*="conversation-header"]'
    );
    for (var i = 0; i < candidates.length; i++) {
      if (isOurUi(candidates[i]) || !isVisible(candidates[i])) continue;
      var t = (candidates[i].textContent || "").replace(/\s+/g, " ").trim();
      if (t && t.length < 80) return t;
    }
    var profile = scrapeProfileMeta();
    return profile.name || "";
  }

  function activeUserKey() {
    var profile = scrapeProfileMeta();
    if (profile.key) return profile.key;
    var title = scrapeActiveThreadTitle();
    return fingerprintUser([title]);
  }

  // ============================================================
  // GRID SCRAPER
  // ============================================================

  function scrapeMapMarkers() {
    var cards = [];
    var seen = {};
    var markers = qsa(
      ".mapboxgl-marker, .leaflet-marker-icon, [class*='map-marker'], [class*='MapMarker'], [class*='user-marker'], [class*='profile-marker'], [data-testid*='marker']"
    );

    function pushCard(el, avatar, name, distance) {
      var key = fingerprintUser([name, avatar, distance]) || fingerprintUser([avatar]);
      if (!key || seen[key]) return;
      seen[key] = true;
      cards.push({
        key: key,
        name: name || "Nearby",
        distance: distance || "",
        avatar: avatar || "",
        el: el
      });
    }

    markers.forEach(function (m) {
      if (isOurUi(m)) return;
      var r = m.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      var img = qs("img", m);
      var avatar = img ? img.currentSrc || img.src || "" : "";
      var label =
        (m.getAttribute("aria-label") || m.getAttribute("title") || (img && img.alt) || "")
          .replace(/\s+/g, " ")
          .trim();
      pushCard(m, avatar, label, "");
    });

    // Fallback: visible circular avatars that look like map pins
    if (cards.length < 4) {
      qsa("img").forEach(function (img) {
        if (isOurUi(img)) return;
        var r = img.getBoundingClientRect();
        if (r.width < 28 || r.width > 96 || r.height < 28 || r.height > 96) return;
        if (r.top < 40 || r.bottom > window.innerHeight - 80) return;
        var src = img.currentSrc || img.src || "";
        if (!src || src.indexOf("data:") === 0) return;
        var parent = img.closest("button, a, [role='button'], .mapboxgl-marker") || img;
        var name = (img.alt || parent.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
        pushCard(parent, src, name, "");
      });
    }

    lastGridCards = cards.slice(0, 48);
    return lastGridCards;
  }

  function openMarkerCard(card) {
    if (!card || !card.el) return;
    try {
      card.el.click();
      shellDirty = true;
      setTimeout(function () {
        renderShell(resolveViewState());
        if (shouldShowThirdPanel()) renderProfilePanel();
      }, 250);
    } catch (e) {
      showToast("Couldn't open profile", "error");
    }
  }

  // ============================================================
  // CUSTOM COMPOSER
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
    if (isSplitEnabled()) {
      var messenger = document.getElementById(MESSENGER_ID);
      var host = messenger && messenger.querySelector("[data-composer-host]");
      if (host) return host;
    }
    var el = document.getElementById(COMPOSER_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = COMPOSER_ID;
    Object.assign(el.style, {
      position: "fixed",
      left: "0",
      right: "0",
      bottom: "58px",
      zIndex: "1000000",
      display: "none",
      flexDirection: "column",
      gap: "8px",
      padding: "10px 12px 12px",
      boxSizing: "border-box",
      background: THEME.bg,
      borderTop: "1px solid " + THEME.border,
      boxShadow: "0 -12px 40px rgba(0,0,0,0.35)",
      backdropFilter: "blur(18px) saturate(1.2)",
      webkitBackdropFilter: "blur(18px) saturate(1.2)"
    });
    document.body.appendChild(el);
    return el;
  }

  function hideComposer() {
    var el = document.getElementById(COMPOSER_ID);
    if (el) {
      if (isSplitEnabled() && el.getAttribute("data-split-embedded") === "1") {
        el.style.display = "none";
      } else {
        el.style.display = "none";
      }
    }
    var host = document.querySelector("[data-composer-host]");
    if (host) host.innerHTML = "";
    if (!(isSplitEnabled() && isChatThreadOpen())) setComposerTakeover(false);
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

  function buildAiStrip(onRefresh) {
    var aiWrap = document.createElement("div");
    aiWrap.className = "sniffies-ai-glimmer";
    Object.assign(aiWrap.style, {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      padding: "8px 10px",
      borderRadius: "14px",
      border: "1px solid " + THEME.aiBorder,
      position: "relative",
      overflow: "hidden"
    });

    var aiHead = document.createElement("div");
    Object.assign(aiHead.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "8px",
      minHeight: "28px"
    });
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
    var split = isSplitEnabled();

    var el;
    if (split) {
      var messenger = ensureMessenger();
      var host = messenger.querySelector("[data-composer-host]");
      if (!host) return;
      host.innerHTML = "";
      el = document.createElement("div");
      el.id = COMPOSER_ID;
      el.setAttribute("data-split-embedded", "1");
      Object.assign(el.style, {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "10px 12px 12px",
        boxSizing: "border-box",
        background: "transparent",
        borderTop: "1px solid " + THEME.border,
        position: "relative",
        left: "auto",
        right: "auto",
        bottom: "auto",
        zIndex: "1"
      });
      // Remove floating composer if present
      var floating = document.body.querySelector("#" + COMPOSER_ID + ":not([data-split-embedded])");
      if (floating && floating !== el) floating.remove();
      var oldEmbedded = document.getElementById(COMPOSER_ID);
      if (oldEmbedded && oldEmbedded !== el) oldEmbedded.remove();
      host.appendChild(el);
    } else {
      el = ensureComposerHost();
      if (el.getAttribute("data-split-embedded") === "1") {
        el.removeAttribute("data-split-embedded");
        document.body.appendChild(el);
      }
      el.innerHTML = "";
      Object.assign(el.style, {
        position: "fixed",
        left: "0",
        right: "0",
        bottom: "58px",
        zIndex: "1000000",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "10px 12px 12px",
        boxSizing: "border-box",
        background: THEME.bg,
        borderTop: "1px solid " + THEME.border,
        boxShadow: "0 -12px 40px rgba(0,0,0,0.35)",
        backdropFilter: "blur(18px) saturate(1.2)",
        webkitBackdropFilter: "blur(18px) saturate(1.2)"
      });
      el.style.display = "flex";
    }

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
      minHeight: "42px",
      maxHeight: "120px",
      padding: "11px 14px",
      borderRadius: "14px",
      border: "1px solid " + THEME.border,
      background: "rgba(255,255,255,0.04)",
      color: THEME.text,
      fontSize: "14px",
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
      ta.style.height = Math.min(120, ta.scrollHeight) + "px";
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
    sendBtn.style.height = "42px";
    sendBtn.style.padding = "0 16px";

    inputRow.appendChild(ta);
    inputRow.appendChild(sendBtn);
    el.appendChild(inputRow);

    if (!split) {
      var bar = document.getElementById(BAR_ID);
      var barH = bar ? bar.getBoundingClientRect().height : 58;
      el.style.bottom = barH + "px";
    }

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
    var m = document.getElementById(MODAL_ID);
    if (m) m.remove();
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
      alignItems: "center",
      justifyContent: "center"
    });
    overlay.onclick = function (e) {
      if (e.target === overlay) overlay.remove();
    };

    var sheet = document.createElement("div");
    Object.assign(sheet.style, {
      background: THEME.bgSolid,
      border: "1px solid " + THEME.border,
      borderRadius: "18px",
      padding: "22px",
      width: "100%",
      maxWidth: "420px",
      maxHeight: "80vh",
      overflowY: "auto",
      color: THEME.text,
      fontFamily: "-apple-system, system-ui, sans-serif",
      boxShadow: "0 20px 60px rgba(0,0,0,0.55)"
    });

    var title = document.createElement("div");
    title.textContent = "Settings";
    Object.assign(title.style, { fontWeight: "650", fontSize: "18px", marginBottom: "4px" });
    sheet.appendChild(title);

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
      labelInput.style.flex = "0 0 90px";
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
      "Optional API endpoint (POST JSON → { suggestions: [{label,text}] }). Leave blank for local suggestions.";
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

    var doneBtn = makeBtn(
      "Done",
      function () {
        overlay.remove();
        renderBar(resolveViewState());
      },
      { bg: THEME.accentBg, color: "#fff", bold: true, primary: true }
    );
    doneBtn.style.width = "100%";
    doneBtn.style.marginTop = "18px";
    sheet.appendChild(doneBtn);

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  }

  // ============================================================
  // SPLIT SHELL STYLES
  // ============================================================

  function ensureSplitStyles() {
    if (document.getElementById(SPLIT_STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = SPLIT_STYLE_ID;
    style.textContent =
      "@keyframes sniffies-ai-shimmer {" +
      "  0% { background-position: 0% 50%; }" +
      "  100% { background-position: 200% 50%; }" +
      "}" +
      "@keyframes sniffies-sparkle {" +
      "  0%, 100% { opacity: 0.25; }" +
      "  50% { opacity: 0.7; }" +
      "}" +
      ".sniffies-ai-glimmer {" +
      "  background:" +
      "    radial-gradient(circle at 12% 30%, rgba(240,164,58,0.18), transparent 42%)," +
      "    radial-gradient(circle at 78% 70%, rgba(91,157,255,0.22), transparent 45%)," +
      "    linear-gradient(110deg," +
      "      rgba(20,28,42,0.92) 0%," +
      "      rgba(47,111,237,0.16) 28%," +
      "      rgba(240,164,58,0.10) 48%," +
      "      rgba(47,111,237,0.20) 68%," +
      "      rgba(20,28,42,0.92) 100%);" +
      "  background-size: 100% 100%, 100% 100%, 220% 100%;" +
      "  animation: sniffies-ai-shimmer 5.5s ease-in-out infinite;" +
      "}" +
      ".sniffies-ai-glimmer::after {" +
      "  content: '';" +
      "  position: absolute;" +
      "  inset: 0;" +
      "  pointer-events: none;" +
      "  background-image:" +
      "    radial-gradient(1.5px 1.5px at 18% 40%, rgba(255,255,255,0.55), transparent)," +
      "    radial-gradient(1px 1px at 62% 22%, rgba(240,164,58,0.7), transparent)," +
      "    radial-gradient(1.5px 1.5px at 84% 58%, rgba(91,157,255,0.75), transparent)," +
      "    radial-gradient(1px 1px at 40% 78%, rgba(255,255,255,0.4), transparent);" +
      "  animation: sniffies-sparkle 3.2s ease-in-out infinite;" +
      "}" +
      "body.sniffies-split-on {" +
      "  /* native map + chat list stay interactive; we only dock chrome */" +
      "}" +
      "body.sniffies-split-on.sniffies-left-map #sniffies-left-pane {" +
      "  background: transparent;" +
      "  pointer-events: none;" +
      "}" +
      "body.sniffies-split-on.sniffies-left-grid #sniffies-left-pane {" +
      "  background: " +
      THEME.bgPane +
      ";" +
      "  pointer-events: auto;" +
      "}" +
      "#sniffies-split-shell {" +
      "  position: fixed;" +
      "  inset: 0;" +
      "  bottom: var(--sniffies-bar-h, 58px);" +
      "  z-index: 999980;" +
      "  display: none;" +
      "  pointer-events: none;" +
      "}" +
      "body.sniffies-split-on #sniffies-split-shell { display: block; }" +
      "#sniffies-left-pane," +
      "#sniffies-messenger," +
      "#sniffies-profile-panel {" +
      "  position: absolute;" +
      "  box-sizing: border-box;" +
      "  min-width: 0;" +
      "}" +
      "#sniffies-left-pane {" +
      "  overflow: hidden;" +
      "}" +
      "#sniffies-messenger {" +
      "  pointer-events: none;" +
      "  display: flex;" +
      "  flex-direction: column;" +
      "  background: transparent;" +
      "  border-right: 1px solid " +
      THEME.border +
      ";" +
      "}" +
      "#sniffies-messenger > .sniffies-chrome {" +
      "  pointer-events: auto;" +
      "  background: " +
      THEME.bgPane +
      ";" +
      "}" +
      "#sniffies-profile-panel {" +
      "  pointer-events: auto;" +
      "  display: none;" +
      "  flex-direction: column;" +
      "  background: " +
      THEME.bgPane +
      ";" +
      "  overflow: hidden;" +
      "  border-left: 1px solid " +
      THEME.border +
      ";" +
      "}" +
      "body.sniffies-split-wide.sniffies-split-chat #sniffies-profile-panel {" +
      "  display: flex;" +
      "}" +
      "#sniffies-profile-save-btn {" +
      "  position: absolute !important;" +
      "  top: 12px !important;" +
      "  right: 12px !important;" +
      "  z-index: 1000001 !important;" +
      "}";
    document.head.appendChild(style);
  }

  // ============================================================
  // LEFT PANE
  // ============================================================

  function ensureLeftPane() {
    var shell = ensureShell();
    var left = document.getElementById(LEFT_PANE_ID);
    if (left) return left;
    left = document.createElement("div");
    left.id = LEFT_PANE_ID;
    shell.insertBefore(left, shell.firstChild);
    return left;
  }

  function renderLeftPane() {
    var left = ensureLeftPane();
    var mode = getLeftMode();
    document.body.classList.toggle("sniffies-left-map", mode === "map");
    document.body.classList.toggle("sniffies-left-grid", mode === "grid");

    if (mode === "map") {
      left.innerHTML = "";
      var hint = document.createElement("div");
      Object.assign(hint.style, {
        position: "absolute",
        left: "12px",
        top: "12px",
        padding: "6px 10px",
        borderRadius: "999px",
        background: "rgba(10,14,20,0.55)",
        border: "1px solid " + THEME.border,
        color: THEME.textDim,
        fontSize: "11px",
        fontFamily: "-apple-system, system-ui, sans-serif",
        pointerEvents: "none",
        backdropFilter: "blur(8px)"
      });
      hint.textContent = "Map";
      left.appendChild(hint);
      return;
    }

    left.innerHTML = "";
    Object.assign(left.style, {
      display: "flex",
      flexDirection: "column",
      padding: "12px",
      gap: "10px",
      overflow: "auto"
    });

    var head = document.createElement("div");
    Object.assign(head.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px"
    });
    var title = document.createElement("div");
    title.textContent = "Nearby";
    Object.assign(title.style, {
      flex: "1",
      color: THEME.text,
      fontWeight: "650",
      fontSize: "15px",
      fontFamily: "-apple-system, system-ui, sans-serif"
    });
    head.appendChild(title);
    head.appendChild(
      makeIconBtn(
        "↻",
        function () {
          scrapeMapMarkers();
          renderLeftPane();
        },
        THEME.textDim
      )
    );
    left.appendChild(head);

    var grid = document.createElement("div");
    Object.assign(grid.style, {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
      gap: "10px"
    });

    var cards = scrapeMapMarkers();
    if (!cards.length) {
      var empty = document.createElement("div");
      empty.textContent = "No visible map profiles — pan the map or switch to Map.";
      Object.assign(empty.style, {
        color: THEME.textMute,
        fontSize: "13px",
        gridColumn: "1 / -1",
        padding: "18px 4px",
        lineHeight: "1.4"
      });
      grid.appendChild(empty);
    } else {
      cards.forEach(function (card) {
        var cell = document.createElement("button");
        cell.type = "button";
        Object.assign(cell.style, {
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          padding: "0",
          border: "1px solid " + THEME.border,
          borderRadius: "14px",
          overflow: "hidden",
          background: THEME.chipBg,
          cursor: "pointer",
          color: THEME.text,
          fontFamily: "-apple-system, system-ui, sans-serif",
          textAlign: "left"
        });
        var imgWrap = document.createElement("div");
        Object.assign(imgWrap.style, {
          width: "100%",
          aspectRatio: "1",
          background: "rgba(255,255,255,0.04)",
          overflow: "hidden"
        });
        if (card.avatar) {
          var img = document.createElement("img");
          img.src = card.avatar;
          img.alt = card.name || "";
          Object.assign(img.style, {
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block"
          });
          imgWrap.appendChild(img);
        }
        var meta = document.createElement("div");
        Object.assign(meta.style, { padding: "0 8px 8px" });
        var name = document.createElement("div");
        name.textContent = card.name || "Nearby";
        Object.assign(name.style, {
          fontSize: "12px",
          fontWeight: "600",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        });
        meta.appendChild(name);
        if (card.distance) {
          var dist = document.createElement("div");
          dist.textContent = card.distance;
          Object.assign(dist.style, { fontSize: "11px", color: THEME.textMute, marginTop: "2px" });
          meta.appendChild(dist);
        }
        cell.appendChild(imgWrap);
        cell.appendChild(meta);
        cell.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          openMarkerCard(card);
        });
        grid.appendChild(cell);
      });
    }
    left.appendChild(grid);
  }

  // ============================================================
  // MESSENGER PANE
  // ============================================================

  function ensureMessenger() {
    var shell = ensureShell();
    var pane = document.getElementById(MESSENGER_ID);
    if (pane) return pane;
    pane = document.createElement("div");
    pane.id = MESSENGER_ID;
    shell.appendChild(pane);
    return pane;
  }

  function scrapeChatListRows() {
    var rows = [];
    qsa(SEL.chatListRow).forEach(function (row) {
      if (isOurUi(row) || !isVisible(row)) return;
      var text = (row.textContent || "").replace(/\s+/g, " ").trim();
      var img = qs("img", row);
      rows.push({
        el: row,
        title: text.slice(0, 60) || "Chat",
        avatar: img ? img.currentSrc || img.src || "" : "",
        preview: text
      });
    });
    return rows.slice(0, 40);
  }

  function renderMessengerBody(body) {
    body.innerHTML = "";

    if (messengerMode === "notes" && !isChatThreadOpen()) {
      var notes = getNotesMap();
      var keys = Object.keys(notes);
      if (!keys.length) {
        var emptyN = document.createElement("div");
        emptyN.textContent = "No notes yet. Open a chat or profile and add notes in the profile panel.";
        Object.assign(emptyN.style, {
          color: THEME.textMute,
          fontSize: "13px",
          lineHeight: "1.45",
          padding: "8px 2px"
        });
        body.appendChild(emptyN);
        return;
      }
      keys.forEach(function (key) {
        var card = document.createElement("div");
        Object.assign(card.style, {
          padding: "10px 12px",
          borderRadius: "12px",
          border: "1px solid " + THEME.border,
          background: THEME.chipBg,
          marginBottom: "8px"
        });
        var k = document.createElement("div");
        k.textContent = key.indexOf(":") >= 0 ? key.split(":").slice(1).join(":") : key;
        Object.assign(k.style, {
          fontSize: "12px",
          fontWeight: "600",
          color: THEME.gold,
          marginBottom: "4px"
        });
        var v = document.createElement("div");
        v.textContent = notes[key];
        Object.assign(v.style, { fontSize: "13px", color: THEME.textDim, whiteSpace: "pre-wrap" });
        card.appendChild(k);
        card.appendChild(v);
        body.appendChild(card);
      });
      return;
    }

    if (isChatThreadOpen()) {
      var threadHint = document.createElement("div");
      Object.assign(threadHint.style, {
        color: THEME.textMute,
        fontSize: "12px",
        marginBottom: "10px",
        lineHeight: "1.4"
      });
      threadHint.textContent =
        "Active chat is open on Sniffies. Use the composer below — messages send through the native chat.";
      body.appendChild(threadHint);

      var recent = getRecentChatTexts().slice(-6);
      recent.forEach(function (t) {
        var bubble = document.createElement("div");
        bubble.textContent = t;
        Object.assign(bubble.style, {
          padding: "8px 11px",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid " + THEME.border,
          color: THEME.textDim,
          fontSize: "12.5px",
          marginBottom: "6px",
          lineHeight: "1.35"
        });
        body.appendChild(bubble);
      });

      var userKey = activeUserKey();
      if (userKey) {
        var noteBox = document.createElement("textarea");
        noteBox.placeholder = "Private notes for this chat…";
        noteBox.value = getNote(userKey);
        Object.assign(noteBox.style, {
          width: "100%",
          minHeight: "72px",
          marginTop: "10px",
          resize: "vertical",
          padding: "10px 12px",
          borderRadius: "12px",
          border: "1px solid " + THEME.border,
          background: "rgba(255,255,255,0.03)",
          color: THEME.text,
          fontSize: "13px",
          fontFamily: "-apple-system, system-ui, sans-serif",
          boxSizing: "border-box",
          outline: "none"
        });
        noteBox.onblur = function () {
          setNote(userKey, noteBox.value);
        };
        body.appendChild(noteBox);
      }
      return;
    }

    var rows = scrapeChatListRows();
    if (!rows.length) {
      var empty = document.createElement("div");
      empty.textContent = "Open Chats to load threads, or use Pinned / Saved above.";
      Object.assign(empty.style, { color: THEME.textMute, fontSize: "13px", lineHeight: "1.45" });
      body.appendChild(empty);
      var openBtn = makeBtn(
        "Open Chats",
        function () {
          messengerMode = "chats";
          cmdOpenChats();
        },
        { color: THEME.accent, compact: true }
      );
      openBtn.style.marginTop = "12px";
      body.appendChild(openBtn);
      return;
    }

    rows.forEach(function (row) {
      var item = document.createElement("button");
      item.type = "button";
      Object.assign(item.style, {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "10px",
        marginBottom: "6px",
        borderRadius: "12px",
        border: "1px solid " + THEME.border,
        background: THEME.chipBg,
        cursor: "pointer",
        color: THEME.text,
        textAlign: "left",
        fontFamily: "-apple-system, system-ui, sans-serif"
      });
      if (row.avatar) {
        var av = document.createElement("img");
        av.src = row.avatar;
        Object.assign(av.style, {
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: "0"
        });
        item.appendChild(av);
      }
      var txt = document.createElement("div");
      txt.style.flex = "1";
      txt.style.minWidth = "0";
      var title = document.createElement("div");
      title.textContent = row.title;
      Object.assign(title.style, {
        fontSize: "13px",
        fontWeight: "600",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      });
      txt.appendChild(title);
      item.appendChild(txt);
      item.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        try {
          row.el.click();
          shellDirty = true;
          setTimeout(function () {
            renderShell(resolveViewState());
          }, 200);
        } catch (err) {}
      });
      body.appendChild(item);
    });
  }

  function renderMessenger() {
    var pane = ensureMessenger();
    var existingComposerText = "";
    var prevTa = getComposerTextarea();
    if (prevTa) existingComposerText = prevTa.value || "";

    pane.innerHTML = "";

    var top = document.createElement("div");
    top.className = "sniffies-chrome";
    Object.assign(top.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "10px 12px",
      borderBottom: "1px solid " + THEME.border,
      flexShrink: "0",
      overflowX: "auto",
      borderRadius: "0 0 12px 12px"
    });

    function topBtn(label, mode, action) {
      var active = messengerMode === mode;
      return makeBtn(
        label,
        function () {
          messengerMode = mode;
          if (action) action();
          else {
            shellDirty = true;
            renderMessenger();
          }
        },
        { color: active ? THEME.accent : THEME.textDim, compact: true }
      );
    }

    top.appendChild(topBtn("Pinned", "pinned", cmdPinned));
    top.appendChild(topBtn("Saved", "saved", cmdSaved));
    top.appendChild(topBtn("Notes", "notes", cmdNotesList));

    var threadTitle = scrapeActiveThreadTitle();
    if (threadTitle || isChatThreadOpen()) {
      var sep = document.createElement("div");
      sep.style.flex = "1";
      top.appendChild(sep);
      var titleEl = document.createElement("div");
      titleEl.textContent = threadTitle || "Chat";
      Object.assign(titleEl.style, {
        color: THEME.text,
        fontSize: "13px",
        fontWeight: "600",
        maxWidth: "40%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        fontFamily: "-apple-system, system-ui, sans-serif"
      });
      top.appendChild(titleEl);
    }
    pane.appendChild(top);

    var body = document.createElement("div");
    // Default: let native chat list / thread receive clicks through the middle
    var passThrough = messengerMode === "chats" || messengerMode === "pinned" || messengerMode === "saved";
    if (passThrough && !isChatThreadOpen()) {
      body.className = "sniffies-pass-through";
      body.title = "Native chat list";
    } else if (messengerMode === "notes") {
      Object.assign(body.style, {
        flex: "1",
        overflow: "auto",
        padding: "12px",
        minHeight: "0",
        pointerEvents: "auto",
        background: THEME.bgPane
      });
      renderMessengerBody(body);
    } else {
      body.className = "sniffies-pass-through";
    }
    pane.appendChild(body);

    var composerHost = document.createElement("div");
    composerHost.className = "sniffies-chrome";
    composerHost.setAttribute("data-composer-host", "1");
    composerHost.style.flexShrink = "0";
    composerHost.style.pointerEvents = "auto";
    pane.appendChild(composerHost);

    if (isChatThreadOpen()) {
      renderComposer("CHAT");
      if (existingComposerText) setComposerText(existingComposerText);
    } else {
      hideComposer();
    }
  }

  // ============================================================
  // PROFILE PANEL (wide + chat)
  // ============================================================

  function ensureProfilePanel() {
    var shell = ensureShell();
    var pane = document.getElementById(PROFILE_PANEL_ID);
    if (pane) return pane;
    pane = document.createElement("div");
    pane.id = PROFILE_PANEL_ID;
    shell.appendChild(pane);
    return pane;
  }

  function renderProfilePanel() {
    var pane = ensureProfilePanel();
    if (!shouldShowThirdPanel()) {
      pane.innerHTML = "";
      return;
    }

    var meta = scrapeProfileMeta();
    var userKey = meta.key || activeUserKey();
    pane.innerHTML = "";
    Object.assign(pane.style, { position: "relative" });

    var header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "12px 14px",
      borderBottom: "1px solid " + THEME.border,
      flexShrink: "0"
    });
    var hTitle = document.createElement("div");
    hTitle.textContent = meta.name || scrapeActiveThreadTitle() || "Profile";
    Object.assign(hTitle.style, {
      flex: "1",
      fontWeight: "650",
      fontSize: "15px",
      color: THEME.text,
      fontFamily: "-apple-system, system-ui, sans-serif",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    });
    header.appendChild(hTitle);
    header.appendChild(
      makeBtn("Save", cmdFavoriteProfile, {
        color: THEME.gold,
        compact: true,
        bold: true
      })
    );
    pane.appendChild(header);

    var scroll = document.createElement("div");
    Object.assign(scroll.style, {
      flex: "1",
      overflow: "auto",
      padding: "14px",
      minHeight: "0"
    });

    if (meta.photos.length) {
      var gallery = document.createElement("div");
      Object.assign(gallery.style, {
        display: "grid",
        gridTemplateColumns: meta.photos.length > 1 ? "1fr 1fr" : "1fr",
        gap: "8px",
        marginBottom: "14px"
      });
      meta.photos.slice(0, 6).forEach(function (src) {
        var img = document.createElement("img");
        img.src = src;
        Object.assign(img.style, {
          width: "100%",
          aspectRatio: "1",
          objectFit: "cover",
          borderRadius: "12px",
          border: "1px solid " + THEME.border,
          background: "rgba(255,255,255,0.03)"
        });
        gallery.appendChild(img);
      });
      scroll.appendChild(gallery);
    } else {
      var noPic = document.createElement("div");
      noPic.textContent = "Open the native profile to load photos.";
      Object.assign(noPic.style, {
        color: THEME.textMute,
        fontSize: "13px",
        marginBottom: "12px"
      });
      scroll.appendChild(noPic);
    }

    if (meta.distance) {
      var dist = document.createElement("div");
      dist.textContent = meta.distance;
      Object.assign(dist.style, {
        color: THEME.textDim,
        fontSize: "12px",
        marginBottom: "8px"
      });
      scroll.appendChild(dist);
    }

    if (meta.bio) {
      var bio = document.createElement("div");
      bio.textContent = meta.bio;
      Object.assign(bio.style, {
        color: THEME.textDim,
        fontSize: "13px",
        lineHeight: "1.45",
        marginBottom: "14px"
      });
      scroll.appendChild(bio);
    }

    var notesLabel = document.createElement("div");
    notesLabel.textContent = "Notes";
    Object.assign(notesLabel.style, {
      color: THEME.textMute,
      fontSize: "11px",
      fontWeight: "600",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginBottom: "8px"
    });
    scroll.appendChild(notesLabel);

    var noteTa = document.createElement("textarea");
    noteTa.placeholder = "Private notes (saved locally)…";
    noteTa.value = getNote(userKey);
    Object.assign(noteTa.style, {
      width: "100%",
      minHeight: "110px",
      resize: "vertical",
      padding: "10px 12px",
      borderRadius: "12px",
      border: "1px solid " + THEME.border,
      background: "rgba(255,255,255,0.03)",
      color: THEME.text,
      fontSize: "13px",
      fontFamily: "-apple-system, system-ui, sans-serif",
      boxSizing: "border-box",
      outline: "none"
    });
    noteTa.onblur = function () {
      setNote(userKey, noteTa.value);
    };
    scroll.appendChild(noteTa);

    if (qs(SEL.profile) && isVisible(qs(SEL.profile))) {
      var chatBtn = makeBtn("Open Chat", cmdStartChat, {
        bg: THEME.accentBg,
        color: "#fff",
        bold: true,
        primary: true
      });
      chatBtn.style.width = "100%";
      chatBtn.style.marginTop = "14px";
      scroll.appendChild(chatBtn);
    }

    pane.appendChild(scroll);
  }

  function injectNativeProfileSave() {
    var profile = qs(SEL.profile);
    var existing = document.getElementById(PROFILE_SAVE_ID);
    if (!profile || !isVisible(profile) || isSplitEnabled()) {
      if (existing) existing.remove();
      return;
    }
    if (existing && profile.contains(existing)) return;
    if (existing) existing.remove();

    if (getComputedStyle(profile).position === "static") {
      profile.style.position = "relative";
    }
    var btn = makeBtn("Save", cmdFavoriteProfile, {
      color: THEME.gold,
      compact: true,
      bold: true
    });
    btn.id = PROFILE_SAVE_ID;
    Object.assign(btn.style, {
      position: "absolute",
      top: "12px",
      right: "12px",
      zIndex: "1000001"
    });
    profile.appendChild(btn);
  }

  // ============================================================
  // SHELL
  // ============================================================

  function ensureShell() {
    ensureSplitStyles();
    var shell = document.getElementById(SHELL_ID);
    if (shell) return shell;
    shell = document.createElement("div");
    shell.id = SHELL_ID;
    document.body.appendChild(shell);
    ensureLeftPane();
    ensureMessenger();
    ensureProfilePanel();
    return shell;
  }

  function destroyShell() {
    var shell = document.getElementById(SHELL_ID);
    if (shell) shell.style.display = "none";
    document.body.classList.remove(
      "sniffies-split-on",
      "sniffies-split-wide",
      "sniffies-split-chat",
      "sniffies-left-map",
      "sniffies-left-grid"
    );
    var embedded = document.getElementById(COMPOSER_ID);
    if (embedded && embedded.getAttribute("data-split-embedded") === "1") {
      embedded.remove();
    }
  }

  function applyPaneBox(el, box, opts) {
    if (!el) return;
    opts = opts || {};
    if (!box || box.width < 40 || box.height < 40) {
      el.style.display = "none";
      return;
    }
    el.style.display = opts.display || "flex";
    el.style.left = box.left + "px";
    el.style.top = box.top + "px";
    el.style.width = box.width + "px";
    el.style.height = box.height + "px";
  }

  function renderShell(state) {
    ensureSplitStyles();
    ensureHideNativeStyle();
    if (!isSplitEnabled()) {
      destroyShell();
      return;
    }

    // Native Sniffies already splits map | chat list — open it if needed
    if (!isChatListOpen() && !isChatThreadOpen()) {
      cmdOpenChats();
    }

    var layout = measureNativeLayout();
    document.documentElement.style.setProperty("--sniffies-bar-h", layout.barH + "px");

    var shell = ensureShell();
    shell.style.display = "block";
    document.body.classList.add("sniffies-split-on");
    document.body.classList.toggle("sniffies-split-wide", isWideViewport());
    document.body.classList.toggle("sniffies-split-chat", isChatThreadOpen() || !!layout.profile);

    var left = ensureLeftPane();
    var messenger = ensureMessenger();
    var profilePane = ensureProfilePanel();

    // Map column = whatever Sniffies already carved out
    if (getLeftMode() === "grid") {
      applyPaneBox(left, layout.map || layout.chat, { display: "flex" });
    } else {
      applyPaneBox(left, layout.map, { display: "block" });
    }

    // Messenger docks to the native chat list column (not an invented half-screen)
    var chatBox = layout.chat;
    if (!chatBox && layout.map) {
      // Fallback: left strip before mapFrame
      chatBox = {
        left: 0,
        top: layout.map.top,
        width: Math.max(280, layout.map.left || 360),
        height: layout.map.height
      };
    }
    if (chatBox && layout.lower) {
      // Keep above lower nav + our bar
      var maxBottom = Math.min(chatBox.bottom, layout.lower.top);
      chatBox = {
        left: chatBox.left,
        top: chatBox.top,
        width: chatBox.width,
        height: Math.max(120, maxBottom - chatBox.top),
        bottom: maxBottom,
        right: chatBox.left + chatBox.width
      };
    }
    applyPaneBox(messenger, chatBox, { display: "flex" });

    if (shouldShowThirdPanel() && layout.profile) {
      applyPaneBox(profilePane, layout.profile, { display: "flex" });
    } else if (shouldShowThirdPanel() && layout.map && chatBox) {
      // Sit on the right third when profile host isn't separately measurable
      var third = {
        left: Math.round(chatBox.left + chatBox.width),
        top: chatBox.top,
        width: Math.round(Math.min(420, Math.max(260, (layout.map.width || 800) * 0.35))),
        height: chatBox.height
      };
      applyPaneBox(profilePane, third, { display: "flex" });
    } else {
      profilePane.style.display = "none";
    }

    var layoutKey =
      (chatBox ? chatBox.left + "x" + chatBox.width : "0") +
      ":" +
      (layout.map ? layout.map.left + "x" + layout.map.width : "0") +
      ":" +
      resolveViewState() +
      ":" +
      getLeftMode();

    renderLeftPane();
    if (layoutKey !== lastLayoutKey || shellDirty) {
      renderMessenger();
      renderProfilePanel();
      lastLayoutKey = layoutKey;
    }
    shellDirty = false;
  }

  function toggleSplitView() {
    setSplitEnabled(!isSplitEnabled());
    if (!isSplitEnabled()) {
      destroyShell();
      setComposerTakeover(false);
      if (isChatThreadOpen()) renderComposer("CHAT");
      else hideComposer();
    } else {
      cmdOpenChats();
      shellDirty = true;
    }
    renderBar(resolveViewState());
  }

  function toggleLeftMode(mode) {
    if (!isSplitEnabled()) {
      showToast("Enable Split View first", "error");
      return;
    }
    setLeftMode(mode);
    renderBar(resolveViewState());
  }

  // ============================================================
  // BOTTOM BAR + SPLIT FAB (stable — never wipe mid-click)
  // ============================================================

  function makeRow() {
    var row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 10px",
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

  function ensureSplitFab() {
    var fab = document.getElementById(SPLIT_FAB_ID);
    if (fab) return fab;
    fab = document.createElement("button");
    fab.id = SPLIT_FAB_ID;
    fab.type = "button";
    Object.assign(fab.style, {
      position: "fixed",
      top: "14px",
      left: "14px",
      zIndex: "1000015",
      padding: "10px 14px",
      borderRadius: "999px",
      border: "1px solid " + THEME.border,
      background: THEME.accentBg,
      color: "#fff",
      fontSize: "13px",
      fontWeight: "700",
      fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      cursor: "pointer",
      pointerEvents: "auto",
      boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
      webkitTapHighlightColor: "transparent",
      userSelect: "none"
    });
    fab.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleSplitView();
    });
    document.body.appendChild(fab);
    return fab;
  }

  function updateSplitFab() {
    var fab = ensureSplitFab();
    var on = isSplitEnabled();
    fab.textContent = on ? "Exit Split" : "Split View";
    fab.style.background = on ? THEME.bgSolid : THEME.accentBg;
    fab.style.color = on ? THEME.accent : "#fff";
    fab.style.borderColor = on ? THEME.accent : THEME.border;
  }

  function onBarAction(cmd) {
    try {
      if (cmd === "split") toggleSplitView();
      else if (cmd === "map") {
        if (isSplitEnabled()) toggleLeftMode("map");
        else cmdGoToMap();
      } else if (cmd === "grid") {
        if (isSplitEnabled()) toggleLeftMode("grid");
        else cmdNativeMapLayers();
      } else if (cmd === "chats") {
        messengerMode = "chats";
        cmdOpenChats();
        if (isSplitEnabled()) {
          shellDirty = true;
          renderShell(resolveViewState());
        }
      } else if (cmd === "pinned") cmdPinned();
      else if (cmd === "saved") {
        if (resolveViewState() === "PROFILE") cmdFavoriteProfile();
        else cmdSaved();
      } else if (cmd === "chat") cmdStartChat();
      else if (cmd === "back") cmdBack();
      else if (cmd === "settings") renderSettingsModal();
    } catch (err) {
      console.error("[Sniffies] bar action:", err);
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
      boxShadow: "0 -12px 40px rgba(0,0,0,0.35)",
      backdropFilter: "blur(18px) saturate(1.2)",
      webkitBackdropFilter: "blur(18px) saturate(1.2)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      pointerEvents: "auto"
    });

    var navRow = makeRow();
    navRow.setAttribute("data-nav-row", "1");
    navRow.style.paddingTop = "10px";
    navRow.style.paddingBottom = "10px";

    function addCmd(label, cmd, extra) {
      var b = makeBtn(label, null, Object.assign({ compact: true }, extra || {}));
      b.setAttribute("data-cmd", cmd);
      navRow.appendChild(b);
      return b;
    }

    addCmd("Split", "split");
    addCmd("Map", "map");
    addCmd("Grid", "grid");
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
      updateSplitFab();
      bar.setAttribute("data-view", state || "MAP");

      var splitOn = isSplitEnabled();
      var leftMode = getLeftMode();
      var btns = {};
      qsa("[data-cmd]", bar).forEach(function (b) {
        btns[b.getAttribute("data-cmd")] = b;
      });

      setBtnTone(btns.split, splitOn, THEME.textDim);
      if (btns.split) btns.split.textContent = splitOn ? "Split ●" : "Split";

      setBtnTone(
        btns.map,
        splitOn ? leftMode === "map" : state === "MAP",
        THEME.textDim
      );
      setBtnTone(btns.grid, splitOn && leftMode === "grid", THEME.textDim);
      setBtnTone(btns.chats, state === "CHATS_LIST" || state === "CHAT", THEME.text);

      if (btns.pinned) btns.pinned.style.display = splitOn ? "none" : "";
      if (btns.saved) {
        btns.saved.style.display = splitOn ? "none" : "";
        btns.saved.textContent = state === "PROFILE" ? "Save" : "Saved";
      }
      if (btns.chat) btns.chat.style.display = !splitOn && state === "PROFILE" ? "" : "none";

      document.documentElement.style.setProperty(
        "--sniffies-bar-h",
        Math.ceil(bar.getBoundingClientRect().height || 58) + "px"
      );

      if (splitOn) {
        renderShell(state);
      } else {
        destroyShell();
        renderComposer(state);
        injectNativeProfileSave();
      }
    } catch (e) {
      console.error("[Sniffies] render error:", e);
    }
  }

  // ============================================================
  // BOOT
  // ============================================================

  function boot() {
    var lastState = null;
    var lastSplit = null;
    var lastWide = null;
    var lastLeft = null;
    var lastChat = null;
    var scheduled = false;
    var renderLockUntil = 0;

    var tick = function () {
      scheduled = false;
      try {
        if (Date.now() < renderLockUntil) return;

        var state = resolveViewState();
        var splitOn = isSplitEnabled();
        var wide = isWideViewport();
        var left = getLeftMode();
        var chat = isChatThreadOpen();

        var changed =
          state !== lastState ||
          splitOn !== lastSplit ||
          wide !== lastWide ||
          left !== lastLeft ||
          chat !== lastChat ||
          shellDirty ||
          !document.getElementById(BAR_ID) ||
          !document.getElementById(SPLIT_FAB_ID);

        if (changed) {
          renderBar(state);
          lastState = state;
          lastSplit = splitOn;
          lastWide = wide;
          lastLeft = left;
          lastChat = chat;
          shellDirty = false;
        } else {
          updateSplitFab();
          if (splitOn) {
            // Re-dock to live DOM geometry (chat list width changes)
            renderShell(state);
            if (chat) setComposerTakeover(true);
          } else if (state === "CHAT") {
            var comp = document.getElementById(COMPOSER_ID);
            if (!comp || comp.style.display === "none") renderComposer("CHAT");
            else setComposerTakeover(true);
            injectNativeProfileSave();
          } else {
            hideComposer();
            injectNativeProfileSave();
          }
        }
      } catch (e) {
        console.error("[Sniffies] tick error:", e);
      }
    };

    var schedule = function () {
      if (scheduled) return;
      scheduled = true;
      setTimeout(tick, 250);
    };

    // Lock renders briefly after pointerdown on our UI so clicks aren't wiped
    document.addEventListener(
      "pointerdown",
      function (e) {
        if (isOurUi(e.target)) renderLockUntil = Date.now() + 600;
      },
      true
    );

    // Poll instead of watching every map marker mutation
    setInterval(schedule, 700);
    window.addEventListener("popstate", schedule);
    window.addEventListener("resize", schedule);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", schedule);
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModals();
    });

    ensureSplitFab();
    tick();
    setTimeout(tick, 800);

    window.__sniffiesIntentBarApi = {
      resolveViewState: resolveViewState,
      measureNativeLayout: measureNativeLayout,
      findChatListHost: findChatListHost,
      findMap: findMap,
      renderBar: renderBar,
      renderComposer: renderComposer,
      renderShell: renderShell,
      refreshAiSuggestions: refreshAiSuggestions,
      isSplitEnabled: isSplitEnabled,
      getLeftMode: getLeftMode,
      toggleSplitView: toggleSplitView,
      SEL: SEL
    };

    console.log("[Sniffies] Intent Bar 5.2.0 — DOM-adaptive Split");
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
