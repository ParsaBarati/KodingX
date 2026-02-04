export function validateConfig(config) {
  const issues = [];
  if (!config.telegram?.token) issues.push('telegram.token missing');
  if (!Array.isArray(config.telegram?.adminChatIds) || config.telegram.adminChatIds.length === 0) {
    issues.push('telegram.adminChatIds missing');
  }
  return issues;
}
