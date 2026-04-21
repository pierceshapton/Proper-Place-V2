export interface DiscoveryFeedbackItem {
  id: string;
  aiScore: number;
  userScore: number;
  name: string;
  address: string;
  createdAt: string;
}

export interface DiscoveryLearningMetrics {
  samples: number;
  averageAbsoluteError: number;
  accuracy: number;
  agreementRate: number;
  scoreBias: number;
}

export function computeLearningMetrics(feedback: DiscoveryFeedbackItem[]): DiscoveryLearningMetrics {
  if (feedback.length === 0) {
    return {
      samples: 0,
      averageAbsoluteError: 100,
      accuracy: 0,
      agreementRate: 0,
      scoreBias: 0,
    };
  }

  const absErrors = feedback.map(item => Math.abs(item.userScore - item.aiScore));
  const averageAbsoluteError = avg(absErrors);
  const accuracy = clamp(Math.round(100 - averageAbsoluteError), 0, 100);
  const agreementCount = feedback.filter(item => Math.abs(item.userScore - item.aiScore) <= 10).length;
  const agreementRate = clamp(Math.round((agreementCount / feedback.length) * 100), 0, 100);

  const scoreBias = clamp(avg(feedback.map(item => item.userScore - item.aiScore)), -25, 25);

  return {
    samples: feedback.length,
    averageAbsoluteError: round1(averageAbsoluteError),
    accuracy,
    agreementRate,
    scoreBias: round1(scoreBias),
  };
}

export function applyScoreCalibration(rawScore: number, scoreBias: number, sampleCount: number): number {
  const confidence = clamp(sampleCount / 30, 0, 1);
  const adjusted = rawScore + scoreBias * confidence;
  return clamp(Math.round(adjusted), 0, 100);
}

function avg(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
