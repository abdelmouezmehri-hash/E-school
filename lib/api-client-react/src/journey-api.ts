import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface JourneyData {
  studentId: number;
  studentName: string;
  levelId: number | null;
  levelName: string | null;
  completedTotal: number;
  completedInLevel: number;
  percentComplete: number;
  currentWeek: number;
  currentSessionInWeek: number;
  SESSIONS_PER_LEVEL: number;
  skillAverages: {
    speaking: number | null;
    confidence: number | null;
    participation: number | null;
    initiative: number | null;
  };
  recentSessions: Array<{
    sessionDate: string;
    speakingScore: number | null;
    confidenceScore: number | null;
    participationScore: number | null;
    initiativeScore: number | null;
  }>;
}

export function useStudentJourney(studentId: number | undefined) {
  return useQuery<JourneyData>({
    queryKey: ["student-journey", studentId],
    queryFn: () => customFetch(`/api/students/${studentId}/journey`),
    enabled: !!studentId,
  });
}
