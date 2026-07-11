// ==UserScript==
// @name         Sniffies Intent Bar (Mac)
// @version      3.3.0
// @description  Quick messages + navigation for Sniffies (Mac Safari Userscripts)
// @match        https://sniffies.com/*
// @match        https://www.sniffies.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  if (window.__sniffiesIntentBar) return;
  window.__sniffiesIntentBar = true;

  var STORAGE_KEY = "sniffies-intent-bar-v31";
  var BAR_ID = "sniffies-overlay-bar";
  var WORD_BAR_ID = "sniffies-word-bar";
  var MODAL_ID = "sniffies-quick-modal";
  var SETTINGS_ID = "sniffies-settings-modal";
  var TOAST_ID = "sniffies-toast";

  var DEFAULTS = {
    quickMessages: [
      { id: "1", label: "Sup", text: "Sup?" },
      { id: "2", label: "Wyd", text: "Wyd?" },
      { id: "3", label: "Into", text: "Into what?" },
      { id: "4", label: "Host", text: "Top here." },
      { id: "5", label: "Looking", text: "Where at?" }
    ]
  };

  // Sniffies-native dark map aesthetic
  var THEME = {
    bg: "rgba(10, 14, 20, 0.92)",
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
    chipActive: "rgba(47, 111, 237, 0.28)"
  };

  var SEL = {
    chatInputPanel: '[data-testid="chatInputPanel"], #chat-input-panel',
    chatTextArea: '[data-testid="chatTextArea"], textarea[name="chatTextArea"]',
    sendButton: '[data-testid="sendButton"], #chat-input-send-text-or-saved-photo',
    chatList: "app-chat-list",
    chatListTab: '[data-testid^="chatListTab-"]',
    chatListRow: '[data-testid="sniffiesChatRow"]',
    profile: "app-profile",
    chatListNav: '[data-testid="chatButtonIcon"]',
    addMedia: '[data-testid="addMediaButton"]',
    pinnedHeader: '[data-testid="pinnedForLaterHeader"]'
  };

  // ============================================================
  // STORAGE
  // ============================================================

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { quickMessages: DEFAULTS.quickMessages.slice() };
      var parsed = JSON.parse(raw);
      if (!parsed.quickMessages || !parsed.quickMessages.length) {
        parsed.quickMessages = DEFAULTS.quickMessages.slice();
      }
      return parsed;
    } catch (e) {
      return { quickMessages: DEFAULTS.quickMessages.slice() };
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    return r.width > 0 && r.height > 0;
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

  function isOurUi(el) {
    if (!el) return false;
    var bar = document.getElementById(BAR_ID);
    var wordBar = document.getElementById(WORD_BAR_ID);
    var modal = document.getElementById(MODAL_ID);
    var settings = document.getElementById(SETTINGS_ID);
    return (
      (bar && bar.contains(el)) ||
      (wordBar && wordBar.contains(el)) ||
      (modal && modal.contains(el)) ||
      (settings && settings.contains(el)) ||
      el.id === TOAST_ID
    );
  }

  function getChatTextArea() {
    var panel = qs(SEL.chatInputPanel);
    if (panel && isVisible(panel)) {
      var inPanel = qs(SEL.chatTextArea, panel) || qs("textarea", panel);
      if (inPanel && isVisible(inPanel)) return inPanel;
    }
    var area = qs(SEL.chatTextArea);
    if (area && isVisible(area) && !isOurUi(area)) return area;
    return null;
  }

  function getSendButton() {
    var panel = qs(SEL.chatInputPanel);
    if (panel) {
      var btn = qs(SEL.sendButton, panel);
      if (btn && isVisible(btn)) return btn;
    }
    var fallback = qs(SEL.sendButton);
    if (fallback && isVisible(fallback) && !isOurUi(fallback)) return fallback;
    return null;
  }

  function getChatListNav() {
    return qs(SEL.chatListNav);
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
      if (
        label.indexOf("message") !== -1 ||
        label.indexOf("chat") !== -1 ||
        label === "send message"
      ) {
        return el;
      }
    }
    var icon = qs(".fa-paper-plane, .fa-comment, .fa-comments", profile);
    if (icon) {
      var btn = icon.closest("button, [role='button'], a");
      if (btn && isVisible(btn)) return btn;
    }
    return null;
  }

  function getFavoriteButton() {
    var profile = qs(SEL.profile);
    if (!profile) return null;
    var buttons = qsa('button, [role="button"]', profile);
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (isOurUi(b) || !isVisible(b)) continue;
      var label = (b.getAttribute("aria-label") || "").toLowerCase();
      var text = (b.textContent || "").toLowerCase().trim();
      if (
        label.indexOf("favorit") !== -1 ||
        label.indexOf("bookmark") !== -1 ||
        label.indexOf("pin") !== -1 ||
        text.indexOf("favorit") !== -1 ||
        text === "save"
      ) {
        return b;
      }
      if (qs(".fa-star, .fa-heart, .fa-thumbtack, .fa-bookmark", b)) return b;
    }
    return null;
  }

  function setInputValue(el, value) {
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

  function resolveViewState() {
    if (getChatTextArea()) return "CHAT";
    var profile = qs(SEL.profile);
    if (profile && isVisible(profile)) return "PROFILE";
    var chatList = qs(SEL.chatList);
    if (chatList && isVisible(chatList)) return "CHATS_LIST";
    if (qs(SEL.chatListTab) && isVisible(qs(SEL.chatListTab))) return "CHATS_LIST";
    if (qs(SEL.chatListRow) && isVisible(qs(SEL.chatListRow))) return "CHATS_LIST";
    return "MAP";
  }

  // ============================================================
  // UI PRIMITIVES
  // ============================================================

  function lighten(hex) {
    try {
      if (hex.indexOf("rgb") === 0) return hex;
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
      padding: opts.compact ? "6px 11px" : "8px 14px",
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
      userSelect: "none",
      backdropFilter: "blur(8px)",
      webkitBackdropFilter: "blur(8px)"
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
      b.style.borderColor = THEME.borderHover;
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

  function makeDivider() {
    var d = document.createElement("div");
    Object.assign(d.style, {
      width: "1px",
      height: "16px",
      background: THEME.border,
      flexShrink: "0",
      margin: "0 2px"
    });
    return d;
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
        transition: "opacity 0.18s, transform 0.18s",
        backdropFilter: "blur(12px)",
        webkitBackdropFilter: "blur(12px)"
      });
      toast.textContent = msg;
      document.body.appendChild(toast);

      requestAnimationFrame(function () {
        toast.style.opacity = "1";
        toast.style.transform = "translateX(-50%) translateY(0)";
      });

      setTimeout(function () {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(-50%) translateY(8px)";
        setTimeout(function () {
          try {
            toast.remove();
          } catch (e) {}
        }, 200);
      }, 1500);
    } catch (e) {}
  }

  function whenReady(check, fn, tries) {
    tries = tries == null ? 12 : tries;
    if (check()) {
      fn();
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
  // ACTIONS
  // ============================================================

  function insertAndSendMessage(text) {
    var input = getChatTextArea();
    if (!input) {
      showToast("No chat input found", "error");
      return false;
    }
    setInputValue(input, text);
    var sendBtn = getSendButton();
    if (!sendBtn) {
      showToast("No send button found", "error");
      return false;
    }
    sendBtn.click();
    showToast("Sent", "success");
    return true;
  }

  function cmdSend() {
    var input = getChatTextArea();
    if (!input) return;
    var val = (input.value || input.textContent || "").trim();
    if (!val) return;
    var btn = getSendButton();
    if (btn) btn.click();
  }

  function cmdOpenChats() {
    var btn = getChatListNav();
    if (btn) {
      btn.click();
      return true;
    }
    showToast("Could not open chats", "error");
    return false;
  }

  function cmdCloseChats() {
    var state = resolveViewState();
    if (state === "CHATS_LIST" || state === "CHAT") {
      var btn = getChatListNav();
      if (btn) btn.click();
    }
  }

  function cmdGoToMap() {
    cmdCloseChats();
    var profile = qs(SEL.profile);
    if (profile && isVisible(profile)) {
      var back = findBackButton(profile);
      if (back) back.click();
    }
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

  function clickPinnedTab() {
    // Prefer explicit testids Sniffies uses for chat list tabs
    var testIds = [
      '[data-testid="chatListTab-PINNED"]',
      '[data-testid="chatListTab-pinned"]',
      '[data-testid="chatListTab-Pinned"]'
    ];
    for (var i = 0; i < testIds.length; i++) {
      var el = qs(testIds[i]);
      if (el && isVisible(el)) {
        el.click();
        return true;
      }
    }

    var tabs = qsa(SEL.chatListTab);
    for (var t = 0; t < tabs.length; t++) {
      var tab = tabs[t];
      if (!isVisible(tab)) continue;
      var id = (tab.getAttribute("data-testid") || "").toLowerCase();
      var text = (tab.textContent || "").toLowerCase().trim();
      var aria = (tab.getAttribute("aria-label") || "").toLowerCase();
      if (
        id.indexOf("pin") !== -1 ||
        text.indexOf("pin") !== -1 ||
        aria.indexOf("pin") !== -1 ||
        text.indexOf("saved") !== -1
      ) {
        tab.click();
        return true;
      }
    }

    // Tab labels / thumbtack in chat list chrome
    var root = qs(SEL.chatList) || document;
    var candidates = qsa(
      'button, [role="tab"], [role="button"], a, .chatlist-title, [class*="tab"]',
      root
    );
    for (var c = 0; c < candidates.length; c++) {
      var node = candidates[c];
      if (isOurUi(node) || !isVisible(node)) continue;
      var blob = (
        (node.getAttribute("data-testid") || "") +
        " " +
        (node.getAttribute("aria-label") || "") +
        " " +
        (node.textContent || "")
      )
        .toLowerCase()
        .trim();
      if (
        blob === "pinned" ||
        blob.indexOf("pinned") !== -1 ||
        (blob.indexOf("pin") !== -1 && blob.indexOf("unpin") === -1)
      ) {
        node.click();
        return true;
      }
      if (qs(".fa-thumbtack", node) && blob.indexOf("unpin") === -1) {
        node.click();
        return true;
      }
    }

    if (qs(SEL.pinnedHeader) && isVisible(qs(SEL.pinnedHeader))) return true;
    return false;
  }

  function tryPinnedDeepLink() {
    try {
      var url = new URL(location.href);
      url.pathname = "/chat";
      url.searchParams.set("contextual", "pinned-conversations-chat-list");
      history.pushState({}, "", url.toString());
      window.dispatchEvent(new PopStateEvent("popstate"));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Opens chats → Pinned tab. Not a toast-only hint.
  function cmdOpenPinned() {
    var state = resolveViewState();

    function finish(ok) {
      if (ok === false) {
        tryPinnedDeepLink();
        setTimeout(function () {
          if (clickPinnedTab() || qs(SEL.pinnedHeader)) showToast("Pinned", "success");
          else showToast("Couldn't open Pinned", "error");
        }, 280);
      } else {
        showToast("Pinned", "success");
      }
    }

    if (state === "CHATS_LIST") {
      finish(clickPinnedTab() ? true : false);
      return;
    }

    // From a thread, jump to list first
    if (state === "CHAT") {
      cmdOpenChats();
    } else if (state !== "CHATS_LIST") {
      if (!cmdOpenChats()) return;
    }

    whenReady(
      function () {
        return !!qs(SEL.chatList) || qsa(SEL.chatListTab).length > 0;
      },
      function (found) {
        if (found === false && !qs(SEL.chatList)) {
          tryPinnedDeepLink();
        }
        finish(clickPinnedTab() ? true : false);
      }
    );
  }

  // Profile-only: favorite/pin this cruiser
  function cmdFavoriteProfile() {
    var fav = getFavoriteButton();
    if (fav) {
      fav.click();
      showToast("Saved", "success");
      return;
    }
    showToast("Favorite control not found", "error");
  }

  function cmdPics() {
    var state = resolveViewState();
    if (state === "CHAT") {
      var media = qs(SEL.addMedia);
      if (media && isVisible(media)) {
        media.click();
        return;
      }
      // Fallback: any photo/media control near composer
      var panel = qs(SEL.chatInputPanel);
      var btn =
        (panel && qs('button [class*="fa-image"], button [class*="fa-camera"], button [class*="fa-plus"]', panel)) ||
        qs('[data-testid="addMediaButton"]');
      if (btn) {
        var clickable = btn.closest ? btn.closest("button") || btn : btn;
        clickable.click();
        return;
      }
      showToast("Photo button not found", "error");
      return;
    }
    if (state === "PROFILE") {
      cmdStartChat();
      setTimeout(cmdPics, 450);
      return;
    }
    showToast("Open a chat to send pics", "info");
  }

  function cmdStartChat() {
    var btn = getProfileChatButton();
    if (btn) btn.click();
    else showToast("Chat button not found", "error");
  }

  function cmdBack() {
    var state = resolveViewState();
    if (state === "PROFILE") {
      var back = findBackButton(qs(SEL.profile));
      if (back) back.click();
      else history.back();
    } else if (state === "CHAT" || state === "CHATS_LIST") {
      cmdCloseChats();
    }
  }

  function onQuickMessageClick(text) {
    var state = resolveViewState();
    if (state === "PROFILE") {
      var btn = getProfileChatButton();
      if (btn) btn.click();
      setTimeout(function () {
        insertAndSendMessage(text);
      }, 400);
    } else if (state === "CHAT") {
      renderQuickMessageModal(text);
    }
  }

  // ============================================================
  // MODALS
  // ============================================================

  function closeModals() {
    var s = document.getElementById(SETTINGS_ID);
    if (s) s.remove();
    var m = document.getElementById(MODAL_ID);
    if (m) m.remove();
  }

  function renderQuickMessageModal(phrase) {
    closeModals();

    var overlay = document.createElement("div");
    overlay.id = MODAL_ID;
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.55)",
      zIndex: "1000001",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(6px)",
      webkitBackdropFilter: "blur(6px)"
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
      maxWidth: "380px",
      fontFamily: "-apple-system, system-ui, sans-serif",
      boxShadow: "0 20px 60px rgba(0,0,0,0.55)"
    });

    var title = document.createElement("div");
    title.textContent = "Send message";
    Object.assign(title.style, {
      color: THEME.text,
      fontWeight: "650",
      fontSize: "16px",
      marginBottom: "12px"
    });
    sheet.appendChild(title);

    var preview = document.createElement("div");
    preview.textContent = phrase;
    Object.assign(preview.style, {
      background: THEME.chipBg,
      color: THEME.text,
      padding: "14px 16px",
      borderRadius: "12px",
      marginBottom: "16px",
      borderLeft: "3px solid " + THEME.accent,
      fontSize: "15px",
      lineHeight: "1.45"
    });
    sheet.appendChild(preview);

    var btnRow = document.createElement("div");
    Object.assign(btnRow.style, { display: "flex", gap: "10px" });

    var cancelBtn = makeBtn("Cancel", function () {
      overlay.remove();
    }, { color: THEME.textDim });
    cancelBtn.style.flex = "1";
    btnRow.appendChild(cancelBtn);

    var confirmBtn = makeBtn(
      "Send",
      function () {
        if (insertAndSendMessage(phrase)) overlay.remove();
      },
      { bg: THEME.accentBg, color: "#fff", bold: true, primary: true }
    );
    confirmBtn.style.flex = "1";
    btnRow.appendChild(confirmBtn);

    sheet.appendChild(btnRow);
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
  }

  function renderSettingsModal() {
    closeModals();

    var overlay = document.createElement("div");
    overlay.id = SETTINGS_ID;
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.55)",
      zIndex: "1000001",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(6px)",
      webkitBackdropFilter: "blur(6px)"
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
      fontFamily: "-apple-system, system-ui, sans-serif",
      color: THEME.text,
      boxShadow: "0 20px 60px rgba(0,0,0,0.55)"
    });

    var title = document.createElement("div");
    title.textContent = "Settings";
    Object.assign(title.style, {
      color: THEME.text,
      fontWeight: "650",
      fontSize: "18px",
      marginBottom: "4px"
    });
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
    addMsgBtn.style.marginTop = "4px";
    sheet.appendChild(addMsgBtn);

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
  // BAR RENDER
  // ============================================================

  function ensureBar() {
    var bar = document.getElementById(BAR_ID);
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = BAR_ID;
    Object.assign(bar.style, {
      position: "fixed",
      bottom: "0",
      left: "0",
      right: "0",
      width: "100%",
      zIndex: "999999",
      background: THEME.bg,
      borderTop: "1px solid " + THEME.border,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 -12px 40px rgba(0,0,0,0.35)",
      backdropFilter: "blur(18px) saturate(1.2)",
      webkitBackdropFilter: "blur(18px) saturate(1.2)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)"
    });
    document.body.appendChild(bar);
    return bar;
  }

  function makeRow() {
    var row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "7px",
      padding: "8px 12px",
      overflowX: "auto",
      webkitOverflowScrolling: "touch",
      scrollbarWidth: "none"
    });
    return row;
  }

  function spacer() {
    var s = document.createElement("div");
    s.style.flex = "1";
    s.style.minWidth = "8px";
    return s;
  }

  function renderBar(state) {
    try {
      var bar = ensureBar();
      bar.innerHTML = "";
      bar.setAttribute("data-view", state);

      var messages = loadQuickMessages();

      if (state === "PROFILE" || state === "CHAT") {
        var contextRow = makeRow();
        contextRow.style.borderBottom = "1px solid " + THEME.border;
        contextRow.style.paddingTop = "10px";
        messages.forEach(function (msg) {
          var text = msg.text;
          contextRow.appendChild(
            makeBtn(msg.label, function () {
              onQuickMessageClick(text);
            }, { compact: true })
          );
        });
        if (state === "CHAT") {
          contextRow.appendChild(
            makeBtn("Pics", cmdPics, { color: THEME.accent, compact: true })
          );
        }
        bar.appendChild(contextRow);
      }

      var navRow = makeRow();
      navRow.style.paddingTop = "10px";
      navRow.style.paddingBottom = "10px";

      if (state === "MAP") {
        navRow.appendChild(makeBtn("Chats", cmdOpenChats, { color: THEME.accent }));
        navRow.appendChild(makeBtn("Pinned", cmdOpenPinned, { color: THEME.gold }));
        navRow.appendChild(spacer());
        navRow.appendChild(makeIconBtn("\u2699", renderSettingsModal, THEME.textDim));
      } else if (state === "CHATS_LIST") {
        navRow.appendChild(makeBtn("Map", cmdGoToMap, { color: THEME.textDim }));
        navRow.appendChild(makeBtn("Pinned", cmdOpenPinned, { color: THEME.gold }));
        navRow.appendChild(makeDivider());
        navRow.appendChild(makeBtn("Back", cmdBack, { color: THEME.textMute }));
        navRow.appendChild(spacer());
        navRow.appendChild(makeIconBtn("\u2699", renderSettingsModal, THEME.textDim));
      } else if (state === "PROFILE") {
        navRow.appendChild(makeBtn("Map", cmdGoToMap, { color: THEME.textDim }));
        navRow.appendChild(makeBtn("Save", cmdFavoriteProfile, { color: THEME.gold }));
        navRow.appendChild(makeBtn("Chat", cmdStartChat, { color: THEME.accent }));
        navRow.appendChild(makeDivider());
        navRow.appendChild(makeBtn("Back", cmdBack, { color: THEME.textMute }));
        navRow.appendChild(spacer());
        navRow.appendChild(makeIconBtn("\u2699", renderSettingsModal, THEME.textDim));
      } else if (state === "CHAT") {
        navRow.appendChild(makeBtn("Map", cmdGoToMap, { color: THEME.textDim }));
        navRow.appendChild(makeBtn("Pinned", cmdOpenPinned, { color: THEME.gold }));
        navRow.appendChild(makeDivider());
        navRow.appendChild(
          makeBtn("Send", cmdSend, {
            bg: THEME.accentBg,
            color: "#fff",
            bold: true,
            primary: true
          })
        );
        navRow.appendChild(makeBtn("Back", cmdBack, { color: THEME.textMute }));
        navRow.appendChild(spacer());
        navRow.appendChild(makeIconBtn("\u2699", renderSettingsModal, THEME.textDim));
      }

      bar.appendChild(navRow);
    } catch (e) {
      console.error("[Sniffies] render error:", e);
    }
  }

  // ============================================================
  // BOOT
  // ============================================================

  function boot() {
    var lastState = null;
    var scheduled = false;

    var tick = function () {
      scheduled = false;
      try {
        var state = resolveViewState();
        if (state !== lastState) {
          closeModals();
          renderBar(state);
          lastState = state;
        } else if (!document.getElementById(BAR_ID)) {
          renderBar(state);
          lastState = state;
        }
      } catch (e) {
        console.error("[Sniffies] tick error:", e);
      }
    };

    var schedule = function () {
      if (scheduled) return;
      scheduled = true;
      setTimeout(tick, 80);
    };

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.target && isOurUi(m.target)) continue;
        schedule();
        return;
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-testid", "class", "style"]
    });

    window.addEventListener("popstate", schedule);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModals();
    });

    tick();
    setTimeout(tick, 1500);

    window.__sniffiesIntentBarApi = {
      resolveViewState: resolveViewState,
      renderBar: renderBar,
      getChatTextArea: getChatTextArea,
      getSendButton: getSendButton,
      insertAndSendMessage: insertAndSendMessage,
      cmdOpenPinned: cmdOpenPinned,
      clickPinnedTab: clickPinnedTab,
      SEL: SEL
    };

    console.log("[Sniffies] Intent Bar 3.2 ready");
  }

  if (document.body) boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
