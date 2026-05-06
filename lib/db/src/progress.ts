export function calculateProgressScore({
  speakingScore,
  confidenceScore,
  participationScore,
}: {
  speakingScore: number;
  confidenceScore: number;
  participationScore: number;
}): number {
  const total = speakingScore + confidenceScore + participationScore;
  return Math.round((total / 30) * 100 * 10) / 10;
}
