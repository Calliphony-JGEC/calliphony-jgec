function roleRank(role) {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'secretary') return 0;
  if (normalized === 'cashier') return 1;
  return 2;
}

/** Secretary first, then Cashier; names Z → A within the same role. */
export function compareSecretaries(a, b) {
  const roleCmp = roleRank(a.role) - roleRank(b.role);
  if (roleCmp !== 0) return roleCmp;
  return String(b.name || '').localeCompare(String(a.name || ''), undefined, { sensitivity: 'base' });
}

export function sortSecretaries(list = []) {
  return [...list].sort(compareSecretaries);
}
