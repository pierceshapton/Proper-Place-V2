import type { CRMLead } from '@/lib/api';
import type { SiteAnalysisResult } from '@/lib/discoverySiteAnalysis';

export interface CandidatePlace {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  reviews: number | null;
  website: string | null;
  primaryType: string | null;
  types: string[];
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
  siteAnalysis?: SiteAnalysisResult | null;
  reviewsText?: string[];
  editorialSummary?: string | null;
}

export interface ScoredCandidate extends CandidatePlace {
  score: number;
  reasons: string[];
  criteriaChecks?: Array<{ label: string; met: boolean; detail: string }>;
}

interface DiscoveryProfile {
  averageRating: number;
  averageReviews: number;
  prefersWebsite: boolean;
  topTypes: string[];
  locationTokens: string[];
}

export function buildDiscoveryProfile(examples: CRMLead[]): DiscoveryProfile {
  const ratings = examples.map(l => l.google_rating).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const reviews = examples.map(l => l.google_reviews_count).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const websites = examples.filter(l => !!l.website && l.website.trim().length > 0).length;

  const typeCounts: Record<string, number> = {};
  examples.forEach(lead => {
    const fromProperty = normalizeType(lead.property_type || '');
    if (fromProperty) typeCounts[fromProperty] = (typeCounts[fromProperty] || 0) + 1;
  });

  const locationTokenCounts: Record<string, number> = {};
  examples.forEach(lead => {
    const tokens = extractLocationTokens(lead.location || '');
    tokens.forEach(token => {
      locationTokenCounts[token] = (locationTokenCounts[token] || 0) + 1;
    });
  });

  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([type]) => type);

  const locationTokens = Object.entries(locationTokenCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([token]) => token);

  return {
    averageRating: ratings.length ? avg(ratings) : 4.2,
    averageReviews: reviews.length ? avg(reviews) : 120,
    prefersWebsite: examples.length > 0 ? websites / examples.length >= 0.5 : true,
    topTypes,
    locationTokens,
  };
}

export function scoreCandidate(candidate: CandidatePlace, profile: DiscoveryProfile): ScoredCandidate {
  let score = 0;
  const reasons: string[] = [];

  const candidateTypes = [normalizeType(candidate.primaryType || ''), ...candidate.types.map(normalizeType)].filter(Boolean) as string[];
  const uniqueTypes = Array.from(new Set(candidateTypes));

  const typeOverlap = uniqueTypes.filter(type => profile.topTypes.includes(type)).length;
  if (typeOverlap > 0) {
    const typeScore = Math.min(28, typeOverlap * 9);
    score += typeScore;
    reasons.push(`Type match with your examples (+${typeScore})`);
  }

  if (typeof candidate.rating === 'number') {
    const diff = Math.abs(candidate.rating - profile.averageRating);
    const ratingScore = Math.max(0, 24 - diff * 10);
    score += ratingScore;
    if (ratingScore >= 12) reasons.push(`Rating close to your benchmark (+${Math.round(ratingScore)})`);
  }

  if (typeof candidate.reviews === 'number') {
    const expected = Math.max(20, profile.averageReviews * 0.35);
    if (candidate.reviews >= expected) {
      const reviewsScore = Math.min(16, 6 + Math.log10(Math.max(candidate.reviews, 1)) * 5);
      score += reviewsScore;
      reasons.push(`Strong review volume (+${Math.round(reviewsScore)})`);
    }
  }

  const parkingOptions = candidate.parkingOptions || {};
  if (parkingOptions.freeParkingLot || parkingOptions.paidParkingLot) {
    score += 18;
    reasons.push('Parking lot signal from Google (+18)');
  } else if (parkingOptions.freeStreetParking || parkingOptions.paidStreetParking) {
    score += 7;
    reasons.push('Street parking signal from Google (+7)');
  }

  const accessibility = candidate.accessibilityOptions || {};
  if (accessibility.wheelchairAccessibleParking) {
    score += 6;
    reasons.push('Accessible parking signal (+6)');
  }

  const hasWebsite = !!candidate.website;
  if (profile.prefersWebsite && hasWebsite) {
    score += 10;
    reasons.push('Website available for outreach (+10)');
  }

  if (!profile.prefersWebsite && !hasWebsite) {
    score += 4;
  }

  const candidateAddress = `${candidate.address} ${candidate.name}`.toLowerCase();
  const tokenHits = profile.locationTokens.filter(token => candidateAddress.includes(token)).length;
  if (tokenHits > 0) {
    const locationScore = Math.min(14, tokenHits * 4);
    score += locationScore;
    reasons.push(`Located near your target patterns (+${locationScore})`);
  }

  const analysis = candidate.siteAnalysis;
  if (analysis) {
    const analysisBoost = Math.min(40, analysis.scoreBoost);
    score += analysisBoost;
    reasons.push(...analysis.reasons.slice(0, 3));
  }

  const normalized = clamp(Math.round(score), 0, 100);
  if (reasons.length === 0) {
    reasons.push('General fit based on available site metadata');
  }

  return {
    ...candidate,
    score: normalized,
    reasons,
  };
}

function extractLocationTokens(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 4 && !STOP_WORDS.has(s));
}

function normalizeType(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function avg(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const STOP_WORDS = new Set([
  'road', 'street', 'north', 'south', 'east', 'west', 'county', 'near', 'with', 'from', 'that', 'this', 'your', 'their', 'place', 'venue',
]);
