export function deriveDomain(pathsHint = [], keywords = []) {
  const joined = `${pathsHint.join(' ')} ${keywords.join(' ')}`.toLowerCase();
  if (joined.includes('auth') || joined.includes('login')) return 'auth';
  if (joined.includes('billing') || joined.includes('payment')) return 'billing';
  if (joined.includes('db') || joined.includes('migration')) return 'db';
  if (joined.includes('ui') || joined.includes('frontend')) return 'ui';
  if (joined.includes('infra') || joined.includes('deploy')) return 'infra';
  if (joined.includes('test') || joined.includes('spec')) return 'tests';
  return 'general';
}
