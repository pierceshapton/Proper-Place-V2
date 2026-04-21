export interface SiteAnalysisInput {
  website: string | null;
  name: string;
  address: string;
  types?: string[];
  parkingOptions?: {
    freeParkingLot?: boolean;
    paidParkingLot?: boolean;
    freeStreetParking?: boolean;
    paidStreetParking?: boolean;
    valetParking?: boolean;
  } | null;
  accessibilityOptions?: {
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleEntrance?: boolean;
  } | null;
}

export interface SiteAnalysisResult {
  parkingConfidence: number;
  accessScore: number;
  campervanPriority: number;
  websiteMentions: string[];
  reasons: string[];
  scoreBoost: number;
}

export function analyzeSiteSignals(input: SiteAnalysisInput, websiteText: string): SiteAnalysisResult {
  const reasons: string[] = [];
  const mentions: string[] = [];

  let parkingConfidence = 0;
  let accessScore = 0;
  let campervanPriority = 0;

  const text = `${input.name} ${input.address} ${websiteText}`.toLowerCase();

  const parkingMentions = countKeywordHits(text, PARKING_TERMS);
  const campervanMentions = countKeywordHits(text, CAMPERVAN_TERMS);
  const overnightMentions = countKeywordHits(text, OVERNIGHT_TERMS);
  const accessMentions = countKeywordHits(text, ACCESS_TERMS);

  if (parkingMentions > 0) {
    const score = Math.min(24, 8 + parkingMentions * 3);
    parkingConfidence += score;
    mentions.push('Website mentions parking');
    reasons.push(`Parking language detected (+${score})`);
  }

  if (campervanMentions > 0 || overnightMentions > 0) {
    const score = Math.min(30, 12 + campervanMentions * 5 + overnightMentions * 3);
    campervanPriority += score;
    mentions.push('Website mentions campervan/motorhome stays');
    reasons.push(`Overnight campervan fit detected (+${score})`);
  }

  if (accessMentions > 0) {
    const score = Math.min(14, 5 + accessMentions * 2);
    accessScore += score;
    mentions.push('Website mentions site access details');
    reasons.push(`Access guidance detected (+${score})`);
  }

  const parkingOptions = input.parkingOptions || {};
  const hasLot = !!parkingOptions.freeParkingLot || !!parkingOptions.paidParkingLot;
  const hasStreet = !!parkingOptions.freeStreetParking || !!parkingOptions.paidStreetParking;

  if (hasLot) {
    parkingConfidence += 26;
    reasons.push('Google indicates parking lot availability (+26)');
  }

  if (hasStreet) {
    parkingConfidence += 8;
    reasons.push('Google indicates street parking options (+8)');
  }

  if (parkingOptions.valetParking) {
    parkingConfidence += 4;
  }

  const accessibility = input.accessibilityOptions || {};
  if (accessibility.wheelchairAccessibleParking) {
    accessScore += 12;
    reasons.push('Wheelchair-accessible parking signal (+12)');
  }
  if (accessibility.wheelchairAccessibleEntrance) {
    accessScore += 8;
  }

  const types = (input.types || []).map(t => t.toLowerCase());
  if (types.some(t => t.includes('rv_park') || t.includes('campground') || t.includes('camp_site'))) {
    campervanPriority += 30;
    reasons.push('Place type indicates campervan/overnight suitability (+30)');
  }

  if (types.some(t => t.includes('lodging') || t.includes('hotel') || t.includes('inn') || t.includes('pub'))) {
    campervanPriority += 6;
  }

  parkingConfidence = clamp(parkingConfidence, 0, 100);
  accessScore = clamp(accessScore, 0, 100);
  campervanPriority = clamp(campervanPriority, 0, 100);

  const scoreBoost = clamp(
    Math.round(parkingConfidence * 0.25 + accessScore * 0.2 + campervanPriority * 0.35),
    0,
    45
  );

  if (scoreBoost > 0) {
    reasons.push(`Composite site signal boost (+${scoreBoost})`);
  }

  return {
    parkingConfidence,
    accessScore,
    campervanPriority,
    websiteMentions: mentions,
    reasons,
    scoreBoost,
  };
}

export function extractReadableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120000);
}

function countKeywordHits(text: string, terms: string[]): number {
  return terms.reduce((count, term) => {
    if (text.includes(term)) return count + 1;
    return count;
  }, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const PARKING_TERMS = [
  'parking',
  'car park',
  'private parking',
  'onsite parking',
  'on-site parking',
  'free parking',
  'parking available',
  'allocated parking',
  'secure parking',
];

const CAMPERVAN_TERMS = [
  'campervan',
  'motorhome',
  'rv',
  'recreational vehicle',
  'camping van',
  'vanlife',
  'touring van',
];

const OVERNIGHT_TERMS = [
  'overnight stay',
  'overnight parking',
  'night stop',
  'stopover',
  'stay overnight',
  'one night',
  'nightly stay',
];

const ACCESS_TERMS = [
  'easy access',
  'access road',
  'wide entrance',
  'entrance gate',
  'approach road',
  'arrival instructions',
  'turning space',
  'suitable for large vehicles',
  'vehicle access',
];
