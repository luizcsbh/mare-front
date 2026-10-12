const BASE = import.meta.env.VITE_API_URL || '/api';
let refreshPromise;
let csrfToken;

function unavailableError() {
  window.dispatchEvent(new Event('api-unavailable'));
  const error = new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
  error.name = 'NetworkError';
  return error;
}

async function request(path, { method = 'GET', body } = {}, retried = false) {
  const isForm = body instanceof FormData;
  const headers = { ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}) };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers,
      body: body && !isForm ? JSON.stringify(body) : body,
    });
  } catch {
    throw unavailableError();
  }
  window.dispatchEvent(new Event('api-available'));
  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    try {
      refreshPromise ||= request('/auth/refresh', { method: 'POST' }, true).finally(() => { refreshPromise = null; });
      await refreshPromise;
      return request(path, { method, body }, true);
    } catch {
      window.dispatchEvent(new Event('auth-expired'));
    }
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Algo deu errado. Tente novamente.');
  if (res.status === 204) return null;
  const data = await res.json();
  if (path === '/auth/csrf') csrfToken = data.token;
  return data;
}

export const api = {
  get: (p) => request(p),
  async getAll(path) {
    const firstPage = await request(`${path}?page=1&limit=100`);
    if (firstPage.pages <= 1) return firstPage.items;
    const remainingPages = await Promise.all(Array.from(
      { length: firstPage.pages - 1 },
      (_, index) => request(`${path}?page=${index + 2}&limit=100`),
    ));
    return [firstPage, ...remainingPages].flatMap((page) => page.items);
  },
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  async openFile(p) {
    let res;
    try { res = await fetch(BASE + p, { credentials: 'include' }); }
    catch { throw unavailableError(); }
    window.dispatchEvent(new Event('api-available'));
    if (!res.ok) throw new Error('Não foi possível abrir o arquivo');
    window.open(URL.createObjectURL(await res.blob()), '_blank');
  },
};
