async function callTelegram(baseUrl, token, method, params) {
  const url = new URL(`${baseUrl}/bot${token}/${method}`);
  if (params && method === 'getUpdates') {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url, {
    method: method === 'getUpdates' ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: method === 'getUpdates' ? undefined : JSON.stringify(params)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram error ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
  }
  return data.result;
}

export async function getUpdates(baseUrl, token, offset, timeoutSec = 10, limit = 20) {
  return callTelegram(baseUrl, token, 'getUpdates', {
    offset,
    timeout: timeoutSec,
    limit
  });
}

export async function sendMessage(baseUrl, token, chatId, text) {
  return callTelegram(baseUrl, token, 'sendMessage', {
    chat_id: chatId,
    text
  });
}
