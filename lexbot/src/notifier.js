import { sendMessage } from './telegram_client.js';

export async function notifyAdmins(config, message) {
  if (!config.notifications?.enabled) return;
  const token = config.telegram?.token;
  if (!token) return;
  const baseUrl = config.telegram.baseUrl || 'https://api.telegram.org';
  const admins = config.telegram.adminChatIds || [];
  const text = String(message).slice(0, config.notifications.maxLen || 3000);
  for (const chatId of admins) {
    try {
      await sendMessage(baseUrl, token, chatId, text);
    } catch {
      // ignore
    }
  }
}
