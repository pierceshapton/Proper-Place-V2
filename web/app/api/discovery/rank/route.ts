import { NextResponse } from 'next/server';

interface FeedbackExample {
  name: string;
  address: string;
  stars: number;
  note?: string;
}

interface CandidateInput {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  reviews: number | null;
  primaryType: string | null;
  parkingOptions?: {
    freeParkingLot?: boolean;
    paidParkingLot?: boolean;
    freeStreetParking?: boolean;
    paidStreetParking?: boolean;
  } | null;
  siteAnalysis?: {
    campervanPriority: number;
    parkingConfidence: number;
    campervanSnippets?: string[];
  } | null;
  reviewsText?: string[];
  editorialSummary?: string | null;
}

interface RankRequestBody {
  candidates: CandidateInput[];
  feedback: FeedbackExample[];
  profile?: {
    topTypes?: string[];
  };
}

interface RankResult {
  id: string;
  score: number;
  reasoning: string;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 });
  }

  let body: RankRequestBody;
  try {
    body = (await request.json()) as RankRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { candidates, feedback, profile } = body;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ error: 'No candidates provided' }, { status: 400 });
  }

  const prompt = buildPrompt(candidates, feedback || [], profile);

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a venue discovery assistant for Proper Place. Your job is to score pubs, inns, hotels and similar venues for how likely they are to welcome campervan overnight parking partnerships. You always respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text();
      return NextResponse.json({ error: 'OpenAI error', detail: err }, { status: 502 });
    }

    const openaiData = (await openaiResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = openaiData.choices?.[0]?.message?.content || '{}';

    let parsed: { results?: RankResult[] };
    try {
      parsed = JSON.parse(raw) as { results?: RankResult[] };
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON', raw }, { status: 502 });
    }

    const results = Array.isArray(parsed.results) ? parsed.results : [];
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: 'Request failed', detail: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}

function buildPrompt(
  candidates: CandidateInput[],
  feedback: FeedbackExample[],
  profile?: { topTypes?: string[] },
): string {
  const parts: string[] = [];

  parts.push(
    'Score each candidate venue 0–100 for how good a fit they are for Proper Place campervan overnight parking partnerships.',
    'A score of 100 means perfect: they obviously welcome campervans, have parking, good reviews, and suit the profile.',
    'A score below 40 means unlikely to be interested or a poor fit.',
    '',
  );

  if (profile?.topTypes && profile.topTypes.length > 0) {
    parts.push(`Preferred venue types based on existing partnerships: ${profile.topTypes.join(', ')}.`, '');
  }

  if (feedback.length > 0) {
    parts.push('== MY PAST RATINGS (learn from these) ==');
    feedback.forEach(f => {
      const line = `- "${f.name}", ${f.address} → ${f.stars}/5 stars${f.note ? ` (reason: ${f.note})` : ''}`;
      parts.push(line);
    });
    parts.push('');
  }

  parts.push('== CANDIDATES TO SCORE ==');
  candidates.forEach((c, i) => {
    const lines: string[] = [`${i + 1}. ID: ${c.id} | "${c.name}" — ${c.address}`];
    if (c.primaryType) lines.push(`   Type: ${c.primaryType}`);
    if (c.rating !== null) lines.push(`   Google: ${c.rating}★ (${c.reviews ?? 0} reviews)`);
    if (c.editorialSummary) lines.push(`   Description: ${c.editorialSummary}`);

    const parking: string[] = [];
    if (c.parkingOptions?.freeParkingLot) parking.push('free parking lot');
    if (c.parkingOptions?.paidParkingLot) parking.push('paid parking lot');
    if (c.parkingOptions?.freeStreetParking) parking.push('free street parking');
    if (parking.length > 0) lines.push(`   Parking: ${parking.join(', ')}`);

    if (c.siteAnalysis) {
      if (c.siteAnalysis.campervanPriority >= 2) lines.push(`   Website mentions campervans/overnight (confidence: ${c.siteAnalysis.campervanPriority}/3)`);
      if (c.siteAnalysis.campervanSnippets && c.siteAnalysis.campervanSnippets.length > 0) {
        lines.push(`   Website quote: "${c.siteAnalysis.campervanSnippets[0]}"`);
      }
    }

    if (c.reviewsText && c.reviewsText.length > 0) {
      // Only include reviews mentioning relevant terms
      const relevant = c.reviewsText.filter(r =>
        /campervan|camper|motorhome|motor home|overnight|park up|van|caravan|sleep/i.test(r),
      );
      if (relevant.length > 0) {
        lines.push(`   Review mentions: "${relevant[0].slice(0, 150)}"`);
      }
    }

    parts.push(lines.join('\n'));
  });

  parts.push('');
  parts.push(
    'Respond with JSON in this exact format (no other keys):',
    '{"results": [{"id": "...", "score": 75, "reasoning": "One sentence why."}, ...]}',
    'Include one entry per candidate. Scores must be integers 0–100.',
  );

  return parts.join('\n');
}
