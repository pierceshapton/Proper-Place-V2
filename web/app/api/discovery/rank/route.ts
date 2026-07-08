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
  criteria?: string;
  profile?: {
    topTypes?: string[];
  };
}

interface CriteriaCheck {
  label: string;
  met: boolean;
  detail: string;
}

interface RankResult {
  id: string;
  score: number;
  reasoning: string;
  criteriaChecks?: CriteriaCheck[];
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

  const { candidates, feedback, criteria, profile } = body;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ error: 'No candidates provided' }, { status: 400 });
  }

  const prompt = buildPrompt(candidates, feedback || [], profile, criteria);

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.1,
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
  criteria?: string,
): string {
  const parts: string[] = [];

  parts.push(
    'Score each candidate venue 0-100 for how good a fit they are for Proper Place campervan overnight parking partnerships.',
    'Proper Place partners with pubs, inns, hotels, country pubs, gastropubs, farms, vineyards and similar hospitality venues that have OUTDOOR SPACE and CAR PARKS where campervans can stay overnight.',
    '',
    'SCORING BANDS - apply these strictly:',
    '80-100: Clear match - rural/country pub, inn, or hotel with a car park; mentions camping, campervans, or overnight stays; good reviews; away from town centres.',
    '50-79: Possible match - hospitality venue with parking but no specific campervan signal; decent reviews; room to negotiate.',
    '20-49: Weak match - venue type could work but urban, no parking signals, or heavily chain-branded.',
    '0-19: Not suitable - fast food, retail, supermarkets, petrol stations, gyms, offices, schools, chains (e.g. McDonald\'s, Tesco, Costa, Greggs), urban venues with no outdoor space.',
    '',
    'BE STRICT. Most results from a broad Google search will score 20-50. Only score 80+ if there is real evidence of rural location + parking + hospitality.',
    'Do NOT give a venue 60+ just because it is a pub. It must have evidence of parking space suitable for campervans.',
    '',
  );

  if (profile?.topTypes && profile.topTypes.length > 0) {
    parts.push(`Preferred venue types based on existing partnerships: ${profile.topTypes.join(', ')}.`, '');
  }

  if (feedback.length > 0) {
    const highRated = feedback.filter(f => f.stars >= 4);
    const lowRated = feedback.filter(f => f.stars <= 2);

    parts.push('== MY PAST RATINGS - THIS IS THE MOST IMPORTANT SIGNAL ==');
    parts.push('Use these as your primary training data. Venues similar to the 4-5★ ones should score higher. Venues similar to the 1-2★ ones should score lower.');
    parts.push('');

    if (highRated.length > 0) {
      parts.push('✅ GOOD FITS (4-5 stars) - find more like these:');
      highRated.forEach(f => {
        const line = `  - "${f.name}", ${f.address} → ${f.stars}/5★${f.note ? ` | Note: "${f.note}"` : ''}`;
        parts.push(line);
      });
      parts.push('');
    }

    if (lowRated.length > 0) {
      parts.push('❌ POOR FITS (1-2 stars) - avoid venues like these:');
      lowRated.forEach(f => {
        const line = `  - "${f.name}", ${f.address} → ${f.stars}/5★${f.note ? ` | Reason: "${f.note}"` : ''}`;
        parts.push(line);
      });
      parts.push('');
    }

    const midRated = feedback.filter(f => f.stars === 3);
    if (midRated.length > 0) {
      parts.push('⚠️ BORDERLINE (3 stars):');
      midRated.forEach(f => {
        const line = `  - "${f.name}", ${f.address}${f.note ? ` | Note: "${f.note}"` : ''}`;
        parts.push(line);
      });
      parts.push('');
    }
  }

  if (criteria?.trim()) {
    parts.push('== SEARCH CRITERIA ==');
    parts.push(criteria.trim());
    parts.push('For EACH candidate, evaluate every distinct requirement stated in the criteria above.');
    parts.push('Return a criteriaChecks array with one entry per requirement: label (short name), met (true/false), detail (short explanation or value found).');
    parts.push('');
  }

  parts.push('== CANDIDATES TO SCORE ==');
  candidates.forEach((c, i) => {
    const lines: string[] = [`${i + 1}. ID: ${c.id} | "${c.name}" - ${c.address}`];
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
      // Only include reviews that explicitly mention campervan/overnight - whole-word match, no loose "van"
      const relevant = c.reviewsText.filter(r =>
        /\b(campervan|camper\s*van|motorhome|motor\s*home|overnight\s*stay|overnight\s*park|park\s*up)\b/i.test(r),
      );
      if (relevant.length > 0) {
        lines.push(`   Review mentions: "${relevant[0].slice(0, 120)}"`);
      }
    }

    parts.push(lines.join('\n'));
  });

  parts.push('');
  parts.push(
    'Respond with JSON in this exact format (no other keys):',
    '{"results": [{"id": "...", "score": 75, "reasoning": "One sentence why.", "criteriaChecks": [{"label": "Parking", "met": true, "detail": "free lot"}, {"label": "Rural location", "met": false, "detail": "town centre"}]}, ...]}',
    'Include one entry per candidate. Scores must be integers 0-100.',
    'If no criteria were provided, return criteriaChecks as an empty array [].',
  );

  return parts.join('\n');
}
