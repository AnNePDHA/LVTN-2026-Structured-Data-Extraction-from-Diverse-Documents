// Opened from this machine (vite dev or the build served by uvicorn) → same-origin /api, otherwise the tunnel in public/config.js
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
const API_ORIGIN = isLocal ? '' : (window.APP_CONFIG?.apiOrigin || '').replace(/\/+$/, '');
const BASE = `${API_ORIGIN}/api`;

// Backend returns paths like /api/documents/<id>/preview, which must point at the backend, not the page's host
export const assetUrl = (p) => (p?.startsWith('/') ? API_ORIGIN + p : p);

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  // A crash page (500) is plain text, not JSON
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : data?.detail ? JSON.stringify(data.detail) : null;
    throw new Error(detail || `${res.status} ${res.statusText || 'Server error'}`);
  }
  return data;
}

// XHR instead of fetch so the upload step can show real progress
function upload(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/documents`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.((e.loaded / e.total) * 100); };
    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* non-JSON error page */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data?.detail || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

async function text(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

const enc = encodeURIComponent;

export const api = {
  upload,
  samples: () => request('GET', '/documents/samples'),
  useSample: (id) => request('POST', `/documents/samples/${enc(id)}`),

  pipelines: () => request('GET', '/pipelines'),
  providers: () => request('GET', '/providers'),

  schemas: () => request('GET', '/schemas'),
  schema: (key) => request('GET', `/schemas/${enc(key)}`),
  createSchema: (key, fields) => request('POST', '/schemas', { key, fields }),
  updateSchema: (key, fields) => request('PUT', `/schemas/${enc(key)}`, { fields }),
  deleteSchema: (key) => request('DELETE', `/schemas/${enc(key)}`),

  prompts: () => request('GET', '/prompts'),
  prompt: (name) => request('GET', `/prompts/${enc(name)}`),
  savePrompt: (name, text) => request('PUT', `/prompts/${enc(name)}`, { text }),

  // Model ids may contain "/" (e.g. OpenRouter), the backend routes them with {model_id:path}
  models: (pipeline) => request('GET', `/models${pipeline ? `?pipeline=${pipeline}` : ''}`),
  createModel: (body) => request('POST', '/models', body),
  updateModel: (id, body) => request('PUT', `/models/${encodeURI(id)}`, body),
  deleteModel: (id) => request('DELETE', `/models/${encodeURI(id)}`),
  testModel: (id) => request('POST', `/models/${encodeURI(id)}/test`),
  ocrEngines: () => request('GET', '/ocr-engines'),

  createJob: (body) => request('POST', '/jobs', body),
  job: (id) => request('GET', `/jobs/${enc(id)}`),
  jobs: (limit = 20, offset = 0) => request('GET', `/jobs?limit=${limit}&offset=${offset}`),
  deleteJob: (id) => request('DELETE', `/jobs/${enc(id)}`),
  saveJobFields: (id, fields) => request('PATCH', `/jobs/${enc(id)}/fields`, { fields }),
  jobArtifact: (id, name) => text(`/jobs/${enc(id)}/files/${enc(name)}`),
  exportJson: (id) => text(`/jobs/${enc(id)}/export?format=json`),
  exportUrl: (id, format) => `${BASE}/jobs/${enc(id)}/export?format=${format}`,
  bundleUrl: (id) => `${BASE}/jobs/${enc(id)}/bundle`,
};
