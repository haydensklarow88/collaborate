// src/api/base44Client.js
// Lightweight API client that talks to your own backend (or mocks).
// No Base44 imports, no redirects. Safe for Netlify (frontend only).

const API_BASE = import.meta.env.VITE_API_BASE || "";
// If you don't have a backend yet, leave empty and this will noop/mimic responses.
// Later, set VITE_API_BASE in Netlify to your HIPAA backend URL (no PHI in frontend).

/**
 * Generic GET helper
 */
export async function apiGet(path, opts = {}) {
  if (!API_BASE) {
    // No backend configured — return a harmless placeholder.
    // Replace with real fetch once your backend is ready.
    return { ok: true, data: { message: "No backend configured yet." } };
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "include",
  });
  return handleJson(res);
}

/**
 * Generic POST helper
 */
export async function apiPost(path, body = {}, opts = {}) {
  if (!API_BASE) {
    return { ok: true, data: { message: "POST mocked; backend not set." } };
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return handleJson(res);
}

async function handleJson(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore parse errors
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return { ok: true, data };
}

// ---------------------------------------------------------------------------
// Compatibility shim: export a `base44` object with the minimal surface that
// the existing app imports expect (functions, entities, integrations, auth).
// Each area is a lazy proxy that maps calls to friendly REST endpoints on
// your backend (or returns harmless mocks when API_BASE is empty).
// ---------------------------------------------------------------------------

function makeFunctionHandler(name) {
  return async (payload = {}) => {
    if (!API_BASE) return { ok: true, data: { message: `Mocked function ${name}` } };
    return apiPost(`/functions/${name}`, payload);
  };
}

const functions = new Proxy(
  {
    // explicit invoke(name, payload) used in some places
    invoke: async (name, payload = {}) => {
      if (!API_BASE) return { ok: true, data: { message: `Mocked invoke ${name}` } };
      return apiPost(`/functions/${name}`, payload);
    },
  },
  {
    get(_, prop) {
      if (prop in this) return this[prop];
      // return a function that calls the named function endpoint
      return makeFunctionHandler(prop);
    },
  }
);

function makeEntityProxy(entityName) {
  return {
    // common helpers
    list: async (params = {}) => {
      if (!API_BASE) return { ok: true, data: [] };
      const qs = typeof params === 'string' ? params : new URLSearchParams(params).toString();
      const path = qs ? `/entities/${entityName}?${qs}` : `/entities/${entityName}`;
      return apiGet(path);
    },
    get: async (id) => {
      if (!API_BASE) return { ok: true, data: null };
      return apiGet(`/entities/${entityName}/${id}`);
    },
    create: async (body = {}) => {
      if (!API_BASE) return { ok: true, data: { message: 'created (mock)' } };
      return apiPost(`/entities/${entityName}`, body);
    },
    update: async (idOrBody, maybeBody) => {
      if (!API_BASE) return { ok: true, data: { message: 'updated (mock)' } };
      if (typeof idOrBody === 'string' || typeof idOrBody === 'number') {
        return apiPost(`/entities/${entityName}/${idOrBody}`, maybeBody || {});
      }
      return apiPost(`/entities/${entityName}`, idOrBody || {});
    },
    // Optional: fetch entity JSON schema if backend supports it
    schema: async () => {
      if (!API_BASE) return { properties: {} };
      const res = await apiGet(`/entities/${entityName}/schema`);
      return res?.data ?? { properties: {} };
    },
      // `me` is used by User.me()
      // return the raw user object (or null) to match callers that expect
      // `const me = await User.me()` and then read me.onboarding_complete
      me: async () => {
        if (!API_BASE) return null;
        const res = await apiGet('/auth/me');
        // apiGet returns { ok: true, data } on success
        return res && res.data ? res.data : null;
    },
  };
}

const entities = new Proxy({}, {
  get(_, prop) {
    return makeEntityProxy(prop);
  }
});

const integrations = {
  Core: new Proxy({}, {
    get(_, prop) {
      return async (payload = {}) => {
        if (!API_BASE) return { ok: true, data: { message: `Mocked integration Core.${String(prop)}` } };
        return apiPost(`/integrations/core/${String(prop)}`, payload);
      };
    }
  })
};

const auth = {
  updateMe: async (payload = {}) => {
    if (!API_BASE) return { ok: true, data: { message: 'updateMe mocked' } };
    return apiPost('/auth/updateMe', payload);
  },
  // Back-compat alias used throughout pages
  updateMyUserData: async (payload = {}) => {
    return auth.updateMe(payload);
  },
  // expose a minimal `me` for callers that import auth directly
  me: async () => {
    if (!API_BASE) return null;
    const res = await apiGet('/auth/me');
    return res?.data ?? null;
  }
};

export const base44 = { functions, entities, integrations, auth };
