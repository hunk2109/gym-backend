export interface ClosingReportRecipient {
  name: string;
  email: string;
  phone: string;
  sendEmail: boolean;
  sendWhatsapp: boolean;
}

export function normalizeClosingReportRecipients(
  raw: any,
  channel: string = 'both',
): ClosingReportRecipient[] {
  if (!raw) return [];

  let items: any[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) items = parsed;
      } catch (_) {}
    }
    if (items.length === 0) {
      items = trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const results: ClosingReportRecipient[] = [];

  for (const item of items) {
    if (!item) continue;
    if (typeof item === 'string') {
      const isEmail = item.includes('@');
      const email = isEmail ? item.trim() : '';
      const phone = !isEmail ? item.replace(/[^0-9+]/g, '').trim() : '';
      results.push({
        name: isEmail ? email : phone,
        email,
        phone,
        sendEmail: isEmail && (channel === 'email' || channel === 'both'),
        sendWhatsapp: !isEmail && (channel === 'whatsapp' || channel === 'both'),
      });
    } else if (typeof item === 'object') {
      const email = (item.email || (item.name?.includes('@') ? item.name : '')).trim();
      const phone = (item.phone || (!item.name?.includes('@') ? item.name : '') || '').replace(/[^0-9+]/g, '').trim();
      const hasEmail = Boolean(email && email.includes('@'));
      const hasPhone = Boolean(phone && phone.length >= 7);

      const allowEmail = channel === 'email' || channel === 'both';
      const allowWhatsapp = channel === 'whatsapp' || channel === 'both';

      const sendEmail = hasEmail && allowEmail && (item.sendEmail !== false);
      const sendWhatsapp = hasPhone && allowWhatsapp && (item.sendWhatsapp !== false);

      results.push({
        name: item.name || email || phone || 'Destinatario',
        email,
        phone,
        sendEmail,
        sendWhatsapp,
      });
    }
  }

  return results;
}
