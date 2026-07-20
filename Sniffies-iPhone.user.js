// ==UserScript==
// @name         Sniffies Intent Bar (iPhone)
// @namespace    http://tampermonkey.net/
// @version      1.3.1
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

  var VERSION = "1.3.1";
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
  var MAX_AI_NOTES = 600;
  var MAX_AI_SUGGESTIONS = 6;
  var MAX_Q_ANSWER = 220;
  var PHOTOS_STYLE_ID = "sniffies-iphone-photos-style";
  var SAFE_STYLE_ID = "sniffies-iphone-safe-area";
  var SEND_PICS_COUNT = 6;
  var sendingPics = false;
  var nativePhotosOpen = false;

  /**
   * Tap-to-add vibe / logistics chips for Sniffies chats.
   * tag = stored in notes · reply = chat-ready expansion shown as a suggestion.
   */
  var VIBE_LOGISTICS_CATALOG = [
    {
      cat: "Role",
      items: [
        { tag: "vers", reply: "Vers here." },
        { tag: "top", reply: "Top here." },
        { tag: "bottom", reply: "Bottom here." },
        { tag: "vers top", reply: "Vers top." },
        { tag: "vers bttm", reply: "Vers bottom." },
        { tag: "oral", reply: "Oral-focused." },
        { tag: "side", reply: "Side — no anal." },
        { tag: "versatile", reply: "Versatile / open." }
      ]
    },
    {
      cat: "Place",
      items: [
        { tag: "can host", reply: "I can host." },
        { tag: "can't host", reply: "Can't host — you?" },
        { tag: "travel", reply: "I can travel." },
        { tag: "carplay", reply: "Carplay works." },
        { tag: "hotel", reply: "Hotel — you nearby?" },
        { tag: "nearby only", reply: "Nearby only." },
        { tag: "private place", reply: "I've got a private spot." },
        { tag: "hosting now", reply: "Hosting now." }
      ]
    },
    {
      cat: "Pics",
      items: [
        { tag: "no face first", reply: "No face pics first." },
        { tag: "face ok", reply: "Face is fine." },
        { tag: "trade pics", reply: "Wanna trade pics?" },
        { tag: "more pics", reply: "Got more pics?" },
        { tag: "stats in pics", reply: "Stats are in my pics." },
        { tag: "live pic", reply: "Send a live one?" },
        { tag: "body pics", reply: "Body pics?" }
      ]
    },
    {
      cat: "Timing",
      items: [
        { tag: "free now", reply: "Free now." },
        { tag: "tonight", reply: "Tonight work?" },
        { tag: "after 10", reply: "Free after 10." },
        { tag: "quick", reply: "Looking for something quick." },
        { tag: "weekends", reply: "Mostly weekends." },
        { tag: "late night", reply: "Late night works." },
        { tag: "soon", reply: "Can do soon." },
        { tag: "short window", reply: "I've got a short window." }
      ]
    },
    {
      cat: "Vibe",
      items: [
        { tag: "discreet", reply: "Discreet here." },
        { tag: "NSA", reply: "NSA." },
        { tag: "chill", reply: "Chill vibe." },
        { tag: "masc", reply: "Masc here." },
        { tag: "hairy", reply: "Hairy here." },
        { tag: "smooth", reply: "Smooth here." },
        { tag: "jock", reply: "Jock vibe." },
        { tag: "daddy", reply: "Daddy type." },
        { tag: "twink", reply: "Twink here." },
        { tag: "hung", reply: "Hung." }
      ]
    },
    {
      cat: "Looking",
      items: [
        { tag: "looking now", reply: "Looking now." },
        { tag: "hosting", reply: "Hosting — come through?" },
        { tag: "cruising", reply: "Cruising nearby." },
        { tag: "JO", reply: "JO?" },
        { tag: "fuck", reply: "Looking to fuck." },
        { tag: "head", reply: "Looking for head." },
        { tag: "make out", reply: "Make out / more?" },
        { tag: "recurring", reply: "Open to recurring." }
      ]
    },
    {
      cat: "Boundaries",
      items: [
        { tag: "safe only", reply: "Safe only." },
        { tag: "no rush", reply: "No rush." },
        { tag: "ask first", reply: "Ask before anything." },
        { tag: "condoms", reply: "Condoms." },
        { tag: "DDF", reply: "DDF." },
        { tag: "on PrEP", reply: "On PrEP." },
        { tag: "no drugs", reply: "No drugs." },
        { tag: "sober", reply: "Sober meet." }
      ]
    }
  ];

  /** Sniffies-scene reply personalities (cruising / map chat). */
  var AI_PERSONALITIES = {
    cruiser: {
      id: "cruiser",
      label: "Cruiser",
      blurb: "Map-native — short, confident, scene-aware.",
      prompt:
        "Write short Sniffies chat replies for gay cruising / hookups on a map app. Sound like someone already on the map: brief, confident, logistics-aware (host / travel / now). No essays, no corporate tone, no moralizing."
    },
    direct: {
      id: "direct",
      label: "Direct",
      blurb: "Straight to intent and logistics.",
      prompt:
        "Write very direct Sniffies replies. Ask what you need (pics, place, timing, role) in one short line. No small talk padding."
    },
    chill: {
      id: "chill",
      label: "Chill",
      blurb: "Low-pressure, casual, easygoing.",
      prompt:
        "Write chill, low-pressure Sniffies replies. Friendly and casual, never pushy. Keep it short and easy to answer."
    },
    flirty: {
      id: "flirty",
      label: "Flirty",
      blurb: "Playful tease — still short.",
      prompt:
        "Write flirty, playful Sniffies replies with light tease. Keep it hot but short; still move toward pics / meet / now when it fits."
    },
    discreet: {
      id: "discreet",
      label: "Discreet",
      blurb: "Privacy-first, careful wording.",
      prompt:
        "Write discreet Sniffies replies. Privacy-first, careful wording, no explicit detail in openers. Confirm discretion, timing, and place carefully."
    },
    host: {
      id: "host",
      label: "Host",
      blurb: "Place / hosting logistics first.",
      prompt:
        "Write Sniffies replies focused on hosting and place logistics — can you host, when, how far, clean/private. Keep it short and practical."
    },
    custom: {
      id: "custom",
      label: "Custom",
      blurb: "Uses your notes as the vibe guide.",
      prompt:
        "Write short Sniffies cruising-chat replies. Follow the user's custom personality notes closely while staying brief and chat-native."
    }
  };
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
    favorites: { icon: "pin", label: "Pinned" },
    chats: { icon: "chat", label: "Chats" },
    map: { icon: "map", label: "Map" },
    settings: { icon: "sliders", label: "Settings" },
    pinned: { icon: "pin", label: "Pinned" },
    message: { icon: "send", label: "Message" },
    details: { icon: "info", label: "Details" },
    send: { icon: "send", label: "Send" },
    pics: { icon: "photos", label: "Photos" },
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
    // Cleaner than gear: three horizontal sliders
    sliders:
      '<path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="9" cy="7.5" r="1.85" fill="currentColor"/><circle cx="15" cy="12" r="1.85" fill="currentColor"/><circle cx="11" cy="16.5" r="1.85" fill="currentColor"/>',
    pin:
      '<path d="M12 21V11.5M9.2 5.8a3.4 3.4 0 0 1 5.6 0l.9 1.35H8.3L9.2 5.8zM8.3 7.15h7.4v1.6a2.2 2.2 0 0 1-2.2 2.2h-3a2.2 2.2 0 0 1-2.2-2.2v-1.6z" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>',
    block:
      '<circle cx="12" cy="12" r="8.1" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7.1 7.1 16.9 16.9" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>',
    info:
      '<circle cx="12" cy="12" r="8.1" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 10.85V16.4M12 7.7h.01" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"/>',
    // Stacked photos (gallery) — send-pics wiring comes later
    photos:
      '<rect x="7.2" y="5.2" width="11.2" height="9.4" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="4.6" y="8.4" width="11.2" height="9.4" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
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
    aiEndpoint: "",
    aiPersonality: "cruiser",
    aiNotes: "",
    aiQuestionnaire: {}
  };

  /**
   * Playbook questionnaire — teaches AI how you answer common Sniffies questions
   * and how to react when they reply a certain way.
   */
  var AI_QUESTIONNAIRE = [
    {
      id: "role",
      section: "About you",
      q: "Your role?",
      type: "choice",
      options: ["Top", "Bottom", "Vers top", "Vers bottom", "Vers", "Oral / side", "Depends"]
    },
    {
      id: "hosting",
      section: "About you",
      q: "Hosting?",
      type: "choice",
      options: ["Can host", "Sometimes host", "Can't host — travel", "Carplay", "Hotel", "Depends"]
    },
    {
      id: "face_pics",
      section: "About you",
      q: "Face pics?",
      type: "choice",
      options: ["Yes", "After trade", "No / blur only", "Ask first"]
    },
    {
      id: "timing",
      section: "About you",
      q: "When are you usually free?",
      type: "choice",
      options: ["Now / spontaneous", "Nights", "Late night", "Weekends", "Plan ahead"]
    },
    {
      id: "safer",
      section: "About you",
      q: "Safer-sex default?",
      type: "choice",
      options: ["Condoms", "On PrEP", "DDF / ask", "Negotiable", "Prefer not to say"]
    },
    {
      id: "react_host_ask",
      section: "When they ask…",
      q: "“Host or travel?”",
      type: "text",
      placeholder: "e.g. I can host downtown — how far are you?"
    },
    {
      id: "react_pics_ask",
      section: "When they ask…",
      q: "“Got pics?” / “Trade?”",
      type: "text",
      placeholder: "e.g. Yeah — trade? No face first."
    },
    {
      id: "react_wyd",
      section: "When they ask…",
      q: "“Wyd?” / “Free?”",
      type: "text",
      placeholder: "e.g. Free now if you're close."
    },
    {
      id: "react_into",
      section: "When they ask…",
      q: "“What are you into?”",
      type: "text",
      placeholder: "e.g. Vers, chill, looking for now."
    },
    {
      id: "react_stats",
      section: "When they ask…",
      q: "Stats / age / height?",
      type: "text",
      placeholder: "e.g. Check my pics — or list your line."
    },
    {
      id: "react_good_pics",
      section: "When they…",
      q: "Send pics you like",
      type: "text",
      placeholder: "e.g. Fuck yes — you free to come through?"
    },
    {
      id: "react_bad_fit",
      section: "When they…",
      q: "Aren't a fit / you want out",
      type: "text",
      placeholder: "e.g. All good, not feeling it — take care."
    },
    {
      id: "react_flake",
      section: "When they…",
      q: "Go quiet or flake",
      type: "text",
      placeholder: "e.g. Still free for a bit if you're around."
    },
    {
      id: "react_pushy",
      section: "When they…",
      q: "Get pushy (face / meet / now)",
      type: "text",
      placeholder: "e.g. Slow down — I'm discreet."
    },
    {
      id: "react_coming",
      section: "When they…",
      q: "Say they're on the way",
      type: "text",
      placeholder: "e.g. Bet — text when you're outside."
    },
    {
      id: "dealbreakers",
      section: "Boundaries",
      q: "Hard no's / dealbreakers",
      type: "text",
      placeholder: "e.g. No drugs, no face until we meet, no rush."
    }
  ];

  var THEME = {
    bg: "rgba(12, 14, 18, 0.92)",
    bgSolid: "#0c0e12",
    dockBg: "rgba(14, 16, 20, 0.94)",
    barBg: "rgba(14, 16, 20, 0.96)",
    barText: "rgba(242, 244, 248, 0.92)",
    barMute: "rgba(154, 163, 178, 0.78)",
    barActive: "#6eb0ff",
    sidebarBg: "rgba(18, 20, 26, 0.82)",
    sidebarBorder: "rgba(255,255,255,0.12)",
    border: "rgba(255,255,255,0.10)",
    borderHover: "rgba(255,255,255,0.18)",
    text: "#f2f4f8",
    textDim: "#9aa3b2",
    textMute: "#6b7380",
    accent: "#6eb0ff",
    accentBg: "#2f6fed",
    gold: "#f0a43a",
    green: "#3dd68c",
    danger: "#f07178",
    chipBg: "rgba(255,255,255,0.07)",
    chipBgHover: "rgba(255,255,255,0.13)",
    inputBg: "rgba(255,255,255,0.06)",
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

  function sanitizeAiPersonality(id) {
    var key = stripControls(id).trim().toLowerCase();
    return AI_PERSONALITIES[key] ? key : DEFAULTS.aiPersonality;
  }

  function sanitizeAiNotes(notes) {
    return stripControls(notes).trim().slice(0, MAX_AI_NOTES);
  }

  function questionnaireById(id) {
    for (var i = 0; i < AI_QUESTIONNAIRE.length; i++) {
      if (AI_QUESTIONNAIRE[i].id === id) return AI_QUESTIONNAIRE[i];
    }
    return null;
  }

  function sanitizeQuestionnaire(raw) {
    var out = {};
    if (!raw || typeof raw !== "object") return out;
    for (var i = 0; i < AI_QUESTIONNAIRE.length; i++) {
      var q = AI_QUESTIONNAIRE[i];
      var val = raw[q.id];
      if (val == null) continue;
      var text = stripControls(val).trim().slice(0, MAX_Q_ANSWER);
      if (!text) continue;
      if (q.type === "choice" && q.options && q.options.indexOf(text) === -1) {
        // Allow custom typed answers that aren't exact option matches
        text = text.slice(0, MAX_Q_ANSWER);
      }
      out[q.id] = text;
    }
    return out;
  }

  function formatQuestionnairePlaybook(answers) {
    answers = sanitizeQuestionnaire(answers);
    var lines = [];
    var section = "";
    for (var i = 0; i < AI_QUESTIONNAIRE.length; i++) {
      var q = AI_QUESTIONNAIRE[i];
      var ans = answers[q.id];
      if (!ans) continue;
      if (q.section && q.section !== section) {
        section = q.section;
        lines.push(section + ":");
      }
      if (q.id.indexOf("react_") === 0) {
        lines.push("- If they " + q.q.replace(/^[“"]|[”"]$/g, "") + " → reply like: " + ans);
      } else {
        lines.push("- " + q.q + " " + ans);
      }
    }
    return lines.join("\n");
  }

  function getAiPersonality() {
    var state = loadState();
    var id = sanitizeAiPersonality(state.aiPersonality);
    var base = AI_PERSONALITIES[id] || AI_PERSONALITIES.cruiser;
    var notes = sanitizeAiNotes(state.aiNotes);
    var questionnaire = sanitizeQuestionnaire(state.aiQuestionnaire);
    var playbook = formatQuestionnairePlaybook(questionnaire);
    var prompt = base.prompt;
    if (notes) {
      prompt +=
        " User notes (treat as my vibe / boundaries / logistics): " + notes;
    }
    if (playbook) {
      prompt +=
        "\n\nUser Sniffies playbook (follow closely for answers & reactions):\n" +
        playbook;
    }
    return {
      id: base.id,
      label: base.label,
      blurb: base.blurb,
      prompt: prompt,
      notes: notes,
      questionnaire: questionnaire,
      playbook: playbook
    };
  }

  function normalizeState(parsed) {
    if (!parsed || typeof parsed !== "object") parsed = {};
    parsed.quickMessages = sanitizeQuickMessages(parsed.quickMessages);
    if (typeof parsed.aiEnabled !== "boolean") parsed.aiEnabled = DEFAULTS.aiEnabled;
    parsed.aiEndpoint = sanitizeAiEndpoint(
      typeof parsed.aiEndpoint === "string" ? parsed.aiEndpoint : DEFAULTS.aiEndpoint
    );
    parsed.aiPersonality = sanitizeAiPersonality(
      typeof parsed.aiPersonality === "string"
        ? parsed.aiPersonality
        : DEFAULTS.aiPersonality
    );
    parsed.aiNotes = sanitizeAiNotes(
      typeof parsed.aiNotes === "string" ? parsed.aiNotes : DEFAULTS.aiNotes
    );
    parsed.aiQuestionnaire = sanitizeQuestionnaire(parsed.aiQuestionnaire);
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

  /** True if a meaningful part of the element is on-screen (not parked off-canvas). */
  function isOnScreen(el, minPx) {
    if (!isVisible(el)) return false;
    minPx = minPx == null ? 48 : minPx;
    var r = el.getBoundingClientRect();
    var vw = window.innerWidth || 1;
    var vh = window.innerHeight || 1;
    var visibleW = Math.min(r.right, vw) - Math.max(r.left, 0);
    var visibleH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return visibleW >= minPx && visibleH >= minPx;
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

  function isComposerTakeoverOn() {
    return !!(document.body && document.body.classList.contains("sniffies-iphone-composer-takeover"));
  }

  function findChatComposerPanel() {
    var visible = firstVisible(SEL.chatInputPanel);
    if (visible) return visible;
    // Takeover parks the native panel at 1×1 / off-screen — still a chat surface
    if (isComposerTakeoverOn()) {
      var parked =
        qs("[data-testid='chatInputPanel']") ||
        qs("#chat-input-panel") ||
        qs("app-chat-input");
      if (parked && !isOurUi(parked)) return parked;
    }
    return null;
  }

  function findProfileHost() {
    // Prefer a profile that is actually on-screen. Parked app-profile nodes
    // often stay in the DOM during private chat and were stealing CHAT detection.
    var hosts = qsa(SEL.profile);
    var i;
    for (i = 0; i < hosts.length; i++) {
      if (!isOurUi(hosts[i]) && isOnScreen(hosts[i], 80)) return hosts[i];
    }

    var headline =
      firstVisible('[data-testid="profileHeadlineTableContainer"]') ||
      firstVisible('[data-testid*="profileHeadline"]') ||
      firstVisible('[data-testid*="ProfileHeadline"]') ||
      firstVisible('[data-testid="profileCruiserFullStatsContainer"]') ||
      firstVisible("profile-cruiser-stats-container");
    if (headline && isOnScreen(headline, 40)) {
      return (
        headline.closest("app-profile") ||
        headline.closest('[class*="profile"]') ||
        headline
      );
    }

    // Title alone is too weak if a chat composer is the active surface
    var t = titleHint();
    if (
      (t.indexOf("cruiser profile") !== -1 || t.indexOf("registered cruiser") !== -1) &&
      !findChatComposerPanel()
    ) {
      for (i = 0; i < hosts.length; i++) {
        if (!isOurUi(hosts[i]) && isVisible(hosts[i])) return hosts[i];
      }
    }
    return null;
  }

  function findPrivateChatSurface() {
    // Strong signals of an individual chat thread (not profile Message box)
    return (
      firstVisible('[data-testid="privateChat"], [data-testid="chatThread"], app-private-chat, app-chat-thread') ||
      firstVisible('[class*="private-chat"], [class*="privateChat"], [class*="chat-thread"], [class*="chatThread"]') ||
      firstVisible('[data-testid="chatHistory"], [class*="chat-history"], [class*="chatHistory"]')
    );
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

  /** /profile/:id/chat — private thread URL (no trailing slash required). */
  function isProfileChatPath() {
    return /\/profile\/[^/]+\/chat\/?$/i.test(location.pathname || "");
  }

  function isChatListOpen() {
    if (isProfileChatPath()) return false;
    if (findChatListHost()) return true;
    if (firstVisible(SEL.chatListRow) || firstVisible(SEL.chatListTab)) return true;
    var t = titleHint();
    // Bare /chat is the list — not /profile/:id/chat
    return t.indexOf("chat list") !== -1 || /^\/chat\/?$/i.test(location.pathname || "");
  }

  function isChatThreadOpen() {
    var profile = findProfileHost();
    var panel = findChatComposerPanel();
    var area = getNativeChatTextArea();
    var thread = findPrivateChatSurface();
    var t = titleHint();
    var path = (location.pathname || "").toLowerCase();
    var takeover = isComposerTakeoverOn();

    // Profile private-chat route always wins (dump: view was wrongly PROFILE on this URL)
    if (isProfileChatPath()) return true;

    // Explicit private-chat surfaces win even if a parked profile exists
    if (thread && isOnScreen(thread, 60)) return true;
    if (/private chat|conversation/.test(t) && (panel || area)) return true;
    // /chat/… thread paths (not bare /chat list)
    if (/\/chat\//.test(path) && (panel || area || takeover)) return true;

    // Active on-screen profile with an inline Message box is PROFILE, not CHAT
    if (profile) return false;

    // During takeover the native panel is intentionally off-screen — stay in CHAT
    // only while that panel/textarea still exists in the DOM.
    if (takeover && (panel || area)) return true;

    if (panel && isOnScreen(panel, 24)) return true;
    if (area && isOnScreen(area, 20)) return true;
    return false;
  }

  function resolveViewState() {
    // If a private chat thread/composer is the active surface, prefer CHAT
    // even when a parked app-profile remains in the DOM.
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
      padding: opts.compact ? "5px 11px" : "10px 14px",
      minHeight: opts.compact ? "30px" : "40px",
      borderRadius: "999px",
      cursor: "pointer",
      fontSize: opts.compact ? "12px" : "13px",
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

  function makeMarkChip(opts) {
    opts = opts || {};
    var b = document.createElement("button");
    b.type = "button";
    var label = opts.label || opts.title || "Quick";
    b.setAttribute("aria-label", label);
    b.title = opts.title || label;
    if (opts.icon) {
      b.appendChild(makeSvgIcon(opts.icon, 14));
    } else {
      b.textContent = opts.mark != null ? opts.mark : "·";
    }
    Object.assign(b.style, {
      width: opts.wide ? "auto" : "28px",
      minWidth: "28px",
      height: "28px",
      minHeight: "28px",
      padding: opts.wide ? "0 8px" : "0",
      margin: "0",
      border: "1px solid " + (opts.border || THEME.border),
      borderRadius: "999px",
      background: opts.bg || THEME.chipBg,
      color: opts.color || THEME.textDim,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0",
      fontSize: opts.icon ? "0" : "13px",
      fontWeight: "600",
      letterSpacing: opts.icon ? "0" : "0.06em",
      lineHeight: "1",
      cursor: "pointer",
      flexShrink: "0",
      webkitTapHighlightColor: "transparent",
      userSelect: "none",
      touchAction: "manipulation"
    });
    if (opts.action) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        opts.action(e);
      });
    }
    return b;
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
        bottom: "calc(var(--sniffies-iphone-dock-h, 96px) + 12px)",
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

  /** Make env(safe-area-inset-*) resolve on iOS Safari (notch / home indicator). */
  function ensureViewportFitCover() {
    try {
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "viewport");
        meta.setAttribute(
          "content",
          "width=device-width, initial-scale=1, viewport-fit=cover"
        );
        document.head.appendChild(meta);
        return;
      }
      var content = meta.getAttribute("content") || "";
      if (!/viewport-fit\s*=\s*cover/i.test(content)) {
        meta.setAttribute(
          "content",
          content.replace(/\s*$/, "") + (content ? ", " : "") + "viewport-fit=cover"
        );
      }
    } catch (e) {}
  }

  /**
   * Pin our dock to the hardware safe area.
   * Bar sits on bottom:0 with inset padding; composer stacks above measured bar height
   * (do NOT force composer bottom:0 — that would cover the nav bar).
   */
  function ensureSafeAreaStyle() {
    ensureViewportFitCover();
    if (document.getElementById(SAFE_STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = SAFE_STYLE_ID;
    style.textContent =
      ":root {" +
      "  --sniffies-safe-bottom: env(safe-area-inset-bottom, 0px);" +
      "  --sniffies-safe-top: env(safe-area-inset-top, 0px);" +
      "}" +
      "#" +
      BAR_ID +
      "{" +
      "  position: fixed !important;" +
      "  left: 0 !important;" +
      "  right: 0 !important;" +
      "  bottom: 0 !important;" +
      "  margin-bottom: 0 !important;" +
      "  padding-bottom: calc(6px + var(--sniffies-safe-bottom)) !important;" +
      "  box-sizing: border-box !important;" +
      "}" +
      "#" +
      COMPOSER_ID +
      "[data-dock='1'] {" +
      "  position: fixed !important;" +
      "  left: 0 !important;" +
      "  right: 0 !important;" +
      "  bottom: var(--sniffies-iphone-bar-h, 52px) !important;" +
      "  margin-bottom: 0 !important;" +
      "  box-sizing: border-box !important;" +
      "}" +
      "#" +
      TOAST_ID +
      "{" +
      "  bottom: calc(var(--sniffies-iphone-dock-h, 96px) + 12px) !important;" +
      "}" +
      "#" +
      SETTINGS_ID +
      "," +
      "#" +
      DETAILS_ID +
      "{" +
      "  padding-bottom: var(--sniffies-safe-bottom) !important;" +
      "  box-sizing: border-box !important;" +
      "}" +
      "#" +
      SIDEBAR_ID +
      "{" +
      "  top: calc(12px + var(--sniffies-safe-top)) !important;" +
      "}";
    document.head.appendChild(style);
  }

  function ensureInsetStyle() {
    ensureSafeAreaStyle();
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
      "  padding-bottom: calc(var(--sniffies-iphone-inset-bottom, 72px) + 16px) !important;" +
      "  scroll-padding-bottom: calc(var(--sniffies-iphone-inset-bottom, 72px) + 16px) !important;" +
      "  box-sizing: border-box !important;" +
      "}" +
      "html.sniffies-iphone-has-bar app-profile {" +
      "  max-height: none !important;" +
      "}" +
      /* Chat thread must clear the composer+nav dock or latest msgs stay hidden */ +
      "html[data-sniffies-view='CHAT'] app-private-chat," +
      "html[data-sniffies-view='CHAT'] app-chat-thread," +
      "html[data-sniffies-view='CHAT'] app-messenger," +
      "html[data-sniffies-view='CHAT'] [data-testid='privateChat']," +
      "html[data-sniffies-view='CHAT'] [data-testid='chatThread']," +
      "html[data-sniffies-view='CHAT'] [data-testid='chatHistory']," +
      "html[data-sniffies-view='CHAT'] [class*='private-chat']," +
      "html[data-sniffies-view='CHAT'] [class*='privateChat']," +
      "html[data-sniffies-view='CHAT'] [class*='chat-thread']," +
      "html[data-sniffies-view='CHAT'] [class*='chatThread']," +
      "html[data-sniffies-view='CHAT'] [class*='chat-history']," +
      "html[data-sniffies-view='CHAT'] [class*='chatHistory']," +
      "html[data-sniffies-view='CHAT'] [class*='message-list']," +
      "html[data-sniffies-view='CHAT'] [class*='messageList']," +
      "html[data-sniffies-view='CHAT'] [class*='messages-container']," +
      "html[data-sniffies-view='CHAT'] [class*='messagesContainer']," +
      "body.sniffies-iphone-composer-takeover [class*='chat-messages']," +
      "body.sniffies-iphone-composer-takeover [class*='chatMessages'] {" +
      "  padding-bottom: calc(var(--sniffies-iphone-dock-h, 140px) + 20px) !important;" +
      "  scroll-padding-bottom: calc(var(--sniffies-iphone-dock-h, 140px) + 20px) !important;" +
      "  box-sizing: border-box !important;" +
      "}" +
      /* Keep the profile's native Message row above our icon bar */ +
      "html[data-sniffies-view='PROFILE'] [data-testid='chatInputPanel']," +
      "html[data-sniffies-view='PROFILE'] #chat-input-panel," +
      "html[data-sniffies-view='PROFILE'] app-chat-input {" +
      "  margin-bottom: calc(var(--sniffies-iphone-bar-h, 52px) + 10px) !important;" +
      "  position: relative !important;" +
      "  z-index: 1000012 !important;" +
      "}" +
      /* Seamless dock: composer sits on the bar with no gap */ +
      "#" +
      COMPOSER_ID +
      "[data-dock='1'] {" +
      "  border-bottom: none !important;" +
      "  box-shadow: none !important;" +
      "}";
    document.head.appendChild(style);
  }

  function measureDockHeight() {
    var bar = document.getElementById(BAR_ID);
    var barH = bar ? Math.ceil(bar.getBoundingClientRect().height || 52) : 52;
    var composer = document.getElementById(COMPOSER_ID);
    var compH = 0;
    if (
      composer &&
      composer.style.display !== "none" &&
      composer.getBoundingClientRect().height > 8
    ) {
      compH = Math.ceil(composer.getBoundingClientRect().height);
    }
    return { barH: barH, compH: compH, dockH: barH + compH };
  }

  function findChatScrollRoots() {
    var roots = [];
    var seen = [];
    function add(el) {
      if (!el || seen.indexOf(el) !== -1 || isOurUi(el)) return;
      seen.push(el);
      roots.push(el);
    }
    add(findPrivateChatSurface());
    var nodes = qsa(
      "app-private-chat, app-chat-thread, app-messenger, [data-testid='chatHistory'], [class*='chat-history'], [class*='chatHistory'], [class*='message-list'], [class*='messageList'], [class*='messages-container']"
    );
    for (var i = 0; i < nodes.length; i++) {
      if (isVisible(nodes[i]) || isOnScreen(nodes[i], 20)) add(nodes[i]);
    }
    // Deepest scrollable descendants that actually hold messages
    for (var r = 0; r < roots.length; r++) {
      var kids = qsa("[class*='scroll'], [class*='Scroll'], .cdk-virtual-scroll-viewport", roots[r]);
      for (var k = 0; k < kids.length; k++) add(kids[k]);
    }
    return roots;
  }

  function scrollChatToLatest() {
    var pad = measureDockHeight().dockH + 24;
    var roots = findChatScrollRoots();
    for (var i = 0; i < roots.length; i++) {
      var el = roots[i];
      try {
        el.style.scrollPaddingBottom = pad + "px";
        if (el.scrollHeight > el.clientHeight + 8) {
          el.scrollTop = el.scrollHeight;
        }
      } catch (e) {}
    }
    // Also nudge any overflowing ancestor near the composer
    var messages = qsa(
      '[class*="chat-message"], [class*="message-body"], [data-testid="chatListMsgPreview"]'
    );
    if (messages.length) {
      var last = messages[messages.length - 1];
      if (last && !isOurUi(last)) {
        try {
          last.scrollIntoView({ block: "end", behavior: "smooth" });
        } catch (e2) {}
      }
    }
  }

  function updateContentInset() {
    ensureInsetStyle();
    ensureSafeAreaStyle();
    document.documentElement.classList.add("sniffies-iphone-has-bar");
    var m = measureDockHeight();
    var inset = m.dockH + 12;
    document.documentElement.style.setProperty("--sniffies-iphone-bar-h", m.barH + "px");
    document.documentElement.style.setProperty("--sniffies-iphone-dock-h", m.dockH + "px");
    document.documentElement.style.setProperty("--sniffies-iphone-inset-bottom", inset + "px");
    if (resolveViewState() === "CHAT" || isChatThreadOpen()) {
      requestAnimationFrame(function () {
        scrollChatToLatest();
      });
    }
  }

  function setComposerTakeover(on) {
    ensureHideNativeStyle();
    // Never park native input while the photo gallery is open
    if (nativePhotosOpen) on = false;
    if (on) document.body.classList.add("sniffies-iphone-composer-takeover");
    else document.body.classList.remove("sniffies-iphone-composer-takeover");
  }

  function ensurePhotosModeStyle() {
    if (document.getElementById(PHOTOS_STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = PHOTOS_STYLE_ID;
    style.textContent =
      "body.sniffies-iphone-native-photos #" +
      COMPOSER_ID +
      "{" +
      "  display: none !important;" +
      "  pointer-events: none !important;" +
      "  visibility: hidden !important;" +
      "}" +
      "body.sniffies-iphone-native-photos #" +
      BAR_ID +
      "{" +
      "  opacity: 0.25 !important;" +
      "  pointer-events: none !important;" +
      "}" +
      "body.sniffies-iphone-native-photos #" +
      SIDEBAR_ID +
      "{" +
      "  display: none !important;" +
      "}" +
      /* Force native chat/gallery back on-screen (undo takeover park) */ +
      "body.sniffies-iphone-native-photos [data-testid='chatInputPanel']," +
      "body.sniffies-iphone-native-photos #chat-input-panel," +
      "body.sniffies-iphone-native-photos app-chat-input {" +
      "  opacity: 1 !important;" +
      "  pointer-events: auto !important;" +
      "  position: relative !important;" +
      "  left: auto !important;" +
      "  right: auto !important;" +
      "  bottom: auto !important;" +
      "  top: auto !important;" +
      "  height: auto !important;" +
      "  width: auto !important;" +
      "  max-width: 100% !important;" +
      "  overflow: visible !important;" +
      "  transform: none !important;" +
      "  z-index: 1000025 !important;" +
      "  margin-bottom: calc(var(--sniffies-iphone-bar-h, 52px) + 12px) !important;" +
      "}" +
      "body.sniffies-iphone-native-photos .saved-image-container," +
      "body.sniffies-iphone-native-photos [class*='saved-image']," +
      "body.sniffies-iphone-native-photos [class*='photo-gallery']," +
      "body.sniffies-iphone-native-photos [class*='photoGallery']," +
      "body.sniffies-iphone-native-photos [aria-label*='Select This Photo'] {" +
      "  pointer-events: auto !important;" +
      "  opacity: 1 !important;" +
      "  visibility: visible !important;" +
      "}";
    document.head.appendChild(style);
  }

  function isNativePhotoGalleryOpen() {
    if (getSavedPhotoContainers().length) return true;
    var nodes = qsa(
      "[class*='photo-gallery'], [class*='photoGallery'], [class*='saved-image'], [aria-label*='Select This Photo'], [aria-label*='photo gallery' i]"
    );
    for (var i = 0; i < nodes.length; i++) {
      if (isOurUi(nodes[i])) continue;
      if (isVisible(nodes[i]) || isOnScreen(nodes[i], 24)) return true;
    }
    return false;
  }

  function setNativePhotosMode(on) {
    ensurePhotosModeStyle();
    nativePhotosOpen = !!on;
    if (on) {
      document.body.classList.add("sniffies-iphone-native-photos");
      setComposerTakeover(false);
      hideComposer();
      try {
        updateContentInset();
      } catch (e) {}
    } else {
      document.body.classList.remove("sniffies-iphone-native-photos");
    }
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

  /** Reply banks tuned to Sniffies chat intents × personality. */
  function sniffiesReplyBank(personalityId) {
    var banks = {
      cruiser: {
        open: [
          { label: "Sup", text: "Sup — you free?" },
          { label: "Wyd", text: "Wyd rn?" },
          { label: "Into", text: "What you into?" },
          { label: "Pics", text: "Got more pics?" }
        ],
        pics: [
          { label: "Trade", text: "Wanna trade?" },
          { label: "Send", text: "Sending now." },
          { label: "More", text: "Got a couple more?" }
        ],
        place: [
          { label: "Near", text: "I'm close — you host or travel?" },
          { label: "Host", text: "I can host." },
          { label: "Come", text: "Come through?" }
        ],
        now: [
          { label: "Now", text: "Free now — you?" },
          { label: "Lookin", text: "Looking for fun." },
          { label: "Soon", text: "Can do soon." }
        ],
        into: [
          { label: "Vers", text: "Vers, open-minded." },
          { label: "Same", text: "Same — what you looking for?" },
          { label: "Down", text: "I'm down if the vibe's right." }
        ],
        filler: [
          { label: "Nice", text: "Nice." },
          { label: "Where", text: "Where you at?" },
          { label: "Bet", text: "Bet." }
        ]
      },
      direct: {
        open: [
          { label: "Free?", text: "You free now?" },
          { label: "Host?", text: "Host or travel?" },
          { label: "Pics", text: "Send pics." },
          { label: "Into", text: "What are you looking for?" }
        ],
        pics: [
          { label: "Trade", text: "Trade now." },
          { label: "Face", text: "Face too?" },
          { label: "More", text: "Need clearer pics." }
        ],
        place: [
          { label: "Where", text: "Where exactly?" },
          { label: "Host", text: "I host — how far?" },
          { label: "Travel", text: "I can travel if you're close." }
        ],
        now: [
          { label: "Now", text: "Available now." },
          { label: "ETA", text: "How soon can you meet?" },
          { label: "Window", text: "I've got a short window." }
        ],
        into: [
          { label: "Top", text: "Top here." },
          { label: "Bttm", text: "Bottom here." },
          { label: "Role", text: "What's your role?" }
        ],
        filler: [
          { label: "Ok", text: "Ok." },
          { label: "Where", text: "Location?" },
          { label: "Yes", text: "Yes." }
        ]
      },
      chill: {
        open: [
          { label: "Hey", text: "Hey, how's it going?" },
          { label: "Wyd", text: "Wyd tonight?" },
          { label: "Vibe", text: "You looking to hang?" },
          { label: "Pics", text: "Mind sharing a couple pics?" }
        ],
        pics: [
          { label: "Sure", text: "Sure, I can send some." },
          { label: "Trade", text: "Happy to trade if you want." },
          { label: "Cool", text: "These look good." }
        ],
        place: [
          { label: "Near", text: "I'm around — you nearby too?" },
          { label: "Host", text: "I can host if that helps." },
          { label: "Easy", text: "Whatever's easiest for you." }
        ],
        now: [
          { label: "Free", text: "Pretty free if you are." },
          { label: "Later", text: "Later works too." },
          { label: "Chill", text: "Just chilling — open to plans." }
        ],
        into: [
          { label: "Open", text: "Pretty open-minded." },
          { label: "Same", text: "Same here — what are you into?" },
          { label: "See", text: "We can see if the vibe matches." }
        ],
        filler: [
          { label: "Nice", text: "Nice." },
          { label: "Cool", text: "Cool." },
          { label: "Where", text: "Where abouts are you?" }
        ]
      },
      flirty: {
        open: [
          { label: "Hey", text: "Hey you — looking good." },
          { label: "Into", text: "What are you craving?" },
          { label: "Pics", text: "Got anything hotter?" },
          { label: "Now", text: "You free to play?" }
        ],
        pics: [
          { label: "Hot", text: "Fuck, that's hot." },
          { label: "More", text: "Don't stop there…" },
          { label: "Trade", text: "I'll trade you something good." }
        ],
        place: [
          { label: "Come", text: "Come keep me company?" },
          { label: "Host", text: "I can host — door's open." },
          { label: "Close", text: "You're close… tempting." }
        ],
        now: [
          { label: "Now", text: "I'm free and thinking about you." },
          { label: "Soon", text: "Sooner the better." },
          { label: "Tonight", text: "Tonight could get fun." }
        ],
        into: [
          { label: "Vers", text: "Vers and curious — surprise me." },
          { label: "Into", text: "Tell me what you want." },
          { label: "Same", text: "I'm into that." }
        ],
        filler: [
          { label: "Mmm", text: "Mmm." },
          { label: "Yeah?", text: "Yeah?" },
          { label: "Where", text: "Where should I find you?" }
        ]
      },
      discreet: {
        open: [
          { label: "Hey", text: "Hey — discreet here." },
          { label: "Free", text: "You free for something private?" },
          { label: "Vibe", text: "Looking for low-key." },
          { label: "Chat", text: "Can chat if you're chill / discreet." }
        ],
        pics: [
          { label: "Private", text: "Can share privately." },
          { label: "Trade", text: "Trade if you stay discreet." },
          { label: "Blur", text: "Prefer no face first." }
        ],
        place: [
          { label: "Private", text: "Need somewhere private." },
          { label: "Host", text: "I can host discreetly." },
          { label: "Near", text: "Nearby and low-key?" }
        ],
        now: [
          { label: "Window", text: "I have a private window." },
          { label: "Soon", text: "Can do soon if quiet." },
          { label: "Later", text: "Later tonight works better." }
        ],
        into: [
          { label: "NSA", text: "NSA, discreet." },
          { label: "Same", text: "Same — keep it between us." },
          { label: "Simple", text: "Keeping it simple / private." }
        ],
        filler: [
          { label: "Ok", text: "Ok." },
          { label: "Understood", text: "Understood." },
          { label: "Where", text: "Rough area?" }
        ]
      },
      host: {
        open: [
          { label: "Host", text: "I can host — you travel?" },
          { label: "Free", text: "Place is free now." },
          { label: "Near", text: "How far are you?" },
          { label: "Pics", text: "Pics + ETA?" }
        ],
        pics: [
          { label: "Trade", text: "Trade, then come through." },
          { label: "Ok", text: "Pics work — when can you get here?" },
          { label: "More", text: "One more clear pic?" }
        ],
        place: [
          { label: "Host", text: "I host — private place." },
          { label: "Address", text: "I'll share the spot if you're coming." },
          { label: "Park", text: "Easy parking / drop-by." }
        ],
        now: [
          { label: "Now", text: "Place is ready now." },
          { label: "ETA", text: "What's your ETA?" },
          { label: "Hour", text: "Free for the next hour." }
        ],
        into: [
          { label: "Host", text: "Hosting — what are you looking for?" },
          { label: "Vers", text: "Vers host here." },
          { label: "Open", text: "Open if you can travel." }
        ],
        filler: [
          { label: "Come", text: "Come through." },
          { label: "Where", text: "You nearby?" },
          { label: "Ok", text: "Ok — heading here?" }
        ]
      },
      custom: {
        open: [
          { label: "Hey", text: "Hey — you free?" },
          { label: "Wyd", text: "Wyd?" },
          { label: "Into", text: "What are you into?" },
          { label: "Pics", text: "Pics?" }
        ],
        pics: [
          { label: "Trade", text: "Trade?" },
          { label: "Sure", text: "Sure." },
          { label: "More", text: "More?" }
        ],
        place: [
          { label: "Host", text: "Host or travel?" },
          { label: "Near", text: "You nearby?" },
          { label: "Where", text: "Where at?" }
        ],
        now: [
          { label: "Now", text: "Free now?" },
          { label: "Soon", text: "Soon work?" },
          { label: "Tonight", text: "Tonight?" }
        ],
        into: [
          { label: "Into", text: "What are you looking for?" },
          { label: "Same", text: "Same." },
          { label: "Down", text: "I'm down." }
        ],
        filler: [
          { label: "Ok", text: "Ok." },
          { label: "Nice", text: "Nice." },
          { label: "Where", text: "Where?" }
        ]
      }
    };
    return banks[personalityId] || banks.cruiser;
  }

  function vibeCatalogFlat() {
    var out = [];
    for (var c = 0; c < VIBE_LOGISTICS_CATALOG.length; c++) {
      var cat = VIBE_LOGISTICS_CATALOG[c];
      for (var i = 0; i < cat.items.length; i++) {
        out.push({
          cat: cat.cat,
          tag: cat.items[i].tag,
          reply: cat.items[i].reply,
          key: String(cat.items[i].tag || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim()
        });
      }
    }
    return out;
  }

  function splitVibeNoteTokens(notes) {
    if (!notes) return [];
    return String(notes)
      .split(/\n+|·|\||,|;|\/+/)
      .map(function (line) {
        return stripControls(line).trim().replace(/\s+/g, " ");
      })
      .filter(function (line) {
        return line.length >= 2 && line.length <= 140;
      });
  }

  function findVibeItemByTag(tag) {
    var key = String(tag || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!key) return null;
    var flat = vibeCatalogFlat();
    for (var i = 0; i < flat.length; i++) {
      if (flat[i].key === key) return flat[i];
    }
    // Soft match: token contains catalog tag or vice versa
    for (var j = 0; j < flat.length; j++) {
      if (key.indexOf(flat[j].key) !== -1 || flat[j].key.indexOf(key) !== -1) {
        return flat[j];
      }
    }
    return null;
  }

  /** Expand user notes into chat-ready vibe/logistics suggestion chips. */
  function notesAsSuggestionLines(notes) {
    var tokens = splitVibeNoteTokens(notes);
    var out = [];
    var seen = {};
    for (var i = 0; i < tokens.length && out.length < 8; i++) {
      var token = tokens[i];
      var hit = findVibeItemByTag(token);
      var text = hit ? hit.reply : token;
      var label = hit ? hit.tag : token.slice(0, 14);
      var key = text.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push({ label: label.slice(0, MAX_QM_LABEL), text: text, cat: hit ? hit.cat : "Notes" });
    }
    return out;
  }

  function parseNotesVibeTags(notes) {
    return splitVibeNoteTokens(notes)
      .map(function (t) {
        var hit = findVibeItemByTag(t);
        return hit ? hit.tag : t;
      })
      .slice(0, 24);
  }

  /** Context-aware vibe/logistics lines beyond the personality bank. */
  function contextVibeSuggestions(lastMessage) {
    var last = String(lastMessage || "").toLowerCase();
    var wantCats = [];
    if (!last) {
      wantCats = ["Looking", "Timing", "Role", "Place"];
    } else {
      if (/pic|photo|face|body|snap|nudes?/i.test(last)) wantCats.push("Pics", "Boundaries");
      if (/where|locat|area|near|hotel|host|place|travel|come|address|car/i.test(last)) {
        wantCats.push("Place", "Timing");
      }
      if (/wyd|up to|doing|free|now|tonight|soon|available|meet|window/i.test(last)) {
        wantCats.push("Timing", "Looking");
      }
      if (/into|like|down for|want|role|top|bottom|vers|looking|jo|fuck|head/i.test(last)) {
        wantCats.push("Role", "Looking", "Vibe");
      }
      if (/discreet|safe|condo|prep|ddf|drug|sober/i.test(last)) wantCats.push("Boundaries", "Vibe");
      if (!wantCats.length) wantCats = ["Vibe", "Looking", "Timing"];
    }

    var out = [];
    var seen = {};
    for (var c = 0; c < VIBE_LOGISTICS_CATALOG.length; c++) {
      var block = VIBE_LOGISTICS_CATALOG[c];
      if (wantCats.indexOf(block.cat) === -1) continue;
      for (var i = 0; i < block.items.length; i++) {
        var item = block.items[i];
        var key = item.reply.toLowerCase();
        if (seen[key]) continue;
        seen[key] = true;
        out.push({
          label: item.tag.slice(0, MAX_QM_LABEL),
          text: item.reply,
          cat: block.cat
        });
      }
    }
    return out;
  }

  function notesContainTag(notes, tag) {
    var key = String(tag || "")
      .toLowerCase()
      .trim();
    if (!key || !notes) return false;
    var tokens = splitVibeNoteTokens(notes).map(function (t) {
      return t.toLowerCase();
    });
    if (tokens.indexOf(key) !== -1) return true;
    return (" · " + notes.toLowerCase() + " · ").indexOf(" · " + key + " · ") !== -1;
  }

  function toggleVibeNoteTag(notes, tag) {
    var cleanTag = stripControls(tag).trim().replace(/\s+/g, " ");
    if (!cleanTag) return sanitizeAiNotes(notes);
    var tokens = splitVibeNoteTokens(notes);
    var lower = cleanTag.toLowerCase();
    var next = [];
    var removed = false;
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i].toLowerCase() === lower) {
        removed = true;
        continue;
      }
      next.push(tokens[i]);
    }
    if (!removed) next.push(cleanTag);
    return sanitizeAiNotes(next.join(" · "));
  }

  /** Prefer questionnaire reaction lines when their last message matches. */
  function questionnaireSuggestions(lastMessage) {
    var answers = sanitizeQuestionnaire(loadState().aiQuestionnaire);
    var last = String(lastMessage || "").toLowerCase();
    var out = [];
    var rules = [
      { re: /host|travel|place|come through|come thru|address|how far/i, id: "react_host_ask", label: "Host?" },
      { re: /pic|photo|trade|face|snap|nudes?/i, id: "react_pics_ask", label: "Pics" },
      { re: /wyd|free|now|tonight|available|meet|up to/i, id: "react_wyd", label: "Free?" },
      { re: /into|looking|want|down for|role/i, id: "react_into", label: "Into" },
      { re: /age|height|weight|stats|hung|cut|uncut/i, id: "react_stats", label: "Stats" },
      { re: /on (my )?way|outside|here|eta|leaving/i, id: "react_coming", label: "ETA" },
      { re: /come on|hurry|now or never|send face|prove/i, id: "react_pushy", label: "Pushy" }
    ];
    for (var i = 0; i < rules.length; i++) {
      if (!last || !rules[i].re.test(last)) continue;
      var ans = answers[rules[i].id];
      if (!ans) continue;
      out.push({ label: rules[i].label, text: ans });
    }
    // Always surface filled "about you" lines as soft suggestions when opening
    var aboutIds = ["role", "hosting", "face_pics", "timing", "safer", "dealbreakers"];
    for (var a = 0; a < aboutIds.length; a++) {
      var q = questionnaireById(aboutIds[a]);
      var val = answers[aboutIds[a]];
      if (!q || !val) continue;
      if (!last || aboutIds[a] === "dealbreakers") {
        out.push({
          label: (q.q || aboutIds[a]).replace(/\?$/, "").slice(0, 14),
          text: val
        });
      }
    }
    // Reactions that aren't tied to last msg still useful as fillers if filled
    ["react_good_pics", "react_bad_fit", "react_flake"].forEach(function (id) {
      if (!answers[id]) return;
      var meta = questionnaireById(id);
      out.push({
        label: (meta && meta.q ? meta.q : id).slice(0, 14),
        text: answers[id]
      });
    });
    return out;
  }

  function localAiSuggestions(recent) {
    var personality = getAiPersonality();
    var bank = sniffiesReplyBank(personality.id);
    var last = (recent[recent.length - 1] || "").toLowerCase();
    var out = [];

    function add(item) {
      if (!item || !item.text || out.length >= MAX_AI_SUGGESTIONS) return;
      for (var i = 0; i < out.length; i++) if (out[i].text === item.text) return;
      out.push({
        label: (item.label || item.text).slice(0, MAX_QM_LABEL),
        text: item.text
      });
    }

    // 1) Questionnaire playbook reactions (highest priority)
    questionnaireSuggestions(last).forEach(add);

    // 2) User vibe/logistics notes (expanded to chat-ready lines)
    notesAsSuggestionLines(personality.notes).forEach(add);

    // 3) Context vibe/logistics from catalog
    contextVibeSuggestions(last).forEach(add);

    if (!last) {
      (bank.open || []).forEach(add);
      return out.slice(0, MAX_AI_SUGGESTIONS);
    }

    if (/pic|photo|face|body|snap|nudes?/i.test(last)) {
      (bank.pics || []).forEach(add);
    }
    if (/where|locat|area|near|hotel|host|place|travel|come|address/i.test(last)) {
      (bank.place || []).forEach(add);
    }
    if (/wyd|up to|doing|free|now|tonight|soon|available|meet/i.test(last)) {
      (bank.now || []).forEach(add);
    }
    if (/into|like|down for|want|role|top|bottom|vers|looking/i.test(last)) {
      (bank.into || []).forEach(add);
    }

    (bank.filler || []).forEach(add);
    (bank.open || []).forEach(add);
    return out.slice(0, MAX_AI_SUGGESTIONS);
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
    var personality = getAiPersonality();

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
        context: "sniffies",
        scene: "cruising-chat",
        recentMessages: recent,
        quickMessages: loadQuickMessages(),
        personality: {
          id: personality.id,
          label: personality.label,
          prompt: personality.prompt,
          notes: personality.notes
        },
        questionnaire: personality.questionnaire || {},
        playbook: personality.playbook || "",
        vibeTags: parseNotesVibeTags(personality.notes),
        vibeLines: notesAsSuggestionLines(personality.notes),
        logistics: contextVibeSuggestions(recent[recent.length - 1] || "").slice(0, 12),
        instructions:
          "Return 4-6 short reply suggestions as JSON { suggestions: [{ label, text }] }. " +
          "Replies must fit Sniffies gay cruising / map-hookup chat: brief, chatty, logistics-aware. " +
          "Prefer questionnaire playbook answers for matching situations (host/travel, pics, free now, into, pushy, flake). " +
          "Prefer the user's vibeTags / vibeLines (role, host/travel, pics rules, timing, boundaries). " +
          "Match the personality prompt, notes, and playbook."
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
            .slice(0, MAX_AI_SUGGESTIONS);
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

  // Native profile right-rail — classify by label, then position (never guess info→gallery)
  function railLabelFor(el) {
    if (!el) return "";
    var icon = el.querySelector
      ? el.querySelector(
          "i, svg, [class*='icon'], [class*='Icon'], [class*='fa-'], [class*='sniffiesIcon']"
        )
      : null;
    return (
      (el.getAttribute("aria-label") || "") +
      " " +
      (el.getAttribute("title") || "") +
      " " +
      (el.getAttribute("data-testid") || "") +
      " " +
      (el.getAttribute("data-cy") || "") +
      " " +
      (el.className && typeof el.className === "string" ? el.className : "") +
      " " +
      (icon && icon.className && typeof icon.className === "string" ? icon.className : "") +
      " " +
      (el.textContent || "")
    )
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function isClickableRailHost(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    var tag = (el.tagName || "").toLowerCase();
    if (tag === "button" || tag === "a") return true;
    if (el.getAttribute("role") === "button") return true;
    if (el.getAttribute("tabindex") != null) return true;
    if (typeof el.onclick === "function") return true;
    if (el.hasAttribute("ng-reflect-router-link") || el.hasAttribute("routerlink")) return true;
    // Icon-only Angular hosts
    if (
      el.querySelector &&
      el.querySelector(
        "i.fa, i[class*='fa-'], [class*='sniffiesIcon'], svg, [class*='paper-plane'], [class*='paperPlane']"
      )
    ) {
      var r = el.getBoundingClientRect();
      if (r.width > 0 && r.width <= 96 && r.height > 0 && r.height <= 96) return true;
    }
    return false;
  }

  function getProfileShellRoots(profile) {
    var roots = [];
    var seen = [];
    function add(node) {
      if (!node || seen.indexOf(node) !== -1 || isOurUi(node)) return;
      if (node === document.body || node === document.documentElement) return;
      seen.push(node);
      roots.push(node);
    }
    add(profile);
    if (profile) {
      add(profile.parentElement);
      // Native rail / photo chrome often lives as a sibling of app-profile
      var p = profile.parentElement;
      if (p) {
        var kids = p.children;
        for (var i = 0; i < kids.length; i++) add(kids[i]);
      }
      add(profile.closest("app-info-window, [class*='info-window'], [class*='infoWindow']"));
      add(profile.closest('[class*="profile-overlay"], [class*="profileOverlay"]'));
    }
    add(
      firstVisible(
        "app-info-window, [class*='upper-control'], [class*='upperControl'], [class*='profile-actions'], [class*='profileActions']"
      )
    );
    // Chat header controls (Pin user / LivePlay) sit outside app-profile
    add(qs('[data-testid="pinUserButton"]') && qs('[data-testid="pinUserButton"]').parentElement);
    return roots;
  }

  function isMapMarkerNoise(el) {
    if (!el || !el.closest) return false;
    return !!(
      el.closest(
        '[data-testid="markerUserContainer"], .marker-container, .mgl-marker, .maplibregl-marker, marker-icon-grid'
      ) ||
      el.closest(
        ".lower-map-icon, [data-testid='travelModeIcon'], [data-testid='hideMeButton'], [data-testid='crosshairsIcon'], [data-testid='globalChatIcon'], .global-chat-nav, app-upper-nav-container"
      )
    );
  }

  function getProfileActionRail() {
    var profile = findProfileHost() || qs(SEL.profile);
    if (!profile || profile === document.body) return [];
    var pr = profile.getBoundingClientRect();
    // On /profile/:id/chat the profile host can be tiny/parked — still scan header controls
    var items = [];
    var seen = [];
    var roots = getProfileShellRoots(profile);
    var vw = window.innerWidth || 1;
    var vh = window.innerHeight || 1;
    var selector =
      'button, [role="button"], a, [tabindex], i.fa, i[class*="fa-"], [class*="sniffiesIcon"], [class*="paper-plane"], [class*="paperPlane"]';

    for (var ri = 0; ri < roots.length; ri++) {
      var nodes = qsa(selector, roots[ri]);
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        // Prefer clickable host over bare <i>
        var host = el;
        var hops = 0;
        while (host && hops < 4 && !isClickableRailHost(host)) {
          host = host.parentElement;
          hops++;
        }
        if (!host || !isClickableRailHost(host)) host = el.parentElement || el;
        if (isOurUi(host) || seen.indexOf(host) !== -1) continue;
        if (isMapMarkerNoise(host)) continue;

        var r = host.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.width > 100 || r.height > 100) continue;

        var testid = host.getAttribute("data-testid") || "";
        var label = railLabelFor(host);
        // Known chat/profile header controls — keep even when slightly above the fold
        // (dump: pin/video at t:-40 under the status/photo chrome)
        var knownHeader =
          testid === "pinUserButton" ||
          testid === "startVideoCallButton" ||
          /pin user|pin for later|report|block|message|fa-paper-plane|controls-icon/.test(
            label
          );

        // Must actually intersect the viewport (dump had markers at left:2700+)
        // Allow known header controls a little above the top edge
        var topSlack = knownHeader ? 72 : 0;
        if (r.right < 0 || r.left > vw || r.bottom < -topSlack || r.top > vh) continue;
        if (r.left < -4 || r.right > vw + 4) continue;

        var nearRightEdge = r.right > vw - 110 && r.left > vw * 0.55;
        var onProfileRight =
          pr.width >= 40 &&
          r.left > pr.left + pr.width * 0.55 &&
          r.right > pr.right - 110;
        if (!knownHeader && !nearRightEdge && !onProfileRight) continue;
        if (!knownHeader && pr.height >= 40) {
          if (r.bottom < pr.top - 120 || r.top > pr.bottom + 40) continue;
        }
        // Never treat NSFW fire badge as a rail action
        if (testid === "nsfwIndicator" || /nsfw photos can only|fire-alt/.test(label)) continue;

        seen.push(host);
        items.push({
          el: host,
          top: r.top,
          label: label,
          tag: (host.tagName || "").toLowerCase(),
          testid: testid,
          aria: host.getAttribute("aria-label") || ""
        });
      }
    }
    items.sort(function (a, b) {
      return a.top - b.top;
    });
    return items;
  }

  function copyTextToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(
          function () {
            return true;
          },
          function () {
            return copyTextFallback(text);
          }
        );
      }
    } catch (e) {}
    return Promise.resolve(copyTextFallback(text));
  }

  function copyTextFallback(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      Object.assign(ta.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: "1px",
        height: "1px",
        opacity: "0.01",
        zIndex: "1000100"
      });
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = document.execCommand("copy");
      ta.remove();
      return !!ok;
    } catch (e2) {
      return false;
    }
  }

  function slimHtml(html, maxLen) {
    maxLen = maxLen || 120000;
    html = String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/\sstyle="[^"]*"/gi, function (m) {
        // keep tiny style hints only if short
        return m.length > 80 ? "" : m;
      })
      .replace(/\n{3,}/g, "\n\n");
    if (html.length > maxLen) {
      return html.slice(0, maxLen) + "\n<!-- truncated " + html.length + " chars -->";
    }
    return html;
  }

  function buildProfileDebugDump() {
    var profile = findProfileHost() || qs(SEL.profile);
    if (profile === document.body || profile === document.documentElement) profile = qs(SEL.profile);
    var rail = getProfileActionRail();
    var classified = classifyProfileRail();

    // Right-edge HTML slice: clone profile + any right-rail hosts outside it
    var htmlParts = [];
    if (profile && profile !== document.body) {
      try {
        htmlParts.push("<!-- app-profile -->\n" + slimHtml(profile.outerHTML, 90000));
      } catch (e) {}
    }

    // Compact markup for each detected rail node (best for Message wiring)
    var railHtml = rail
      .map(function (item, idx) {
        try {
          return (
            "<!-- rail[" +
            idx +
            "] " +
            (item.aria || item.testid || item.label.slice(0, 40)) +
            " -->\n" +
            slimHtml(item.el.outerHTML, 4000)
          );
        } catch (e2) {
          return "<!-- rail[" + idx + "] serialize failed -->";
        }
      })
      .join("\n\n");

    // Sibling / shell HTML — native Message often lives outside app-profile
    var shellHtml = "";
    if (profile && profile.parentElement) {
      try {
        var shell = profile.parentElement.cloneNode(true);
        // Drop the giant scrolled profile body; keep siblings + shell chrome
        var clonedProfile = shell.querySelector("app-profile");
        if (clonedProfile) {
          clonedProfile.innerHTML =
            "<!-- app-profile body omitted; see PROFILE HTML -->";
        }
        shellHtml = slimHtml(shell.outerHTML, 60000);
      } catch (e3) {}
    }

    // Right-edge candidates across the viewport (even if not classified)
    var edgeBits = [];
    try {
      var candidates = qsa(
        'button, [role="button"], a, i.fa, i[class*="fa-"], [class*="sniffiesIcon"]'
      );
      for (var ei = 0; ei < candidates.length; ei++) {
        var cel = candidates[ei];
        if (isOurUi(cel)) continue;
        var cr = cel.getBoundingClientRect();
        if (cr.width < 2 || cr.height < 2 || cr.width > 96 || cr.height > 96) continue;
        if (cr.right < window.innerWidth - 120) continue;
        if (cr.top < 40 || cr.bottom > window.innerHeight - 40) continue;
        edgeBits.push(
          "<!-- edge " +
            Math.round(cr.top) +
            "," +
            Math.round(cr.left) +
            " " +
            ((cel.getAttribute("aria-label") || cel.getAttribute("data-testid") || cel.className || "").toString().slice(0, 80)) +
            " -->\n" +
            slimHtml(cel.outerHTML, 2500)
        );
        if (edgeBits.length >= 24) break;
      }
    } catch (e4) {}

    var meta = {
      version: VERSION,
      url: location.href,
      view: resolveViewState(),
      viewport: { w: window.innerWidth, h: window.innerHeight },
      railCount: rail.length,
      edgeCount: edgeBits.length,
      classified: {
        report: !!classified.report,
        pin: !!classified.pin,
        info: !!classified.info,
        photos: !!classified.photos,
        message: !!classified.message
      },
      messageHunt: {
        nearPin: !!findMessageNearPinControls(),
        native: !!findNativeMessageControl(),
        chatPath: isProfileChatPath(),
        profileId: profileIdFromDom(),
        hasChatInput: !!qs(SEL.chatInputPanel) || !!qs(SEL.chatTextArea)
      },
      items: rail.map(function (item, idx) {
        var r = item.el.getBoundingClientRect();
        return {
          i: idx,
          tag: item.tag,
          aria: item.aria,
          testid: item.testid,
          label: item.label.slice(0, 160),
          rect: {
            t: Math.round(r.top),
            l: Math.round(r.left),
            w: Math.round(r.width),
            h: Math.round(r.height)
          }
        };
      })
    };

    return (
      "=== SNIFFIES IPHONE PROFILE DUMP v" +
      VERSION +
      " ===\n" +
      JSON.stringify(meta, null, 2) +
      "\n\n=== RAIL HTML ===\n" +
      (railHtml || "<!-- no rail nodes found -->") +
      "\n\n=== RIGHT-EDGE CANDIDATES ===\n" +
      (edgeBits.join("\n\n") || "<!-- none -->") +
      "\n\n=== PROFILE SHELL HTML ===\n" +
      (shellHtml || "<!-- no shell -->") +
      "\n\n=== PROFILE HTML ===\n" +
      (htmlParts.join("\n\n") || "<!-- no app-profile -->")
    );
  }

  function dumpProfileRail() {
    return dumpProfileDebug(false);
  }

  function dumpProfileDebug(includeToastDetail) {
    var text = buildProfileDebugDump();
    console.log("[Sniffies iPhone] profile dump\n", text.slice(0, 2000) + "…");
    return copyTextToClipboard(text).then(function (ok) {
      if (ok) {
        showToast(
          includeToastDetail === false
            ? "Profile dump copied"
            : "Profile HTML dump copied — paste in chat",
          "success"
        );
      } else {
        showToast("Copy failed — try Settings → Copy dump", "error");
      }
      return text;
    });
  }

  /** Hide our sidebar briefly and click whatever native control sits under a sidebar btn */
  function clickNativeUnderSidebar(cmd, toast) {
    var side = document.getElementById(SIDEBAR_ID);
    if (!side || side.style.display === "none") return false;
    var btn = side.querySelector('[data-cmd="' + cmd + '"]');
    if (!btn) return false;
    var r = btn.getBoundingClientRect();
    var x = r.left + r.width / 2;
    var y = r.top + r.height / 2;

    side.style.visibility = "hidden";
    side.style.pointerEvents = "none";
    var hit = null;
    try {
      hit = document.elementFromPoint(x, y);
    } catch (e) {}
    side.style.visibility = "";
    side.style.pointerEvents = "auto";

    if (!hit || isOurUi(hit)) return false;

    var el = hit;
    var hops = 0;
    while (el && hops < 6) {
      if (!isOurUi(el) && isClickableRailHost(el)) {
        return clickNative(el, toast);
      }
      el = el.parentElement;
      hops++;
    }
    // Last resort: click the hit target itself
    if (!isOurUi(hit)) return clickNative(hit, toast);
    return false;
  }

  function isPhotoish(label) {
    label = String(label || "").toLowerCase();
    // Dump false positive: NSFW consent tooltip / fire badge is not a gallery opener
    if (
      /nsfwindicator|nsfw photos can only|depict yourself|consent|fire-alt|sniffiesicon-fire/.test(
        label
      )
    ) {
      return false;
    }
    if (/secondaryphotominiature|thumbprofileimage|sfwphotos|nsfwphotosgrouping/.test(label)) {
      return false;
    }
    return /photo|pics?|media|album|gallery|image|camera|share photo|send photo|view profile photo/.test(
      label
    );
  }

  function isMessageish(label) {
    if (isPhotoish(label)) return false;
    label = String(label || "").toLowerCase();
    if (/nsfwindicator|liveplay|startvideocall|pin user|thumbtack/.test(label)) return false;
    return (
      /send message|message cruiser|start (a )?chat|private (chat|message)/.test(label) ||
      (/\bmessage\b/.test(label) && !/missed|global|list|history|new messages/.test(label)) ||
      /\bpaper[\s-]?plane\b|\bpaperplane\b|\bairplane\b|\bdm\b|fa-paper-plane|fa-plane/.test(
        label
      )
    );
  }

  /** True if the node has layout in the profile (may be scrolled out of the viewport). */
  function isInProfileLayout(el, profile) {
    if (!el || isOurUi(el) || isMapMarkerNoise(el)) return false;
    try {
      var cs = window.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
    } catch (e) {}
    var r = el.getBoundingClientRect();
    var w = Math.max(r.width, el.offsetWidth || 0);
    var h = Math.max(r.height, el.offsetHeight || 0);
    if (w < 2 && h < 2) return false;
    // Parked map markers live thousands of px off-canvas
    if (r.left > 1600 || r.right < -400) return false;
    if (profile && profile.contains && !profile.contains(el)) {
      // Allow siblings in the same shell (info window / overlay)
      var shell = profile.parentElement;
      if (!shell || !shell.contains(el)) return false;
    }
    return true;
  }

  /** Bring pin/video header row into view (dump often has them at t:-40). */
  function revealProfileHeaderControls() {
    var pin = qs('[data-testid="pinUserButton"]');
    if (!pin) return;
    try {
      pin.scrollIntoView({ block: "center", behavior: "auto" });
    } catch (e) {}
    var node = pin.parentElement;
    var hops = 0;
    while (node && hops < 8) {
      try {
        if (node.scrollHeight > node.clientHeight + 24) {
          node.scrollTop = Math.max(0, node.scrollTop - 80);
        }
      } catch (e2) {}
      node = node.parentElement;
      hops++;
    }
  }

  /** Scroll the cruiser profile sheet so a below-the-fold Message CTA can mount. */
  function scrollProfileSheetForMessage() {
    var roots = qsa(
      ".profile-scrollable, [id^='profile-'][class*='scroll'], #profile-container, app-profile"
    );
    for (var i = 0; i < roots.length; i++) {
      var el = roots[i];
      if (isOurUi(el)) continue;
      try {
        if (el.scrollHeight > el.clientHeight + 40) {
          el.scrollTop = el.scrollHeight;
        }
      } catch (e) {}
    }
  }

  /** Message control sitting next to Pin / LivePlay (not always labeled in dumps). */
  function findMessageNearPinControls() {
    var pin = qs('[data-testid="pinUserButton"]');
    if (!pin) return null;
    var row = pin.parentElement;
    if (!row) return null;
    var hosts = [row, row.parentElement].filter(Boolean);
    for (var h = 0; h < hosts.length; h++) {
      var buttons = qsa('button, [role="button"], a', hosts[h]);
      for (var i = 0; i < buttons.length; i++) {
        var b = buttons[i];
        if (isOurUi(b) || b === pin) continue;
        var tid = (b.getAttribute("data-testid") || "").toLowerCase();
        if (tid === "pinuserbutton" || tid === "startvideocallbutton") continue;
        if (isMessageish(railLabelFor(b))) return b;
        // Paper-plane / comment icon in the same controls row as Pin
        if (qs(".fa-paper-plane, .fa-plane, [class*='paper-plane'], [class*='paperPlane']", b)) {
          return b;
        }
      }
    }
    return null;
  }

  /**
   * Native profile "Message" / "Send message" CTA — including when it's below the
   * fold in the scrolled info sheet (sidebar used to miss it because of on-screen checks).
   */
  function findNativeMessageControl() {
    var profile = findProfileHost() || qs(SEL.profile);
    var roots = getProfileShellRoots(profile);
    if (!roots.length && profile) roots = [profile];
    var best = null;
    var bestScore = 0;
    var seen = [];

    function consider(el) {
      if (!el || seen.indexOf(el) !== -1) return;
      seen.push(el);
      var pin = qs('[data-testid="pinUserButton"]');
      var nearPinRow = !!(pin && pin.parentElement && pin.parentElement.contains(el));
      if (!nearPinRow && !isInProfileLayout(el, profile)) return;

      var aria = (el.getAttribute("aria-label") || "").trim().toLowerCase();
      var title = (el.getAttribute("title") || "").trim().toLowerCase();
      var tid = (el.getAttribute("data-testid") || "").toLowerCase();
      var text = stripControls(el.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      var blob = (aria + " " + title + " " + tid + " " + text + " " + railLabelFor(el))
        .toLowerCase()
        .replace(/\s+/g, " ");
      if (/missed|global|list|history|new messages|check for missed|liveplay|videocall/.test(blob))
        return;

      var exactText = text === "message" || text === "send message" || text === "message cruiser";
      var exactAria = aria === "message" || aria === "send message" || title === "message";
      if (!exactText && !exactAria && !isMessageish(blob)) return;

      var score = 0;
      if (exactText) score += 80;
      else if (text.length && text.length < 28 && /\bmessage\b/.test(text)) score += 40;
      if (exactAria) score += 70;
      else if (/\bmessage\b/.test(aria) || /\bmessage\b/.test(title)) score += 35;
      if (/startchat|sendmessage|messagecruiser|messagebutton|message-button/.test(tid))
        score += 45;
      if (/fa-paper-plane|paper-plane|paperplane/.test(blob)) score += 20;
      if (isOnScreen(el, 8)) score += 8;
      if (profile && profile.contains && profile.contains(el)) score += 14;
      var r = el.getBoundingClientRect();
      var w = Math.max(r.width, el.offsetWidth || 0);
      // Prefer the wide text CTA under the info section
      if (w >= 72 && exactText) score += 24;
      // Deprioritize tiny icon guesses vs the text button
      if (w > 0 && w <= 56 && !exactText && !exactAria) score -= 15;

      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    var nearPin = findMessageNearPinControls();
    if (nearPin) consider(nearPin);

    var selector =
      'button, [role="button"], a, [tabindex], [data-testid*="essage"], [data-testid*="Message"], [class*="message-button"], [class*="messageButton"]';
    for (var ri = 0; ri < roots.length; ri++) {
      var nodes = qsa(selector, roots[ri]);
      for (var i = 0; i < nodes.length; i++) consider(nodes[i]);
    }

    // Exact text / aria matches in document (may be scrolled below the fold)
    var all = qsa('button, [role="button"], a');
    for (var j = 0; j < all.length; j++) {
      var el = all[j];
      if (isOurUi(el)) continue;
      var t = stripControls(el.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      var a = (el.getAttribute("aria-label") || "").trim().toLowerCase();
      if (
        t === "message" ||
        t === "send message" ||
        a === "message" ||
        a === "send message"
      ) {
        consider(el);
      }
    }

    return bestScore >= 30 ? best : null;
  }

  /** Scroll the profile Message CTA into view, then click it (async-safe). */
  function activateNativeMessageControl(toast) {
    revealProfileHeaderControls();
    scrollProfileSheetForMessage();

    var el = findNativeMessageControl();
    if (!el) {
      // One more pass after scroll settles (Angular often mounts Message late)
      return false;
    }

    function doClick() {
      return clickNative(el, toast || "Message");
    }

    if (isOnScreen(el, 10)) return doClick();

    try {
      el.scrollIntoView({ block: "center", behavior: "auto" });
    } catch (e) {}

    // Nudge scrollable profile / info ancestors
    var node = el.parentElement;
    var hops = 0;
    while (node && hops < 8) {
      try {
        if (node.scrollHeight > node.clientHeight + 24) {
          var er = el.getBoundingClientRect();
          var nr = node.getBoundingClientRect();
          node.scrollTop += er.top - nr.top - Math.min(120, nr.height * 0.25);
        }
      } catch (e2) {}
      node = node.parentElement;
      hops++;
    }

    // Click after layout settles (iOS often needs a tick after scrollIntoView)
    setTimeout(function () {
      if (!doClick()) {
        try {
          el.click();
          if (toast) showToast(toast, "success");
        } catch (e3) {}
      }
    }, 140);
    return true;
  }

  function classifyProfileRail() {
    var rail = getProfileActionRail();
    var out = {
      report: null,
      pin: null,
      info: null,
      photos: null,
      message: null,
      rail: rail
    };
    var used = [];
    var i;

    function take(el) {
      if (!el || used.indexOf(el) !== -1) return null;
      used.push(el);
      return el;
    }

    // Prefer stable native testids from dumps (pin may sit slightly above fold)
    var pinBtn = qs('[data-testid="pinUserButton"]');
    if (pinBtn && !isMapMarkerNoise(pinBtn)) {
      var pinR = pinBtn.getBoundingClientRect();
      if (pinR.width >= 2 && pinR.bottom > -72 && pinR.top < (window.innerHeight || 1) + 40) {
        out.pin = take(pinBtn);
      }
    }

    for (i = 0; i < rail.length; i++) {
      var L = rail[i].label;
      var el = rail[i].el;
      var tid = rail[i].testid || "";
      if (tid === "startVideoCallButton" || /liveplay|startvideocall|fa-video/.test(L)) continue;
      if (/report|block|flag|shield/.test(L) && !out.report) out.report = take(el);
      else if (
        (/pin for later|pinned for later|pin later|unpin for later|pin user|pinuserbutton|fa-thumbtack/.test(
          L
        ) ||
          tid === "pinUserButton") &&
        !out.pin
      ) {
        out.pin = take(el);
      }
    }
    for (i = 0; i < rail.length; i++) {
      L = rail[i].label;
      el = rail[i].el;
      if (used.indexOf(el) !== -1) continue;
      if (/cruiser selected|settingsbutton|globalchaticon|travelmode|hide me|find me/.test(L))
        continue;
      if (isPhotoish(L) && !out.photos) out.photos = take(el);
      else if (isMessageish(L) && !out.message) out.message = take(el);
      else if (/\b(info|details?|about)\b/.test(L) && !isPhotoish(L) && !out.info)
        out.info = take(el);
      else if (/favorit|bookmark|\bstar\b/.test(L) && !out.pin) out.pin = take(el);
    }

    // Position fallbacks ONLY for a small clean rail (never invent Message —
    // wrong last-icon guess was swallowing the sidebar Message tap)
    var clean = rail.filter(function (item) {
      return (
        !isMapMarkerNoise(item.el) &&
        !/cruiser selected|settingsbutton|globalchaticon|travelmode|hide me|find me|liveplay|startvideocall/.test(
          item.label
        )
      );
    });
    if (clean.length >= 2 && clean.length <= 8) {
      if (!out.report && clean[0]) out.report = take(clean[0].el);
      if (!out.pin && clean[1]) out.pin = take(clean[1].el);
      if (!out.photos && clean.length >= 2) {
        var maybe = clean[clean.length - 2].el;
        if (used.indexOf(maybe) === -1 && isPhotoish(clean[clean.length - 2].label)) {
          out.photos = take(maybe);
        }
      }
    }
    // Prefer the wide native text Message CTA when rail icons were missed
    if (!out.message) out.message = take(findNativeMessageControl());
    // Do NOT invent an info control by index — wrong index was opening the gallery
    return out;
  }

  function clickNative(el, toast) {
    if (!el) return false;
    try {
      el.focus({ preventScroll: true });
    } catch (e0) {}
    try {
      el.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "touch",
          isPrimary: true
        })
      );
    } catch (e1) {}
    try {
      el.click();
    } catch (e2) {
      return false;
    }
    try {
      el.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "touch",
          isPrimary: true
        })
      );
    } catch (e3) {}
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

  function focusChatComposer(toast) {
    var native = getNativeChatTextArea();
    if (native) {
      try {
        native.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch (e) {}
      try {
        native.focus();
      } catch (e2) {}
      if (toast) showToast(toast, "success");
      return true;
    }
    if (isChatThreadOpen() || isProfileChatPath()) {
      renderComposer("CHAT");
      var our = getComposerTextarea();
      if (our) {
        try {
          our.focus();
        } catch (e3) {}
        if (toast) showToast(toast, "success");
        return true;
      }
    }
    return false;
  }

  function profileIdFromLocation() {
    var m = (location.pathname || "").match(/\/profile\/([^/]+)/i);
    return m ? m[1] : null;
  }

  function profileIdFromDom() {
    var id = profileIdFromLocation();
    if (id) return id;
    var links = qsa('a[href*="/profile/"]');
    for (var i = 0; i < links.length; i++) {
      if (isOurUi(links[i])) continue;
      var hm = String(links[i].getAttribute("href") || "").match(/\/profile\/([^/]+)/i);
      if (hm) return hm[1];
    }
    return null;
  }

  /**
   * Open chat via an in-app router link only — never location.assign
   * (full navigation flashes the map / a broken intermediate screen).
   */
  function tryOpenProfileChatRoute(toast) {
    if (isProfileChatPath()) return false;
    var id = profileIdFromDom();
    if (!id) return false;
    var path = "/profile/" + id + "/chat";
    var link =
      qs('a[href="' + path + '"]') ||
      qs('a[href*="/profile/' + id + '/chat"]') ||
      qs('[routerlink*="/chat"]') ||
      qs('[ng-reflect-router-link*="chat"]') ||
      qs('[routerlink="/chat"]') ||
      qs('[ng-reflect-router-link="/chat"]');
    if (link && !isOurUi(link) && clickNative(link, toast || "Message")) return true;

    // Dump often has no Message node — inject a same-origin <a> inside app-root
    // so Angular's router can intercept the click (still not location.assign).
    try {
      var root = qs("app-root") || document.body;
      var a = document.createElement("a");
      a.href = path;
      a.setAttribute("data-sniffies-iphone-chat-bridge", "1");
      Object.assign(a.style, {
        position: "fixed",
        left: "-9999px",
        top: "0",
        width: "1px",
        height: "1px",
        opacity: "0"
      });
      a.textContent = "Message";
      root.appendChild(a);
      var ok = clickNative(a, toast || "Message");
      setTimeout(function () {
        try {
          a.remove();
        } catch (e) {}
      }, 800);
      if (ok) return true;
    } catch (e2) {}
    return false;
  }

  function ensureOpenedChat(toast) {
    var tries = 0;
    function tick() {
      tries++;
      if (isProfileChatPath() || isChatThreadOpen()) {
        focusChatComposer(toast || "Type your message");
        return;
      }
      // Retry the native CTA once — do NOT hard-navigate (map flash)
      if (tries === 3) {
        revealProfileHeaderControls();
        scrollProfileSheetForMessage();
      }
      if (tries === 5) activateNativeMessageControl(null);
      if (tries === 7) tryOpenProfileChatRoute(null);
      if (tries < 12) setTimeout(tick, 200);
    }
    setTimeout(tick, 220);
  }

  function cmdStartChat() {
    closeModals();

    // Already in a private thread
    if (isProfileChatPath() || (isChatThreadOpen() && !findProfileHost())) {
      if (focusChatComposer("Type your message")) return;
    }

    var profile = findProfileHost();
    if (profile) {
      revealProfileHeaderControls();

      // 1) Native text Message CTA (scroll into view if below the fold)
      if (activateNativeMessageControl("Message")) {
        ensureOpenedChat("Type your message");
        return;
      }

      // 2) Delayed remount — Message often appears after scrolling the sheet
      scrollProfileSheetForMessage();
      setTimeout(function () {
        if (isProfileChatPath() || isChatThreadOpen()) {
          focusChatComposer("Type your message");
          return;
        }
        if (activateNativeMessageControl("Message")) {
          ensureOpenedChat("Type your message");
          return;
        }

        // 3) Labeled rail Message only
        var rail = classifyProfileRail();
        if (
          rail.message &&
          isMessageish(railLabelFor(rail.message)) &&
          clickNative(rail.message, "Message")
        ) {
          ensureOpenedChat("Type your message");
          return;
        }

        // 4) In-app router link / injected bridge (no location.assign)
        if (tryOpenProfileChatRoute("Message")) {
          ensureOpenedChat("Type your message");
          return;
        }

        // 5) Compose-on-profile already open
        if (focusChatComposer("Type your message")) return;

        dumpProfileDebug().then(function () {
          showToast("Message not found — dump copied", "error");
        });
      }, 180);
      return;
    }

    if (isChatThreadOpen() && focusChatComposer("Type your message")) return;
    showToast("Open a profile first", "error");
  }

  function cmdShowProfileDetails() {
    var profile = findProfileHost();
    if (!profile) {
      showToast("Open a profile first", "error");
      return;
    }
    // Our sectioned sheet replaces the native info slide-up
    renderProfileDetailsModal();
  }

  function isNativeProfileInfoControl(el) {
    if (!el || isOurUi(el) || isMapMarkerNoise(el)) return false;
    var host = el;
    var hops = 0;
    while (host && hops < 5 && !isClickableRailHost(host)) {
      host = host.parentElement;
      hops++;
    }
    if (!host) host = el;
    var L = railLabelFor(host);
    var tid = (host.getAttribute("data-testid") || "").toLowerCase();
    if (/info|details|about|fullstats|full-stats/.test(tid)) return true;
    if (/\b(info|details?|about)\b/.test(L) && !isPhotoish(L) && !isMessageish(L)) return true;
    if (/fa-info|fa-circle-info|sniffiesicon.*info/.test(L)) return true;
    return false;
  }

  function looksLikeNativeProfileDetailsSheet(el) {
    if (!el || el.nodeType !== 1 || isOurUi(el)) return false;
    var tag = (el.tagName || "").toLowerCase();
    var tid = (el.getAttribute("data-testid") || "").toLowerCase();
    var cls = (typeof el.className === "string" ? el.className : "").toLowerCase();
    var blob = tag + " " + tid + " " + cls;
    if (
      /profile-full|fullstats|full-stats|profiledetail|profile-detail|cruiser-full|info-window|infowindow|bottom-sheet|bottomsheet|mat-bottom-sheet/.test(
        blob
      )
    ) {
      return true;
    }
    // Heuristic: large bottom sheet that appeared over an open profile
    if (!findProfileHost()) return false;
    try {
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      if (
        r.width > window.innerWidth * 0.7 &&
        r.height > vh * 0.35 &&
        r.bottom >= vh - 8 &&
        r.top > vh * 0.2 &&
        /sheet|drawer|panel|overlay|modal|dialog/.test(blob)
      ) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  function suppressNativeDetailsAndShowOurs(nativeEl) {
    if (document.getElementById(DETAILS_ID)) {
      if (nativeEl && nativeEl.style) {
        nativeEl.style.setProperty("display", "none", "important");
        nativeEl.style.setProperty("visibility", "hidden", "important");
        nativeEl.style.setProperty("pointer-events", "none", "important");
      }
      return;
    }
    if (nativeEl && nativeEl.style) {
      nativeEl.style.setProperty("display", "none", "important");
      nativeEl.style.setProperty("visibility", "hidden", "important");
      nativeEl.style.setProperty("pointer-events", "none", "important");
    }
    if (findProfileHost()) renderProfileDetailsModal();
  }

  function installNativeDetailsInterceptor() {
    if (window.__sniffiesIphoneDetailsHook) return;
    window.__sniffiesIphoneDetailsHook = true;

    document.addEventListener(
      "click",
      function (e) {
        if (resolveViewState() !== "PROFILE" && !findProfileHost()) return;
        var t = e.target;
        if (!t || isOurUi(t)) return;
        var host = t;
        var hops = 0;
        while (host && hops < 6) {
          if (isNativeProfileInfoControl(host)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            cmdShowProfileDetails();
            return;
          }
          host = host.parentElement;
          hops++;
        }
      },
      true
    );

    if (!window.MutationObserver) return;
    var timer = null;
    var obs = new MutationObserver(function (mutations) {
      if (timer) return;
      timer = setTimeout(function () {
        timer = null;
        if (!findProfileHost()) return;
        if (document.getElementById(DETAILS_ID)) {
          // Keep native sheets suppressed while ours is open
          var open = qsa(
            'app-info-window, [class*="bottom-sheet"], [class*="bottomSheet"], [class*="full-stats"], [class*="fullStats"], [data-testid*="FullStats"], [data-testid*="fullStats"]'
          );
          for (var i = 0; i < open.length; i++) {
            if (!isOurUi(open[i]) && isVisible(open[i])) suppressNativeDetailsAndShowOurs(open[i]);
          }
          return;
        }
        for (var m = 0; m < mutations.length; m++) {
          var nodes = mutations[m].addedNodes;
          for (var n = 0; n < nodes.length; n++) {
            var el = nodes[n];
            if (el.nodeType !== 1) continue;
            if (looksLikeNativeProfileDetailsSheet(el)) {
              suppressNativeDetailsAndShowOurs(el);
              return;
            }
            var nested = el.querySelector &&
              el.querySelector(
                'app-info-window, [class*="bottom-sheet"], [class*="full-stats"], [class*="fullStats"], [data-testid*="FullStats"]'
              );
            if (nested && looksLikeNativeProfileDetailsSheet(nested)) {
              suppressNativeDetailsAndShowOurs(nested);
              return;
            }
          }
        }
      }, 40);
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  function cmdProfilePics() {
    // Open their profile photo / secondary gallery — never the NSFW fire badge
    var targets = [
      qs('[data-testid="userProfileImage"]'),
      qs('[data-testid="secondaryPhotoMiniature-0"] .profile-photo-thumb'),
      qs('[data-testid="secondaryPhotoMiniature-0"]'),
      qs("#profile-image"),
      qs('[aria-label="View Profile Photo"]')
    ];
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t || isOurUi(t)) continue;
      var tid = (t.getAttribute("data-testid") || "").toLowerCase();
      if (tid === "nsfwindicator") continue;
      if (clickNative(t, "Photos")) return;
    }
    var rail = classifyProfileRail();
    if (
      rail.photos &&
      (rail.photos.getAttribute("data-testid") || "").toLowerCase() !== "nsfwindicator" &&
      clickNative(rail.photos, "Photos")
    ) {
      return;
    }
    if (clickNativeUnderSidebar("pics", "Photos")) return;
    showToast("Couldn't open their photos", "error");
  }

  function findBlockControl() {
    var roots = [];
    var profile = findProfileHost() || qs(SEL.profile);
    if (profile) {
      roots = roots.concat(getProfileShellRoots(profile));
      roots.push(profile);
    }
    roots.push(document.body);
    var best = null;
    var bestScore = 0;
    var seen = [];
    for (var r = 0; r < roots.length; r++) {
      if (!roots[r]) continue;
      var nodes = qsa('button, [role="button"], a', roots[r]);
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (!el || seen.indexOf(el) !== -1 || isOurUi(el) || isMapMarkerNoise(el)) continue;
        seen.push(el);
        if (!isVisible(el) && !isInProfileLayout(el, profile)) continue;
        var L = railLabelFor(el);
        var text = stripControls(el.textContent || "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        var aria = (el.getAttribute("aria-label") || "").toLowerCase();
        var score = 0;
        if (text === "block" || aria === "block" || /block cruiser/.test(L)) score += 80;
        else if (/\bblock\b/.test(L) && !/report/.test(L)) score += 60;
        else if (/\bblock\b/.test(L)) score += 35;
        else continue;
        if (isOnScreen(el, 8)) score += 10;
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      }
    }
    return bestScore >= 35 ? best : null;
  }

  function confirmBlockInDialog() {
    var nodes = qsa(
      'button, [role="button"], [data-testid*="block"], [data-testid*="Block"]'
    );
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (isOurUi(el) || !isVisible(el)) continue;
      var t = stripControls(el.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      var a = (el.getAttribute("aria-label") || "").toLowerCase();
      if (
        t === "block" ||
        t === "block cruiser" ||
        t === "yes, block" ||
        a === "block" ||
        a === "block cruiser"
      ) {
        // Prefer confirm buttons inside dialogs/sheets
        if (
          el.closest(
            '[role="dialog"], mat-dialog-container, .modal, [class*="modal"], [class*="dialog"], [class*="sheet"]'
          ) ||
          t.indexOf("block") === 0
        ) {
          clickNative(el, "Blocked");
          return true;
        }
      }
    }
    return false;
  }

  function cmdProfileShield() {
    var blockBtn = findBlockControl();
    if (blockBtn && clickNative(blockBtn, "Block")) {
      setTimeout(function () {
        if (!confirmBlockInDialog()) {
          setTimeout(confirmBlockInDialog, 350);
        }
      }, 280);
      return;
    }

    var rail = classifyProfileRail();
    if (rail.report && /\bblock\b/.test(railLabelFor(rail.report)) && clickNative(rail.report, "Block")) {
      setTimeout(confirmBlockInDialog, 280);
      return;
    }
    if (clickNativeUnderSidebar("shield", "Block")) {
      setTimeout(confirmBlockInDialog, 280);
      return;
    }
    showToast("Block control not found", "error");
  }

  // Labels used by Sniffies profile panels (match native section chrome)
  var PROFILE_SECTION_LABELS = [
    "Location",
    "Into Public",
    "Looking For",
    "Fetishes",
    "Kinks",
    "Interaction",
    "Into",
    "Practices",
    "HIV Status",
    "HIV Tested",
    "STI Tested",
    "Safeguards",
    "My Comfort Levels",
    "I carry",
    "I carry...",
    "Hosting Status",
    "Hosting",
    "Gender",
    "Position",
    "Sexuality",
    "Expression",
    "Body Type",
    "Endowment",
    "Age",
    "Height",
    "Weight",
    "Stats",
    "Identity",
    "Scene",
    "Health"
  ];

  var PROFILE_CHROME_RE =
    /^(message|send|back|close|favorite|pin|chat|map|saved|photos?|report|block|go back|edit|share|copy link|pulled from)/i;

  function cleanProfileText(text) {
    return stripControls(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isProfileChromeText(text) {
    if (!text) return true;
    if (PROFILE_CHROME_RE.test(text)) return true;
    if (text.length < 2 || text.length > 420) return true;
    // Lone punctuation / icon font leftovers
    if (/^[\u0000-\u007f\s]*$/.test(text) && !/[A-Za-z0-9']/.test(text)) return true;
    return false;
  }

  function splitChipValues(text) {
    text = cleanProfileText(text);
    if (!text) return [];
    // Prefer comma splits, else multi-word tokens separated by 2+ spaces / bullets
    var parts;
    if (text.indexOf(",") !== -1) {
      parts = text.split(/\s*,\s*/);
    } else if (/\s{2,}|[•·|]/.test(text)) {
      parts = text.split(/\s{2,}|[•·|]+/);
    } else {
      // Space-separated short chips (Cars Beaches Outdoors…)
      var words = text.split(/\s+/);
      var short = words.every(function (w) {
        return w.length <= 18;
      });
      if (short && words.length >= 2 && words.length <= 14) parts = words;
      else return [text];
    }
    return parts
      .map(function (p) {
        return cleanProfileText(p);
      })
      .filter(function (p) {
        return p && !isProfileChromeText(p) && p.toLowerCase() !== "you";
      });
  }

  function matchSectionLabel(text) {
    text = cleanProfileText(text);
    if (!text) return null;
    var lower = text.toLowerCase();
    for (var i = 0; i < PROFILE_SECTION_LABELS.length; i++) {
      var lab = PROFILE_SECTION_LABELS[i];
      if (lower === lab.toLowerCase()) return lab;
      // "Location Can host" → Location
      if (lower.indexOf(lab.toLowerCase()) === 0 && text.length <= lab.length + 48) {
        return lab;
      }
    }
    return null;
  }

  function looksLikeStatsSummary(text) {
    // e.g. 27m, 5'9", muscular, top
    if (!text || text.length > 120) return false;
    if ((text.match(/,/g) || []).length < 1) return false;
    return /(\d+\s*'|\d+"|\d+\s*m\b|\d+\s*lb|muscular|slim|fit|stocky|chubby|vers|top|bottom|gay|african|latino|asian)/i.test(
      text
    );
  }

  function extractBioText(profile) {
    if (!profile) return "";
    var best = "";
    var nodes = qsa(
      '[data-testid*="bio"], [data-testid*="Bio"], [data-testid*="about"], [data-testid*="About"], [class*="bio"], [class*="Bio"], [class*="about-me"], [class*="aboutMe"], [class*="description"], profile-bio, app-profile-bio',
      profile
    );
    for (var i = 0; i < nodes.length; i++) {
      if (isOurUi(nodes[i])) continue;
      var t = cleanProfileText(nodes[i].textContent);
      if (!t || t.length < 12 || t.length > 600) continue;
      if (matchSectionLabel(t) || looksLikeStatsSummary(t) || isProfileChromeText(t)) continue;
      if (/^(location|into|looking|hiv|practices|safeguards)/i.test(t)) continue;
      if (t.length > best.length) best = t;
    }
    return best;
  }

  function noteDuplicatesSectionContent(note, sections, summary) {
    var n = cleanProfileText(note).toLowerCase();
    if (!n) return true;
    if (summary) {
      var s = summary.toLowerCase();
      if (n === s || n.indexOf(s) !== -1 || s.indexOf(n) !== -1) return true;
    }
    var blobParts = [];
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      for (var j = 0; j < sec.values.length; j++) {
        blobParts.push(sec.values[j].toLowerCase());
      }
      blobParts.push(sec.values.join(" ").toLowerCase());
      blobParts.push(sec.values.join(", ").toLowerCase());
      blobParts.push((sec.label + " " + sec.values.join(" ")).toLowerCase());
    }
    for (var k = 0; k < blobParts.length; k++) {
      var b = blobParts[k];
      if (!b) continue;
      if (n === b) return true;
      if (b.length >= 6 && n.indexOf(b) !== -1) return true;
      if (n.length >= 8 && b.indexOf(n) !== -1) return true;
    }
    var words = n.split(/\s+/).filter(function (w) {
      return w.length > 2;
    });
    if (words.length >= 3) {
      var blob = blobParts.join(" ");
      var hit = 0;
      for (var w = 0; w < words.length; w++) {
        if (blob.indexOf(words[w]) !== -1) hit++;
      }
      if (hit / words.length >= 0.72) return true;
    }
    return false;
  }

  function orderProfileSections(sections) {
    var preferred = [
      "Bio",
      "Location",
      "Looking For",
      "Into Public",
      "Into",
      "Interaction",
      "Fetishes",
      "Kinks",
      "Practices",
      "HIV Status",
      "HIV Tested",
      "STI Tested",
      "Safeguards",
      "My Comfort Levels",
      "I carry",
      "I carry...",
      "Hosting Status",
      "Hosting",
      "Identity",
      "Scene",
      "Health",
      "Stats"
    ];
    sections.sort(function (a, b) {
      var ia = preferred.indexOf(a.label);
      var ib = preferred.indexOf(b.label);
      if (ia < 0) ia = 80;
      if (ib < 0) ib = 80;
      if (ia !== ib) return ia - ib;
      return String(a.label).localeCompare(String(b.label));
    });
    return sections;
  }

  function scrapeProfileDetails() {
    var profile = findProfileHost() || qs(SEL.profile);
    if (!profile) {
      return { title: "Profile", summary: "", sections: [], notes: [], bio: "" };
    }

    var sections = [];
    var sectionMap = {};
    var notes = [];
    var seenValue = {};
    var summary = "";
    var title = "Profile details";
    var bio = extractBioText(profile);

    function ensureSection(label) {
      if (sectionMap[label]) return sectionMap[label];
      var sec = { label: label, values: [] };
      sectionMap[label] = sec;
      sections.push(sec);
      return sec;
    }

    function addValues(label, values) {
      if (!label || !values || !values.length) return;
      var sec = ensureSection(label);
      for (var i = 0; i < values.length; i++) {
        var v = cleanProfileText(values[i]);
        if (!v || isProfileChromeText(v)) continue;
        if (matchSectionLabel(v) === label && values.length === 1) continue;
        // Strip leading label from value ("Location Can host" → "Can host")
        var labRe = new RegExp("^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[:\\-]?\\s*", "i");
        v = v.replace(labRe, "").trim();
        if (!v || v.toLowerCase() === label.toLowerCase()) continue;
        var key = label + "::" + v.toLowerCase();
        if (seenValue[key]) continue;
        seenValue[key] = true;
        sec.values.push(v);
      }
    }

    function addNote(text) {
      text = cleanProfileText(text);
      if (!text || isProfileChromeText(text) || matchSectionLabel(text)) return;
      if (looksLikeStatsSummary(text)) {
        if (!summary) summary = text;
        return;
      }
      if (bio && text.toLowerCase() === bio.toLowerCase()) return;
      var key = text.toLowerCase();
      if (seenValue["note::" + key]) return;
      seenValue["note::" + key] = true;
      notes.push(text);
    }

    if (bio) addValues("Bio", [bio]);

    var headline =
      qs('[data-testid="profileHeadlineTableContainer"]', profile) ||
      qs('[data-testid*="profileHeadline"]', profile) ||
      qs('[data-testid*="Headline"]', profile);
    if (headline) {
      var ht = cleanProfileText(headline.textContent);
      if (ht && !isProfileChromeText(ht)) title = ht.slice(0, 80);
    }

    // 0) Native structured stats (profile-stats data-testids)
    var statsHost = qs("profile-stats", profile) || qs('[data-testid="ageStat"]', profile);
    if (statsHost) {
      var statBits = [];
      var testIds = [
        "ageStat",
        "genderStat",
        "heightInCmStat",
        "weightInKgStat",
        "endowmentStat",
        "spectrumStat",
        "attitudeStat"
      ];
      for (var si = 0; si < testIds.length; si++) {
        var sEl = qs('[data-testid="' + testIds[si] + '"]', profile);
        var sv = cleanProfileText(sEl && sEl.textContent);
        if (sv) statBits.push(sv);
      }
      if (statBits.length) summary = statBits.join(", ");
    }

    // 0b) Place / time ("I'm hosting")
    var place = qs("app-profile-place-and-time, [data-testid='profilePlaceAndTimeComponent']", profile);
    if (place) {
      var placeText = cleanProfileText(place.textContent);
      if (placeText) addValues("Location", splitChipValues(placeText));
    }

    // 0c) Cruiser stats rows: title + badges (Location / Practices / HIV Status…)
    var cruiserRows = qsa(
      "profile-cruiser-stats-row, [class*='profile-cruiser-stats-row-container']",
      profile
    );
    for (var cr = 0; cr < cruiserRows.length; cr++) {
      var row = cruiserRows[cr];
      if (isOurUi(row)) continue;
      var titleEl =
        qs(".profile-cruiser-stats-row-title, [class*='profile-cruiser-stats-row-title']", row) ||
        qs("typography p, p.typography--body", row);
      var rowLabel = matchSectionLabel(cleanProfileText(titleEl && titleEl.textContent));
      if (!rowLabel && titleEl) {
        // Title node often also wraps badge text — take first line-ish word(s)
        var rawTitle = cleanProfileText(titleEl.textContent);
        rowLabel = matchSectionLabel(rawTitle.split(/\s{2,}/)[0] || rawTitle);
      }
      if (!rowLabel) continue;
      var badgeEls = qsa(
        "profile-cruiser-stats-badge, .profile-cruiser-stats-badge, [class*='profile-cruiser-stats-badge']",
        row
      );
      var badgeVals = [];
      if (badgeEls.length) {
        for (var bi = 0; bi < badgeEls.length; bi++) {
          var bv = cleanProfileText(badgeEls[bi].textContent);
          if (bv) badgeVals.push(bv);
        }
      } else {
        var badgesHost = qs(
          ".profile-cruiser-stats-row-badges, [class*='profile-cruiser-stats-row-badges']",
          row
        );
        if (badgesHost) badgeVals = splitChipValues(badgesHost.textContent);
      }
      if (badgeVals.length) addValues(rowLabel, badgeVals);
    }

    // 1) Structured rows: label node + nearby value/chips (native layout)
    var all = qsa("*", profile);
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (isOurUi(el) || el.children.length > 8) continue;
      var own = "";
      try {
        // Direct text only (avoid swallowing whole sections)
        for (var n = 0; n < el.childNodes.length; n++) {
          if (el.childNodes[n].nodeType === 3) own += el.childNodes[n].textContent || "";
        }
      } catch (e) {}
      own = cleanProfileText(own || (el.children.length === 0 ? el.textContent : ""));
      var label = matchSectionLabel(own);
      if (!label || own.toLowerCase() !== label.toLowerCase()) {
        // Also accept exact textContent when leaf-ish
        if (el.children.length <= 1) label = matchSectionLabel(cleanProfileText(el.textContent));
        else label = null;
      }
      if (!label) continue;
      if (cleanProfileText(el.textContent).length > label.length + 60) continue;

      var values = [];
      var sib = el.nextElementSibling;
      var hops = 0;
      while (sib && hops < 4) {
        if (!isOurUi(sib)) {
          var st = cleanProfileText(sib.textContent);
          if (st && !matchSectionLabel(st)) {
            values = values.concat(splitChipValues(st));
            break;
          }
          // Chip children
          var kids = qsa(
            '[class*="tag"], [class*="chip"], [class*="badge"], [class*="pill"], button, span',
            sib
          );
          if (kids.length) {
            for (var k = 0; k < kids.length; k++) {
              var kt = cleanProfileText(kids[k].textContent);
              if (kt && kt.length < 40 && !matchSectionLabel(kt)) values.push(kt);
            }
            if (values.length) break;
          }
        }
        sib = sib.nextElementSibling;
        hops++;
      }
      // Parent row: label + value columns
      if (!values.length && el.parentElement) {
        var parent = el.parentElement;
        var siblings = parent.children;
        for (var s = 0; s < siblings.length; s++) {
          if (siblings[s] === el || isOurUi(siblings[s])) continue;
          var pt = cleanProfileText(siblings[s].textContent);
          if (!pt || matchSectionLabel(pt) === label) continue;
          if (pt.toLowerCase().indexOf(label.toLowerCase()) === 0) {
            pt = pt.slice(label.length).replace(/^[:\-\s]+/, "");
          }
          if (pt && pt.length < 200) values = values.concat(splitChipValues(pt));
        }
      }
      if (values.length) addValues(label, values);
    }

    // 2) Parse full visible text into labeled sections (fallback / fill gaps)
    var rawLines = cleanProfileText(profile.innerText || "")
      .split(/\n+/)
      .map(function (line) {
        return cleanProfileText(line);
      })
      .filter(Boolean);

    var currentLabel = null;
    for (var r = 0; r < rawLines.length; r++) {
      var line = rawLines[r];
      if (isProfileChromeText(line)) continue;

      var exact = matchSectionLabel(line);
      if (exact && line.toLowerCase() === exact.toLowerCase()) {
        currentLabel = exact;
        ensureSection(exact);
        continue;
      }

      // "HIV Status Negative, On PrEP"
      var prefixed = null;
      for (var li = 0; li < PROFILE_SECTION_LABELS.length; li++) {
        var lab = PROFILE_SECTION_LABELS[li];
        var re = new RegExp("^" + lab.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[:\\-]?\\s+(.+)$", "i");
        var m = line.match(re);
        if (m) {
          prefixed = lab;
          addValues(lab, splitChipValues(m[1]));
          currentLabel = lab;
          break;
        }
      }
      if (prefixed) continue;

      if (looksLikeStatsSummary(line)) {
        if (!summary) summary = line;
        currentLabel = null;
        continue;
      }

      if (/^(i'?m hosting|can host|can travel|not hosting)/i.test(line)) {
        addValues("Location", [line]);
        currentLabel = "Location";
        continue;
      }

      if (currentLabel) {
        addValues(currentLabel, splitChipValues(line));
      } else if (
        /cruiser|verified|registered|anonymous/i.test(line) &&
        line.length < 40
      ) {
        title = line.slice(0, 80);
      } else if (line.length >= 8) {
        addNote(line);
      }
    }

    // 3) Chip / tag sweep into notes if still empty
    if (!sections.length && !summary) {
      var chips = qsa(
        '[class*="tag"], [class*="chip"], [class*="badge"], [class*="stat"], [class*="trait"]',
        profile
      );
      for (var c = 0; c < chips.length; c++) {
        if (isOurUi(chips[c])) continue;
        addNote(chips[c].textContent);
      }
    }

    // Drop empty sections
    sections = sections.filter(function (sec) {
      return sec.values && sec.values.length;
    });

    // Ensure bio is always present/first when we found one
    if (bio && !sectionMap.Bio) addValues("Bio", [bio]);
    sections = orderProfileSections(sections);

    // Drop "More" noise that repeats labeled sections / summary / bio
    notes = notes.filter(function (n) {
      return !noteDuplicatesSectionContent(n, sections, summary || bio);
    });

    // Prefer a clean title
    if (/^profile/i.test(title) && summary) title = summary.split(",")[0].trim() || title;

    return {
      title: title,
      summary: summary,
      bio: bio,
      sections: sections,
      notes: notes.slice(0, 8),
      // legacy field for harness / callers
      lines: sections.reduce(function (acc, sec) {
        return acc.concat([sec.label + ": " + sec.values.join(", ")]);
      }, summary ? [summary] : [])
    };
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

  function accentForSectionLabel(label) {
    var fixed = {
      Bio: "#6eb0ff",
      Location: "#3dd68c",
      "Looking For": "#f0a43a",
      "Into Public": "#c4a7ff",
      Into: "#c4a7ff",
      "HIV Status": "#ff8fab",
      Safeguards: "#5eead4",
      Practices: "#fbbf24"
    };
    if (fixed[label]) return fixed[label];
    var palette = ["#6eb0ff", "#f0a43a", "#3dd68c", "#c4a7ff", "#ff8fab", "#5eead4", "#fbbf24"];
    var h = 0;
    var s = String(label || "");
    for (var i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 3)) % 997;
    return palette[h % palette.length];
  }

  function makeDetailsSectionEl(section) {
    var accent = accentForSectionLabel(section.label);
    var wrap = document.createElement("div");
    Object.assign(wrap.style, {
      padding: "12px 0 12px 12px",
      margin: "4px 0",
      borderBottom: "1px solid " + THEME.border,
      borderLeft: "3px solid " + accent
    });

    var lab = document.createElement("div");
    lab.textContent = section.label;
    Object.assign(lab.style, {
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: accent,
      marginBottom: "8px"
    });
    wrap.appendChild(lab);

    var chipRow = document.createElement("div");
    Object.assign(chipRow.style, {
      display: "flex",
      flexWrap: "wrap",
      gap: "7px"
    });

    var isBio = String(section.label).toLowerCase() === "bio";
    var multi = !isBio && (section.values.length > 1 || section.values[0].length < 28);
    section.values.forEach(function (val) {
      if (multi) {
        var chip = document.createElement("span");
        chip.textContent = val;
        Object.assign(chip.style, {
          display: "inline-flex",
          alignItems: "center",
          padding: "6px 11px",
          borderRadius: "999px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid " + accent + "44",
          color: THEME.text,
          fontSize: "13px",
          lineHeight: "1.25",
          fontWeight: "500"
        });
        chipRow.appendChild(chip);
      } else {
        var plain = document.createElement("div");
        plain.textContent = val;
        Object.assign(plain.style, {
          fontSize: isBio ? "15px" : "15px",
          lineHeight: "1.45",
          color: THEME.text,
          fontWeight: isBio ? "450" : "500",
          whiteSpace: "pre-wrap"
        });
        chipRow.appendChild(plain);
      }
    });
    wrap.appendChild(chipRow);
    return wrap;
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
      background: "linear-gradient(180deg, #12151c 0%, " + THEME.bgSolid + " 40%)",
      border: "1px solid " + THEME.border,
      borderRadius: "18px 18px 0 0",
      padding: "0",
      width: "100%",
      maxHeight: "78vh",
      display: "flex",
      flexDirection: "column",
      color: THEME.text,
      fontFamily: "-apple-system, system-ui, sans-serif",
      boxShadow: "0 -12px 40px rgba(0,0,0,0.45)",
      boxSizing: "border-box",
      overflow: "hidden"
    });

    var body = document.createElement("div");
    Object.assign(body.style, {
      padding: "18px 16px 12px",
      overflowY: "auto",
      flex: "1",
      minHeight: "0"
    });

    var title = document.createElement("div");
    title.textContent = data.title || "Profile details";
    Object.assign(title.style, {
      fontWeight: "700",
      fontSize: "20px",
      marginBottom: data.summary ? "6px" : "12px",
      lineHeight: "1.25",
      letterSpacing: "-0.01em"
    });
    body.appendChild(title);

    if (data.summary) {
      var sum = document.createElement("div");
      sum.textContent = data.summary;
      Object.assign(sum.style, {
        fontSize: "13px",
        lineHeight: "1.4",
        color: THEME.textDim,
        marginBottom: "14px",
        paddingBottom: "12px",
        borderBottom: "1px solid " + THEME.border
      });
      body.appendChild(sum);
    }

    if (!data.sections.length && !data.notes.length && !data.summary) {
      var empty = document.createElement("div");
      empty.textContent =
        "Couldn't read profile sections — swipe up on the photo for native details, or scroll the profile and try again.";
      Object.assign(empty.style, {
        color: THEME.textDim,
        fontSize: "14px",
        lineHeight: "1.45",
        marginBottom: "12px"
      });
      body.appendChild(empty);
    } else {
      data.sections.forEach(function (sec) {
        body.appendChild(makeDetailsSectionEl(sec));
      });
      if (data.notes.length) {
        body.appendChild(
          makeDetailsSectionEl({
            label: "More",
            values: data.notes
          })
        );
      }
    }

    var actions = document.createElement("div");
    Object.assign(actions.style, {
      display: "flex",
      gap: "8px",
      padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
      borderTop: "1px solid " + THEME.border,
      background: "rgba(12,14,18,0.96)",
      flexShrink: "0"
    });
    var msgBtn = makeBtn(
      "Message",
      function () {
        overlay.remove();
        setTimeout(function () {
          cmdStartChat();
        }, 40);
      },
      { bg: THEME.accentBg, color: "#fff", bold: true, primary: true }
    );
    msgBtn.style.flex = "1.4";
    msgBtn.style.minHeight = "46px";
    var done = makeBtn(
      "Done",
      function () {
        overlay.remove();
      },
      { color: THEME.textDim }
    );
    done.style.flex = "1";
    done.style.minHeight = "46px";
    actions.appendChild(msgBtn);
    actions.appendChild(done);

    sheet.appendChild(body);
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

  function getAddMediaControl() {
    var media = qs(SEL.addMedia);
    if (media && (isVisible(media) || media.offsetParent || media.getBoundingClientRect().width > 0)) {
      return media.closest("button, [role='button'], a") || media;
    }
    var plus = qs("i.fa.fa-plus, i.fa-plus, .fa-plus");
    if (plus) return plus.closest("button, [role='button'], a") || plus;
    var labeled = qsa('button, [role="button"], a');
    for (var i = 0; i < labeled.length; i++) {
      if (isOurUi(labeled[i])) continue;
      var L = (
        (labeled[i].getAttribute("aria-label") || "") +
        " " +
        (labeled[i].getAttribute("data-testid") || "")
      ).toLowerCase();
      if (/add media|add photo|attach|camera|gallery/.test(L)) return labeled[i];
    }
    return null;
  }

  function getSavedPhotoContainers() {
    return qsa(
      '.saved-image-container[aria-label="Select This Photo"], .saved-image-container[aria-label*="Select This Photo"], .saved-image-container'
    ).filter(function (el) {
      if (isOurUi(el)) return false;
      var img = qs(".hidden-img, img", el);
      if (!img) return false;
      var src = img.getAttribute("src") || img.currentSrc || "";
      if (!src || src.indexOf("data:") === 0) return false;
      var r = el.getBoundingClientRect();
      return r.width > 8 && r.height > 8;
    });
  }

  function collectSavedPhotoSrcs(limit) {
    limit = limit || SEND_PICS_COUNT;
    var srcs = [];
    var seen = {};
    var containers = getSavedPhotoContainers();
    for (var i = 0; i < containers.length && srcs.length < limit; i++) {
      var img = qs(".hidden-img, img", containers[i]);
      var src = img && (img.getAttribute("src") || img.currentSrc || "");
      if (!src || seen[src]) continue;
      seen[src] = true;
      srcs.push(src);
    }
    return srcs;
  }

  function findSavedPhotoBySrc(src) {
    if (!src) return null;
    var imgs = qsa(".hidden-img, .saved-image-container img");
    for (var i = 0; i < imgs.length; i++) {
      var s = imgs[i].getAttribute("src") || imgs[i].currentSrc || "";
      if (s === src) {
        return (
          imgs[i].closest(".saved-image-container") ||
          imgs[i].closest('button, [role="button"], [aria-label]') ||
          imgs[i]
        );
      }
    }
    return null;
  }

  function openNativePhotoGallery(done) {
    setNativePhotosMode(true);
    setTimeout(function () {
      // Already open?
      if (isNativePhotoGalleryOpen()) {
        done(true);
        return;
      }
      var media = getAddMediaControl();
      if (media) {
        try {
          media.click();
        } catch (e) {}
      }
      waitUntil(
        function () {
          return isNativePhotoGalleryOpen();
        },
        function (ok) {
          done(!!ok);
        },
        50
      );
    }, 80);
  }

  function clickNativePhotoSend() {
    var btn =
      qs("#chat-input-send-text-or-saved-photo") ||
      getNativeSendButton() ||
      qs('[data-testid="sendButton"]');
    if (!btn) return false;
    var host = btn.closest("button, [role='button']") || btn;
    if (host.disabled || host.getAttribute("aria-disabled") === "true") return false;
    try {
      host.click();
      return true;
    } catch (e) {
      return false;
    }
  }

  function finishSendPics(sent) {
    sendingPics = false;
    setNativePhotosMode(false);
    setComposerTakeover(isChatThreadOpen() || isProfileChatPath());
    if (resolveViewState() === "CHAT") {
      try {
        renderComposer("CHAT");
      } catch (e) {}
    }
    if (sent > 0) showToast("Sent " + sent + " photo" + (sent === 1 ? "" : "s"), "success");
    else showToast("Couldn't send photos — open chat & try again", "error");
  }

  /** Send up to 6 of the user's saved chat photos into the open thread. */
  function sendSavedPhotosToChat(count) {
    count = count || SEND_PICS_COUNT;
    if (sendingPics) {
      showToast("Already sending photos…", "error");
      return;
    }
    if (!isChatThreadOpen() && !isProfileChatPath()) {
      showToast("Open a chat first", "error");
      return;
    }

    sendingPics = true;
    showToast("Sending " + count + " photos…", "success");

    openNativePhotoGallery(function (opened) {
      if (!opened) {
        finishSendPics(0);
        return;
      }
      var srcs = collectSavedPhotoSrcs(count);
      if (!srcs.length) {
        finishSendPics(0);
        return;
      }

      function sendAt(idx, sent) {
        if (idx >= srcs.length) {
          finishSendPics(sent);
          return;
        }

        function pickAndSend() {
          var container = findSavedPhotoBySrc(srcs[idx]);
          if (!container) {
            // Gallery may have remounted — retry open once
            openNativePhotoGallery(function (ok2) {
              container = findSavedPhotoBySrc(srcs[idx]);
              if (!ok2 || !container) {
                sendAt(idx + 1, sent);
                return;
              }
              try {
                container.click();
              } catch (e2) {}
              waitUntil(
                function () {
                  return !!qs("#chat-input-send-text-or-saved-photo, [data-testid='sendButton']");
                },
                function () {
                  setTimeout(function () {
                    if (clickNativePhotoSend()) {
                      setTimeout(function () {
                        sendAt(idx + 1, sent + 1);
                      }, 700);
                    } else {
                      sendAt(idx + 1, sent);
                    }
                  }, 350);
                },
                30
              );
            });
            return;
          }
          try {
            container.click();
          } catch (e) {}
          waitUntil(
            function () {
              var b = qs("#chat-input-send-text-or-saved-photo") || getNativeSendButton();
              return !!b;
            },
            function () {
              setTimeout(function () {
                if (clickNativePhotoSend()) {
                  setTimeout(function () {
                    sendAt(idx + 1, sent + 1);
                  }, 700);
                } else {
                  sendAt(idx + 1, sent);
                }
              }, 350);
            },
            30
          );
        }

        // Re-open gallery for each photo (native UI closes after send)
        if (idx === 0 && getSavedPhotoContainers().length) {
          pickAndSend();
        } else {
          openNativePhotoGallery(function (ok) {
            if (!ok) {
              finishSendPics(sent);
              return;
            }
            pickAndSend();
          });
        }
      }

      sendAt(0, 0);
    });
  }

  function cmdPics() {
    sendSavedPhotosToChat(SEND_PICS_COUNT);
  }

  function ensureComposerHost() {
    var el = document.getElementById(COMPOSER_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = COMPOSER_ID;
    el.setAttribute("data-dock", "1");
    Object.assign(el.style, {
      position: "fixed",
      left: "0",
      right: "0",
      bottom: "52px",
      zIndex: "1000014",
      display: "none",
      flexDirection: "column",
      gap: "6px",
      padding: "8px 12px 6px",
      boxSizing: "border-box",
      background: THEME.dockBg,
      borderTop: "1px solid " + THEME.border,
      borderRadius: "16px 16px 0 0",
      backdropFilter: "blur(20px) saturate(1.25)",
      webkitBackdropFilter: "blur(20px) saturate(1.25)"
    });
    document.body.appendChild(el);
    return el;
  }

  function hideComposer() {
    var el = document.getElementById(COMPOSER_ID);
    if (el) el.style.display = "none";
    setComposerTakeover(false);
  }

  function styleDockChip22(chip, wide) {
    chip.style.height = "22px";
    chip.style.minHeight = "22px";
    chip.style.fontSize = wide ? "11px" : "0";
    chip.style.letterSpacing = wide ? "0" : "0.06em";
    if (wide) {
      chip.style.width = "auto";
      chip.style.minWidth = "0";
      chip.style.padding = "0 8px";
      chip.style.borderRadius = "999px";
    } else {
      chip.style.width = "22px";
      chip.style.minWidth = "22px";
      chip.style.padding = "0";
    }
  }

  /** Compact AI suggestion bar (same 22px height as the old dots row). */
  function fillAiSuggestionBar(row, onRefresh) {
    var suggestions = aiSuggestionsCache.length
      ? aiSuggestionsCache
      : localAiSuggestions(getRecentChatTexts());

    if (aiLoading && !suggestions.length) {
      var loading = makeMarkChip({
        mark: "…",
        wide: true,
        label: "Loading suggestions",
        color: THEME.accent,
        border: "1px solid " + THEME.aiBorder,
        bg: THEME.aiBg
      });
      styleDockChip22(loading, true);
      row.appendChild(loading);
    } else if (!suggestions.length) {
      var empty = document.createElement("div");
      empty.textContent = "No suggestions";
      Object.assign(empty.style, {
        color: THEME.textMute,
        fontSize: "11px",
        lineHeight: "22px",
        whiteSpace: "nowrap",
        flexShrink: "0"
      });
      row.appendChild(empty);
    } else {
      suggestions.slice(0, MAX_AI_SUGGESTIONS).forEach(function (s) {
        var text = s.text;
        var chip = makeMarkChip({
          mark: s.label || "Suggest",
          wide: true,
          label: s.label || "Suggest",
          title: (s.label || "Suggest") + " — " + (text || ""),
          color: THEME.accent,
          border: "1px solid " + THEME.aiBorder,
          bg: THEME.aiBg,
          action: function () {
            setComposerText(text);
          }
        });
        styleDockChip22(chip, true);
        row.appendChild(chip);
      });
    }

    var refresh = makeMarkChip({
      mark: "↻",
      label: "Refresh suggestions",
      color: THEME.accent,
      action: function () {
        refreshAiSuggestions(function () {
          if (onRefresh) onRefresh();
        });
      }
    });
    styleDockChip22(refresh, false);
    refresh.style.fontSize = "12px";
    row.appendChild(refresh);
    return true;
  }

  function restoreComposerAfterPhotos() {
    setNativePhotosMode(false);
    if (isChatThreadOpen() || isProfileChatPath()) {
      setComposerTakeover(true);
      if (resolveViewState() === "CHAT") {
        try {
          renderComposer("CHAT");
        } catch (e) {}
      }
    }
  }

  /** Open the user's saved-photo gallery so they can pick & send. */
  function cmdOpenUserPhotos() {
    if (sendingPics || nativePhotosOpen) {
      showToast("Photos already open…", "error");
      return;
    }
    if (!isChatThreadOpen() && !isProfileChatPath()) {
      showToast("Open a chat first", "error");
      return;
    }

    openNativePhotoGallery(function (ok) {
      if (!ok) {
        restoreComposerAfterPhotos();
        showToast("Couldn't open photos", "error");
        return;
      }

      // Keep our dock out of the way until the native gallery closes
      var emptyStreak = 0;
      var tries = 0;
      (function watch() {
        tries++;
        if (isNativePhotoGalleryOpen()) {
          emptyStreak = 0;
          setNativePhotosMode(true);
        } else {
          emptyStreak++;
          if (emptyStreak >= 5) {
            restoreComposerAfterPhotos();
            return;
          }
        }
        if (tries < 200) setTimeout(watch, 300);
        else restoreComposerAfterPhotos();
      })();
    });
  }

  function renderComposer(state) {
    // Never take over the profile's native Message row — only full chat threads.
    var inChat = state === "CHAT" && isChatThreadOpen();
    if (!inChat) {
      hideComposer();
      return;
    }
    if (nativePhotosOpen) {
      hideComposer();
      setComposerTakeover(false);
      return;
    }
    if (sendingPics) return;

    setComposerTakeover(true);
    var existingText = "";
    var prevTa = getComposerTextarea();
    if (prevTa) existingText = prevTa.value || "";

    var stateData = loadState();
    var el = ensureComposerHost();
    el.innerHTML = "";
    el.setAttribute("data-dock", "1");
    el.setAttribute("data-version", VERSION);
    Object.assign(el.style, {
      position: "fixed",
      left: "0",
      right: "0",
      zIndex: "1000014",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      padding: "5px 10px 5px",
      boxSizing: "border-box",
      background: THEME.dockBg,
      borderTop: "1px solid " + THEME.border,
      borderBottom: "none",
      borderRadius: "14px 14px 0 0",
      boxShadow: "none",
      backdropFilter: "blur(20px) saturate(1.25)",
      webkitBackdropFilter: "blur(20px) saturate(1.25)"
    });

    // Top row: AI suggestions (scroll) + photos on the right — same 22px height as old dots
    var topRow = document.createElement("div");
    Object.assign(topRow.style, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      height: "22px",
      minHeight: "22px"
    });

    var aiRow = document.createElement("div");
    Object.assign(aiRow.style, {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      flex: "1",
      minWidth: "0",
      height: "22px",
      overflowX: "auto",
      webkitOverflowScrolling: "touch",
      scrollbarWidth: "none"
    });
    if (stateData.aiEnabled) {
      fillAiSuggestionBar(aiRow, function () {
        renderComposer("CHAT");
      });
    }
    topRow.appendChild(aiRow);

    var pics = makeMarkChip({
      icon: "photos",
      label: "Photos",
      title: "Open your photos to send",
      color: THEME.gold,
      action: cmdOpenUserPhotos
    });
    styleDockChip22(pics, false);
    topRow.appendChild(pics);
    el.appendChild(topRow);

    // Input row: short field + larger send, same height / flat alignment
    var inputRow = document.createElement("div");
    Object.assign(inputRow.style, {
      display: "flex",
      alignItems: "stretch",
      gap: "8px",
      height: "40px"
    });

    var ta = document.createElement("textarea");
    ta.rows = 1;
    ta.placeholder = "Message…";
    ta.value = existingText;
    Object.assign(ta.style, {
      flex: "1",
      resize: "none",
      height: "40px",
      minHeight: "40px",
      maxHeight: "40px",
      padding: "10px 12px",
      borderRadius: "12px",
      border: "1px solid " + THEME.border,
      background: THEME.inputBg,
      color: THEME.text,
      fontSize: "16px",
      lineHeight: "1.2",
      fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      outline: "none",
      boxSizing: "border-box"
    });
    ta.addEventListener("focus", function () {
      ta.style.borderColor = THEME.accent;
    });
    ta.addEventListener("blur", function () {
      ta.style.borderColor = THEME.border;
    });
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        cmdComposerSend();
      }
    });

    var sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.setAttribute("aria-label", "Send");
    sendBtn.textContent = "Send";
    Object.assign(sendBtn.style, {
      height: "40px",
      minHeight: "40px",
      minWidth: "72px",
      padding: "0 16px",
      border: "none",
      borderRadius: "12px",
      background: THEME.accentBg,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      flexShrink: "0",
      fontSize: "15px",
      fontWeight: "700",
      letterSpacing: "0.01em",
      fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      webkitTapHighlightColor: "transparent",
      boxSizing: "border-box"
    });
    sendBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      cmdComposerSend();
    });

    inputRow.appendChild(ta);
    inputRow.appendChild(sendBtn);
    el.appendChild(inputRow);

    var bar = document.getElementById(BAR_ID);
    var barH = bar ? Math.ceil(bar.getBoundingClientRect().height) : 52;
    el.style.bottom = barH + "px";

    updateContentInset();
    setTimeout(scrollChatToLatest, 80);
    setTimeout(scrollChatToLatest, 320);

    if (stateData.aiEnabled && !aiSuggestionsCache.length && !aiLoading) {
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
        if (isChatThreadOpen()) renderComposer("CHAT");
      })
    );
    sheet.appendChild(aiRow);

    function persistAiPersonalityAndRefresh(nextId, nextNotes) {
      var s = loadState();
      if (nextId != null) s.aiPersonality = sanitizeAiPersonality(nextId);
      if (nextNotes != null) s.aiNotes = sanitizeAiNotes(nextNotes);
      saveState(s);
      aiSuggestionsCache = [];
      refreshAiSuggestions(function () {
        if (isChatThreadOpen()) renderComposer("CHAT");
      });
    }

    sheet.appendChild(makeSectionLabel("AI Personality"));
    var personHint = document.createElement("div");
    personHint.textContent =
      "Shapes reply suggestions for Sniffies chats — pics, host/travel, now/later, roles.";
    Object.assign(personHint.style, {
      color: THEME.textMute,
      fontSize: "12px",
      marginBottom: "10px",
      lineHeight: "1.4"
    });
    sheet.appendChild(personHint);

    var personRow = document.createElement("div");
    Object.assign(personRow.style, {
      display: "flex",
      flexWrap: "wrap",
      gap: "6px",
      marginBottom: "8px"
    });
    var personIds = [
      "cruiser",
      "direct",
      "chill",
      "flirty",
      "discreet",
      "host",
      "custom"
    ];
    var blurbEl = document.createElement("div");
    Object.assign(blurbEl.style, {
      color: THEME.textDim,
      fontSize: "12px",
      marginBottom: "10px",
      lineHeight: "1.35",
      minHeight: "16px"
    });
    function paintPersonalityChips() {
      var cur = sanitizeAiPersonality(loadState().aiPersonality);
      personRow.innerHTML = "";
      personIds.forEach(function (id) {
        var meta = AI_PERSONALITIES[id];
        var active = id === cur;
        var chip = makeBtn(
          meta.label,
          function () {
            persistAiPersonalityAndRefresh(id, null);
            paintPersonalityChips();
            blurbEl.textContent = meta.blurb;
          },
          {
            color: active ? THEME.accent : THEME.textDim,
            compact: true,
            bold: active
          }
        );
        chip.style.border = active
          ? "1px solid " + THEME.aiBorder
          : "1px solid " + THEME.border;
        chip.style.background = active ? THEME.aiBg : THEME.chipBg;
        chip.style.minHeight = "32px";
        chip.style.padding = "0 10px";
        personRow.appendChild(chip);
      });
      blurbEl.textContent = (AI_PERSONALITIES[cur] || AI_PERSONALITIES.cruiser).blurb;
    }
    paintPersonalityChips();
    sheet.appendChild(personRow);
    sheet.appendChild(blurbEl);

    var notesLbl = document.createElement("div");
    notesLbl.textContent = "Vibe / logistics notes";
    Object.assign(notesLbl.style, {
      fontSize: "13px",
      fontWeight: "600",
      marginBottom: "6px",
      color: THEME.text
    });
    sheet.appendChild(notesLbl);
    var notesHint = document.createElement("div");
    notesHint.textContent =
      "Tap chips to build your line — shown as chat suggestions locally and sent with API prompts.";
    Object.assign(notesHint.style, {
      color: THEME.textMute,
      fontSize: "12px",
      marginBottom: "8px",
      lineHeight: "1.4"
    });
    sheet.appendChild(notesHint);

    var notesInput = document.createElement("textarea");
    notesInput.rows = 3;
    notesInput.placeholder =
      "vers top · can host · no face first · free after 10 · discreet · on PrEP…";
    notesInput.value = st.aiNotes || "";
    styleInput(notesInput);
    Object.assign(notesInput.style, {
      width: "100%",
      minHeight: "72px",
      resize: "vertical",
      fontSize: "14px",
      lineHeight: "1.35",
      marginBottom: "10px"
    });
    notesInput.onchange = function () {
      var clean = sanitizeAiNotes(notesInput.value);
      notesInput.value = clean;
      persistAiPersonalityAndRefresh(null, clean);
      paintVibeChips();
    };
    sheet.appendChild(notesInput);

    var vibeWrap = document.createElement("div");
    vibeWrap.style.marginBottom = "12px";
    sheet.appendChild(vibeWrap);

    function paintVibeChips() {
      var curNotes = loadState().aiNotes || "";
      vibeWrap.innerHTML = "";
      VIBE_LOGISTICS_CATALOG.forEach(function (block) {
        var catLbl = document.createElement("div");
        catLbl.textContent = block.cat;
        Object.assign(catLbl.style, {
          color: THEME.textMute,
          fontSize: "11px",
          fontWeight: "600",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          margin: "10px 0 6px"
        });
        vibeWrap.appendChild(catLbl);
        var row = document.createElement("div");
        Object.assign(row.style, {
          display: "flex",
          flexWrap: "wrap",
          gap: "6px"
        });
        block.items.forEach(function (item) {
          var on = notesContainTag(curNotes, item.tag);
          var chip = makeBtn(
            item.tag,
            function () {
              var next = toggleVibeNoteTag(loadState().aiNotes || "", item.tag);
              notesInput.value = next;
              persistAiPersonalityAndRefresh(null, next);
              paintVibeChips();
            },
            {
              color: on ? THEME.accent : THEME.textDim,
              compact: true,
              bold: on
            }
          );
          chip.title = item.reply;
          chip.style.border = on
            ? "1px solid " + THEME.aiBorder
            : "1px solid " + THEME.border;
          chip.style.background = on ? THEME.aiBg : THEME.chipBg;
          chip.style.minHeight = "30px";
          chip.style.padding = "0 9px";
          chip.style.fontSize = "11px";
          row.appendChild(chip);
        });
        vibeWrap.appendChild(row);
      });
    }
    paintVibeChips();

    var clearNotes = makeBtn(
      "Clear notes",
      function () {
        notesInput.value = "";
        persistAiPersonalityAndRefresh(null, "");
        paintVibeChips();
      },
      { color: THEME.textMute, compact: true }
    );
    clearNotes.style.marginBottom = "12px";
    sheet.appendChild(clearNotes);

    sheet.appendChild(makeSectionLabel("AI Questionnaire"));
    var qHint = document.createElement("div");
    qHint.textContent =
      "Fill this so suggestions know how you answer common Sniffies questions and how to react.";
    Object.assign(qHint.style, {
      color: THEME.textMute,
      fontSize: "12px",
      marginBottom: "10px",
      lineHeight: "1.4"
    });
    sheet.appendChild(qHint);

    var qAnswers = sanitizeQuestionnaire(st.aiQuestionnaire);
    var qSection = "";
    function persistQuestionnaire() {
      var s = loadState();
      s.aiQuestionnaire = sanitizeQuestionnaire(qAnswers);
      saveState(s);
      aiSuggestionsCache = [];
      refreshAiSuggestions(function () {
        if (isChatThreadOpen()) renderComposer("CHAT");
      });
    }

    AI_QUESTIONNAIRE.forEach(function (item) {
      if (item.section && item.section !== qSection) {
        qSection = item.section;
        var sec = document.createElement("div");
        sec.textContent = qSection;
        Object.assign(sec.style, {
          color: THEME.accent,
          fontSize: "12px",
          fontWeight: "700",
          letterSpacing: "0.04em",
          margin: "14px 0 8px"
        });
        sheet.appendChild(sec);
      }

      var qLab = document.createElement("div");
      qLab.textContent = item.q;
      Object.assign(qLab.style, {
        fontSize: "13px",
        fontWeight: "600",
        marginBottom: "6px",
        color: THEME.text
      });
      sheet.appendChild(qLab);

      if (item.type === "choice") {
        var choiceRow = document.createElement("div");
        Object.assign(choiceRow.style, {
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          marginBottom: "10px"
        });
        (item.options || []).forEach(function (opt) {
          var on = qAnswers[item.id] === opt;
          var chip = makeBtn(
            opt,
            function () {
              if (qAnswers[item.id] === opt) delete qAnswers[item.id];
              else qAnswers[item.id] = opt;
              persistQuestionnaire();
              renderSettingsModal();
            },
            {
              color: on ? THEME.accent : THEME.textDim,
              compact: true,
              bold: on
            }
          );
          chip.style.border = on
            ? "1px solid " + THEME.aiBorder
            : "1px solid " + THEME.border;
          chip.style.background = on ? THEME.aiBg : THEME.chipBg;
          chip.style.minHeight = "30px";
          chip.style.padding = "0 9px";
          chip.style.fontSize = "11px";
          choiceRow.appendChild(chip);
        });
        sheet.appendChild(choiceRow);
      } else {
        var taQ = document.createElement("textarea");
        taQ.rows = 2;
        taQ.placeholder = item.placeholder || "Your usual reply…";
        taQ.value = qAnswers[item.id] || "";
        styleInput(taQ);
        Object.assign(taQ.style, {
          width: "100%",
          minHeight: "52px",
          resize: "vertical",
          fontSize: "14px",
          lineHeight: "1.35",
          marginBottom: "10px"
        });
        taQ.onchange = function () {
          var clean = stripControls(taQ.value).trim().slice(0, MAX_Q_ANSWER);
          taQ.value = clean;
          if (clean) qAnswers[item.id] = clean;
          else delete qAnswers[item.id];
          persistQuestionnaire();
        };
        sheet.appendChild(taQ);
      }
    });

    var clearQ = makeBtn(
      "Clear questionnaire",
      function () {
        qAnswers = {};
        persistQuestionnaire();
        renderSettingsModal();
      },
      { color: THEME.textMute, compact: true }
    );
    clearQ.style.marginBottom = "14px";
    sheet.appendChild(clearQ);

    var epLabel = document.createElement("div");
    epLabel.textContent =
      "Optional HTTPS API (POST JSON → { suggestions: [{label,text}] }). Receives personality + questionnaire playbook + Sniffies scene context. Blank = local banks."
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
      aiSuggestionsCache = [];
      refreshAiSuggestions(function () {
        if (isChatThreadOpen()) renderComposer("CHAT");
      });
    };
    sheet.appendChild(epInput);

    sheet.appendChild(makeSectionLabel("Debug (for Message wiring)"));
    var dbgHint = document.createElement("div");
    dbgHint.textContent =
      "Open a profile first, then tap Copy. Paste the dump into Cursor chat.";
    Object.assign(dbgHint.style, {
      color: THEME.textMute,
      fontSize: "12px",
      marginBottom: "10px",
      lineHeight: "1.4"
    });
    sheet.appendChild(dbgHint);
    var copyDumpBtn = makeBtn(
      "Copy profile HTML dump",
      function () {
        dumpProfileDebug();
      },
      { color: THEME.accent, bold: true }
    );
    copyDumpBtn.style.width = "100%";
    copyDumpBtn.style.minHeight = "44px";
    sheet.appendChild(copyDumpBtn);

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
      else if (cmd === "pinned" || cmd === "favorites" || cmd === "saved") cmdPinned();
      else if (cmd === "message" || cmd === "chat") cmdStartChat();
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
    if (side && side.getAttribute("data-ready") === "4") return side;

    if (side) side.remove();
    side = document.createElement("div");
    side.id = SIDEBAR_ID;
    side.setAttribute("data-ready", "4");
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

    // Block · Pinned · Photos · Message (no info — our details replace native slide-up)
    side.appendChild(makeSidebarBtn("shield", "block", "Block"));
    side.appendChild(makeSidebarBtn("pinned", "pin", "Pinned chats"));
    side.appendChild(makeSidebarBtn("pics", "photos", "Photos"));
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

  function findProfilePhotoBandBottom(profile) {
    if (!profile) return null;
    var bottoms = [];
    var imgs = qsa("img", profile);
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (isOurUi(img) || !isVisible(img)) continue;
      var r = img.getBoundingClientRect();
      if (r.width < 36 || r.height < 36) continue;
      if (r.bottom < 40 || r.top > window.innerHeight) continue;
      bottoms.push(r.bottom);
    }
    bottoms.sort(function (a, b) {
      return a - b;
    });
    // Prefer the 3rd photo's bottom when present
    if (bottoms.length >= 3) return bottoms[2];
    if (bottoms.length) return bottoms[bottoms.length - 1];
    return null;
  }

  function findProfileDetailsBandTop(profile) {
    if (!profile) return null;
    var el =
      qs("profile-cruiser-stats-container", profile) ||
      qs('[data-testid="profileCruiserFullStatsContainer"]', profile) ||
      qs("profile-stats", profile) ||
      qs("app-profile-place-and-time", profile) ||
      qs('[class*="profile-section"]', profile) ||
      qs('[data-testid="profileHeadlineTableContainer"]', profile);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return r.top;
  }

  function positionSidebar() {
    var side = document.getElementById(SIDEBAR_ID);
    if (!side || side.style.display === "none") return;

    var profile = findProfileHost();
    var bar = document.getElementById(BAR_ID);
    var barTop = bar ? bar.getBoundingClientRect().top : window.innerHeight - 48;
    var sideH = side.offsetHeight || 220;
    var minTop = Math.max(64, Math.round(window.innerHeight * 0.1));
    var maxTop = Math.round(barTop - sideH - 10);

    var photoBottom = findProfilePhotoBandBottom(profile);
    var detailsTop = findProfileDetailsBandTop(profile);

    var top;
    if (photoBottom != null && detailsTop != null && detailsTop > photoBottom + 24) {
      // Center in the gap between 3rd photo and profile details
      var gapMid = (photoBottom + detailsTop) / 2;
      top = Math.round(gapMid - sideH / 2);
    } else if (photoBottom != null) {
      top = Math.round(photoBottom + 10);
    } else if (detailsTop != null) {
      top = Math.round(detailsTop - sideH - 10);
    } else if (profile) {
      var pr = profile.getBoundingClientRect();
      top = Math.round(pr.top + pr.height * 0.42 - sideH / 2);
    } else {
      top = Math.round(window.innerHeight * 0.35);
    }

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
    if (bar && bar.getAttribute("data-ready") === "10") return bar;

    if (bar) bar.remove();
    bar = document.createElement("div");
    bar.id = BAR_ID;
    bar.setAttribute("data-ready", "10");
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
      borderTop: "1px solid " + THEME.border,
      borderRadius: "0",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      gap: "0",
      padding: "6px 8px calc(6px + var(--sniffies-safe-bottom, env(safe-area-inset-bottom, 0px)))",
      boxShadow: "0 -10px 32px rgba(0,0,0,0.45)",
      backdropFilter: "blur(20px) saturate(1.25)",
      webkitBackdropFilter: "blur(20px) saturate(1.25)",
      pointerEvents: "auto"
    });
    ensureSafeAreaStyle();

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
    btn.style.color = active ? THEME.barActive : baseColor || THEME.barText;
    btn.style.opacity = active ? "1" : "0.82";
  }

  function styleBarForState(bar, state) {
    if (!bar) return;
    var inChat = state === "CHAT";
    bar.style.background = THEME.barBg;
    bar.style.borderTop = inChat ? "none" : "1px solid " + THEME.border;
    bar.style.borderRadius = inChat ? "0" : "16px 16px 0 0";
    bar.style.boxShadow = inChat
      ? "none"
      : "0 -10px 32px rgba(0,0,0,0.45)";
  }

  function renderBar(state) {
    try {
      ensureHideNativeStyle();
      var bar = ensureBar();
      bar.setAttribute("data-view", state || "MAP");
      document.documentElement.setAttribute("data-sniffies-view", state || "MAP");
      styleBarForState(bar, state);

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
        if (state === "CHAT") scrollChatToLatest();
        if (state === "PROFILE") positionSidebar();
      }, 50);
      setTimeout(function () {
        if (state === "CHAT") scrollChatToLatest();
      }, 400);
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
    ensureSafeAreaStyle();
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
          if (sendingPics || nativePhotosOpen) return;
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

    installNativeDetailsInterceptor();

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
        findNativeMessageControl: findNativeMessageControl,
        activateNativeMessageControl: activateNativeMessageControl,
        classifyProfileRail: classifyProfileRail,
        dumpProfileRail: dumpProfileRail,
        dumpProfileDebug: dumpProfileDebug,
        buildProfileDebugDump: buildProfileDebugDump,
        scrapeProfileDetails: scrapeProfileDetails,
        renderProfileDetailsModal: renderProfileDetailsModal,
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
