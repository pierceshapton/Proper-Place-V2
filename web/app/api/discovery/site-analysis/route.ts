import { NextResponse } from 'next/server';
import { analyzeSiteSignals, extractReadableText } from '@/lib/discoverySiteAnalysis';

interface SiteAnalysisRequestBody {
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SiteAnalysisRequestBody;

    const website = normalizeWebsite(body.website);
    const websiteText = website ? await fetchWebsiteText(website) : '';

    const analysis = analyzeSiteSignals(
      {
        website,
        name: body.name || '',
        address: body.address || '',
        types: Array.isArray(body.types) ? body.types : [],
        parkingOptions: body.parkingOptions || null,
        accessibilityOptions: body.accessibilityOptions || null,
      },
      websiteText
    );

    return NextResponse.json({
      analysis,
      websiteFetched: !!websiteText,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Analysis failed',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    );
  }
}

function normalizeWebsite(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function fetchWebsiteText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ProperPlaceDiscoveryBot/1.0 (+https://properplace.co.uk)',
        Accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
    });

    if (!response.ok) return '';

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return '';

    const html = await response.text();
    return extractReadableText(html);
  } catch {
    return '';
  } finally {
    clearTimeout(timeout);
  }
}
