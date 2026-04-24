(function () {
  const TOKEN_KEY = "rootrecord_portal_token";
  const DEVICE_KEY = "rootrecord_portal_device_id";

  function el(id) {
    return document.getElementById(id);
  }

  function hexDeviceId() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  function getOrCreateDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (id && id.length >= 8 && id.length <= 128) return id;
    id = hexDeviceId();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  }

  function setStatus(msg, kind) {
    const s = el("status");
    if (!s) return;
    s.textContent = msg || "";
    s.className = "status" + (kind ? " status-" + kind : "");
  }

  let apiBase = "";

  function looksTechnicalMessage(s) {
    return /[`{}[\]]|STRIPE_|WORKER|LICENSE_|\/v1\/|INTERNAL|D1\b|Cloudflare|ROOTRECORD_|Bearer |webhook|price_id|secret_key|operator\b|site-config/i.test(
      s
    );
  }

  function friendlyFromApiError(j) {
    const msg =
      j && j.error && typeof j.error.message === "string"
        ? j.error.message.trim()
        : typeof j.error === "string"
          ? j.error.trim()
          : "";
    if (msg && msg.length < 200 && !looksTechnicalMessage(msg)) return msg;
    return "";
  }

  async function loadConfig() {
    const res = await fetch("/api/site-config", { cache: "no-store" });
    if (!res.ok) throw new Error("config");
    const j = await res.json();
    apiBase = typeof j.apiBase === "string" ? j.apiBase.replace(/\/+$/, "") : "";
    if (!apiBase) {
      setStatus("Account sign-in is not available on this copy of the site yet. Please try again later.", "warn");
    }
  }

  function apiUrl(path) {
    return apiBase + path;
  }

  async function apiFetch(path, opts) {
    if (!apiBase) {
      return new Response(JSON.stringify({ error: { message: "Service unavailable." } }), {
        status: 503,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    const headers = new Headers(opts?.headers);
    if (!headers.has("Content-Type") && opts?.body) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(apiUrl(path), { ...opts, headers });
  }

  function showPanel(name) {
    ["panel-loading", "panel-forms", "panel-account"].forEach((id) => {
      const n = el(id);
      if (n) n.hidden = id !== name;
    });
  }

  function formatSubscriptionStatus(s) {
    const v = String(s || "").toLowerCase();
    if (v === "active") return "Active";
    if (v === "past_due") return "Past due";
    if (v === "none" || !v) return "None";
    return String(s);
  }

  function renderAccount(data) {
    const box = el("account-details");
    if (!box) return;
    const rows = [
      ["Email", data.email],
      ["Your RootRecord ID", data.account_id],
      ["Subscription", formatSubscriptionStatus(data.subscription_status)],
      ["Password", data.has_password ? "Yes" : "No"],
      ["Trial ends", data.trial_ends_at ? new Date(data.trial_ends_at).toLocaleString() : "—"],
    ];
    box.innerHTML = rows
      .map(
        ([k, v]) =>
          "<div class=account-row><span class=account-k>" +
          escapeHtml(k) +
          "</span><span class=account-v>" +
          escapeHtml(String(v)) +
          "</span></div>"
      )
      .join("");
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function refreshMe() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      showPanel("panel-forms");
      return;
    }
    if (!apiBase) {
      showPanel("panel-forms");
      return;
    }
    showPanel("panel-loading");
    setStatus("");
    const res = await apiFetch("/v1/me", {
      headers: { Authorization: "Bearer " + token },
    });
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      showPanel("panel-forms");
      setStatus("Your session ended. Please sign in again.", "warn");
      return;
    }
    if (!res.ok) {
      showPanel("panel-account");
      setStatus("We could not load your account. Please try again in a moment.", "err");
      return;
    }
    const data = await res.json();
    showPanel("panel-account");
    renderAccount(data);
    applyBillingUi(data);
  }

  function applyBillingUi(data) {
    const available = data && data.billing_checkout_available === true;
    const actions = el("billing-actions");
    const intro = el("billing-intro");
    const unavailable = el("billing-unavailable");
    if (actions) actions.hidden = !available;
    if (intro) intro.hidden = !available;
    if (unavailable) unavailable.hidden = available;
    if (available && data.email && el("billing-email") && !el("billing-email").value) {
      el("billing-email").value = data.email;
    }
  }

  async function onLogin(ev) {
    ev.preventDefault();
    setStatus("");
    if (!apiBase) {
      setStatus("Sign-in is not available here yet. Please try again later.", "warn");
      return;
    }
    const email = el("login-email").value.trim();
    const password = el("login-password").value;
    const device_id = getOrCreateDeviceId();
    try {
      const res = await apiFetch("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, device_id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const human = friendlyFromApiError(j);
        setStatus(human || "Sign-in did not work. Check your email and password.", "err");
        return;
      }
      if (j.access_token) localStorage.setItem(TOKEN_KEY, j.access_token);
      await refreshMe();
    } catch {
      setStatus("Something went wrong. Please try again.", "err");
    }
  }

  async function onSignup(ev) {
    ev.preventDefault();
    setStatus("");
    if (!apiBase) {
      setStatus("Creating an account is not available here yet. Please try again later.", "warn");
      return;
    }
    const email = el("signup-email").value.trim();
    const password = el("signup-password").value;
    const device_id = getOrCreateDeviceId();
    try {
      const res = await apiFetch("/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, device_id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const human = friendlyFromApiError(j);
        setStatus(human || "We could not create an account. Check your details and try again.", "err");
        return;
      }
      if (j.access_token) localStorage.setItem(TOKEN_KEY, j.access_token);
      await refreshMe();
    } catch {
      setStatus("Something went wrong. Please try again.", "err");
    }
  }

  async function onLogout() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && apiBase) {
      try {
        await apiFetch("/v1/auth/logout", {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
        });
      } catch {
        /* ignore */
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    showPanel("panel-forms");
    setStatus("You are signed out.", "ok");
  }

  async function onBilling() {
    setStatus("");
    if (!apiBase) {
      setStatus("Checkout is not available here yet. Please try again later.", "warn");
      return;
    }
    const token = localStorage.getItem(TOKEN_KEY);
    const email = el("billing-email").value.trim();
    if (!token || !email) {
      setStatus("Enter the email that should be used for payment, then try again.", "warn");
      return;
    }
    try {
      const res = await apiFetch("/v1/billing/checkout", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: JSON.stringify({ email }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const raw =
          (j.error && typeof j.error.message === "string" && j.error.message) ||
          (typeof j.error === "string" ? j.error : "") ||
          "";
        if (looksTechnicalMessage(raw) || /Stripe is not configured|STRIPE_|checkout|payment session/i.test(raw)) {
          setStatus(
            "Paying on the web from here is not available right now. Please use billing inside the RootRecord app on your computer.",
            "err"
          );
          return;
        }
        setStatus(raw.slice(0, 300) || "Payment could not be started. Please try again.", "err");
        return;
      }
      if (j.url) {
        window.location.href = j.url;
        return;
      }
      setStatus("Payment could not be started. Please try again.", "err");
    } catch {
      setStatus("Something went wrong. Please try again.", "err");
    }
  }

  window.addEventListener("DOMContentLoaded", async () => {
    showPanel("panel-loading");
    try {
      await loadConfig();
    } catch {
      setStatus("We could not load this page. Please refresh and try again.", "err");
      showPanel("panel-forms");
      return;
    }

    el("form-login")?.addEventListener("submit", onLogin);
    el("form-signup")?.addEventListener("submit", onSignup);
    el("btn-logout")?.addEventListener("click", onLogout);
    el("btn-billing")?.addEventListener("click", onBilling);

    if (localStorage.getItem(TOKEN_KEY)) {
      await refreshMe();
    } else {
      showPanel("panel-forms");
    }
  });
})();
