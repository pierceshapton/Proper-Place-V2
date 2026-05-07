const KEY = 'crm.defaultEmailTemplateId';

export function getDefaultTemplateId(): number | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(KEY);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function setDefaultTemplateId(id: number | null): void {
  if (typeof window === 'undefined') return;
  if (id == null) window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, String(id));
  window.dispatchEvent(new Event('crm-default-template-changed'));
}
