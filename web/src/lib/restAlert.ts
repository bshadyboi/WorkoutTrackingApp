/** Rest-done alerts: wake lock, SW timer, delayed web-push, vibrate/beep. */

const REST_STORAGE_KEY = "fittrack-active-rest";
const REST_PUSH_ID_KEY = "fittrack-rest-push-id";
const REST_FIRED_KEY = "fittrack-rest-fired-at";

export const SW_URL = "/sw.js?v=rest8";

/**
 * iOS unlocks audio only inside a user gesture. We create ONE persistent
 * AudioContext during the set-complete tap and reuse it when the timer
 * fires, so the beep is audible instead of silently suspended.
 */
let sharedAudioCtx: AudioContext | null = null;

export function primeAudio() {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === "suspended") void sharedAudioCtx.resume();
    // Play one silent sample — this is what actually unlocks iOS audio
    const buf = sharedAudioCtx.createBuffer(1, 1, 22050);
    const src = sharedAudioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(sharedAudioCtx.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
}

export type ActiveRestState = {
  exerciseId: string;
  afterSet: number;
  endsAt: number;
  label: string;
  url?: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function ensureRestNotifyPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const p = await Notification.requestPermission();
    return p === "granted";
  } catch {
    return false;
  }
}

/** Make sure we have a web-push subscription so background rest can alert. */
export async function ensurePushSubscription() {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!("Notification" in window) || Notification.permission !== "granted") return false;

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!pub) return false;

  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pub),
      });
    }
    const json = sub.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
      keepalive: true,
    });
    return true;
  } catch {
    return false;
  }
}

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    // Reuse the gesture-primed context; a fresh one stays suspended on iOS
    const ctx = sharedAudioCtx && sharedAudioCtx.state !== "closed" ? sharedAudioCtx : new Ctx();
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.stop(ctx.currentTime + 0.6);
    void ctx.resume();
  } catch {
    /* ignore */
  }
}

export async function fireRestDoneAlert(exerciseLabel?: string) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([220, 80, 220, 80, 320]);
    } catch {
      /* ignore */
    }
  }
  beep();

  const title = "Rest done";
  const body = exerciseLabel
    ? `Time for your next set · ${exerciseLabel}`
    : "Time for your next set";

  try {
    if ("Notification" in window && Notification.permission === "granted") {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "fittrack-rest",
          requireInteraction: true,
          data: { url: window.location.pathname },
        });
      } else {
        new Notification(title, { body, tag: "fittrack-rest" });
      }
    }
  } catch {
    /* ignore */
  }
}

function postToSw(msg: Record<string, unknown>) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const ctrl = navigator.serviceWorker.controller;
  if (ctrl) {
    ctrl.postMessage(msg);
    return;
  }
  void navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage(msg);
  });
}

let wakeLock: WakeLockSentinel | null = null;

async function acquireWakeLock() {
  try {
    if (!("wakeLock" in navigator)) return;
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {
    /* unsupported / denied */
  }
}

export function releaseWakeLock() {
  try {
    void wakeLock?.release();
  } catch {
    /* ignore */
  }
  wakeLock = null;
}

async function scheduleDelayedPush(state: ActiveRestState) {
  try {
    // Ensure push channel exists before asking the server to wait
    await ensurePushSubscription();
    const res = await fetch("/api/push/rest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endsAt: state.endsAt,
        label: state.label,
        url: state.url || window.location.pathname,
      }),
      keepalive: true,
    });
    if (!res.ok) return false;
    const json = (await res.json()) as {
      id?: string | null;
      ok?: boolean;
      reason?: string;
    };
    if (json.id) localStorage.setItem(REST_PUSH_ID_KEY, json.id);
    if (json.ok === false) {
      // Was silently swallowed before — let the UI warn the user
      window.dispatchEvent(
        new CustomEvent("fittrack:rest-push-failed", {
          detail: { reason: json.reason || "unknown" },
        })
      );
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function cancelDelayedPush() {
  try {
    const id = localStorage.getItem(REST_PUSH_ID_KEY);
    localStorage.removeItem(REST_PUSH_ID_KEY);
    await fetch("/api/push/rest", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Persist + keep screen awake + SW schedule + delayed web-push.
 * Web-push is what fires when the phone is locked / app backgrounded.
 */
export async function scheduleRestAlert(state: ActiveRestState) {
  if (typeof window === "undefined") return;
  primeAudio(); // called from the set-complete tap → unlocks iOS audio
  try {
    localStorage.removeItem(REST_FIRED_KEY);
    localStorage.setItem(REST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }

  const ok = await ensureRestNotifyPermission();
  await acquireWakeLock();

  postToSw({
    type: "SCHEDULE_REST",
    endsAt: state.endsAt,
    label: state.label,
    url: state.url || window.location.pathname,
  });

  if (ok) {
    void scheduleDelayedPush(state);
  }
}

export function cancelRestAlert() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REST_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  releaseWakeLock();
  postToSw({ type: "CANCEL_REST" });
  void cancelDelayedPush();
}

export function loadPersistedRest(): ActiveRestState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveRestState;
    if (!parsed?.endsAt || !parsed.exerciseId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function restSecondsLeft(endsAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/** Prevent double-firing across WorkoutLogger + RestTimerHost + SW message. */
export function shouldFireRestAlert(endsAt: number) {
  if (typeof window === "undefined") return true;
  try {
    const prev = localStorage.getItem(REST_FIRED_KEY);
    if (prev === String(endsAt)) return false;
    localStorage.setItem(REST_FIRED_KEY, String(endsAt));
    return true;
  } catch {
    return true;
  }
}
