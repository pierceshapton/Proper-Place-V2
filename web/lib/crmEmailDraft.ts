import type { CRMEmailTemplate, CRMLead } from '@/lib/api';

export interface EmailDraft {
  subject: string;
  body: string;
}

const OPENERS = [
  'I hope you are well.',
  'I hope your week is going well.',
  'I wanted to send you a quick note.',
  'I thought I would reach out directly.',
];

const CTA_LINES = [
  'Would you be open to a quick 10-minute chat this week?',
  'If this sounds relevant, I would love to arrange a short call.',
  'Happy to share how this works in practice if useful.',
  'If helpful, I can send over a short overview and examples.',
];

const CLOSINGS = [
  'Best regards,',
  'Kind regards,',
  'Thanks again,',
  'All the best,',
];

export function generatePersonalizedDraft(lead: CRMLead, template?: CRMEmailTemplate): EmailDraft {
  const seed = (lead.id || 1) + (lead.business_name?.length || 0) + (lead.location?.length || 0);
  const opener = pick(OPENERS, seed + 1);
  const cta = pick(CTA_LINES, seed + 2);
  const closing = pick(CLOSINGS, seed + 3);

  const contactName = firstNonEmpty(lead.first_name, lead.last_name) || 'there';
  const businessName = lead.business_name || 'your site';

  const contextLines: string[] = [];
  if (lead.business_name && lead.location) {
    contextLines.push(`I was looking at ${lead.business_name} in ${lead.location} and thought it could be a great fit for overnight motorhome stays.`);
  } else if (lead.location) {
    contextLines.push(`I was looking at locations around ${lead.location} and wanted to reach out.`);
  } else {
    contextLines.push('I wanted to introduce Proper Place and see if this could be useful for your site.');
  }

  if (lead.google_rating && lead.google_reviews_count) {
    contextLines.push(`Your reviews really stand out (${lead.google_rating}/5 from ${lead.google_reviews_count} reviews), which is exactly what motorhome guests value.`);
  }

  if (lead.parking_spaces && lead.parking_spaces > 0) {
    contextLines.push(`If you have around ${lead.parking_spaces} spaces available at the right times, that is often enough to run this smoothly without disruption.`);
  } else if (lead.parking_type) {
    contextLines.push(`Sites with ${lead.parking_type.toLowerCase()} parking often work very well for this.`);
  }

  if (lead.source) {
    contextLines.push(`We first came across your site via ${lead.source}.`);
  }

  const mergedTemplateSubject = mergeTemplate(template?.subject || '', lead);
  const mergedTemplateBody = mergeTemplate(template?.body || '', lead).trim();

  const subject = mergedTemplateSubject || `Quick idea for ${businessName}`;

  const intro = `Hi ${contactName},\n\n${opener}`;

  const middle = mergedTemplateBody
    ? `${mergedTemplateBody}\n\n${contextLines.join(' ')}`
    : `${contextLines.join(' ')}\n\nProper Place helps venues welcome responsible motorhome guests for short overnight stays, creating extra revenue from existing space.`;

  const body = [
    intro,
    middle,
    cta,
    `${closing}\nProper Place`,
  ].join('\n\n');

  return { subject, body };
}

export function mergeTemplate(input: string, lead: CRMLead): string {
  const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
  const businessOrName = lead.business_name || fullName;

  const replacements: Record<string, string> = {
    first_name: firstNonEmpty(lead.first_name, lead.business_name) || 'there',
    last_name: lead.last_name || '',
    business_name: businessOrName || 'your site',
    location: lead.location || 'your area',
    property_type: lead.property_type || 'site',
    source: lead.source || 'our research',
    parking_spaces: lead.parking_spaces ? String(lead.parking_spaces) : '',
    parking_type: lead.parking_type || 'on-site',
    website: lead.website || 'your website',
    phone: lead.phone || 'your phone number',
    email: lead.email || 'your email',
  };

  return input.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return replacements[key] || '';
    }

    const rawValue = (lead as Record<string, unknown>)[key];
    if (rawValue === null || rawValue === undefined) return '';
    return String(rawValue);
  });
}

function pick<T>(values: T[], seed: number): T {
  return values[Math.abs(seed) % values.length];
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (value && value.trim()) return value.trim();
  }
  return '';
}
