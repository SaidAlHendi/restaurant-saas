import { config } from './config.mjs';

/** Minimal API client: JSON in/out, optional bearer token and extra headers, never throws on HTTP errors. */
export class Client {
  constructor(token = null, baseUrl = config.apiUrl) {
    this.token = token;
    this.baseUrl = baseUrl;
    this.cookies = {};
    this.branchId = null;
  }

  withToken(token) {
    const c = new Client(token, this.baseUrl);
    c.cookies = this.cookies;
    c.branchId = this.branchId;
    return c;
  }

  /** Copy of this client that sends X-Branch-Id on every request. */
  inBranch(branchId) {
    const c = this.withToken(this.token);
    c.branchId = branchId;
    return c;
  }

  async request(method, path, { body, headers = {}, raw = false } = {}) {
    const h = { Accept: 'application/json', ...headers };
    if (this.branchId) h['X-Branch-Id'] = this.branchId;
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    if (body !== undefined && !(body instanceof FormData)) h['Content-Type'] = 'application/json';
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookie) h.Cookie = cookie;
    let res;
    try {
      res = await fetch(this.baseUrl + path, {
        method,
        headers: h,
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
        signal: AbortSignal.timeout(config.timeoutMs),
        redirect: 'manual',
      });
    } catch (err) {
      return { status: 0, ok: false, body: null, text: String(err?.cause?.code ?? err.message), headers: new Headers() };
    }
    for (const sc of res.headers.getSetCookie?.() ?? []) {
      const [pair] = sc.split(';');
      const i = pair.indexOf('=');
      this.cookies[pair.slice(0, i)] = pair.slice(i + 1);
    }
    const text = await res.text();
    let parsed = null;
    if (!raw) {
      try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
    }
    return { status: res.status, ok: res.ok, body: parsed, text, headers: res.headers };
  }

  get(path, opts) { return this.request('GET', path, opts); }
  post(path, body, opts) { return this.request('POST', path, { ...opts, body: body ?? {} }); }
  put(path, body, opts) { return this.request('PUT', path, { ...opts, body }); }
  patch(path, body, opts) { return this.request('PATCH', path, { ...opts, body }); }
  delete(path, opts) { return this.request('DELETE', path, opts); }
}

/** Plain GET against a front-end dev server (HTML), used for the reachability checks. */
export async function getPage(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(config.timeoutMs), redirect: 'follow' });
    return { status: res.status, text: await res.text() };
  } catch (err) {
    return { status: 0, text: String(err?.cause?.code ?? err.message) };
  }
}

export function uuid() {
  return crypto.randomUUID();
}
