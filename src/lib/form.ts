// Forma unei echipe: rezultatele ultimelor meciuri terminate, de la cel mai vechi la cel mai recent.

export type FormResult = "V" | "E" | "Î";

type FormMatch = {
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  kickoff_at: string | null;
};

export function teamForm(matches: FormMatch[], teamId: string, count = 5): FormResult[] {
  return matches
    .filter((m) => m.home_team_id === teamId || m.away_team_id === teamId)
    .sort((a, b) => (a.kickoff_at ?? "").localeCompare(b.kickoff_at ?? ""))
    .slice(-count)
    .map((m) => {
      const home = m.home_team_id === teamId;
      const diff = home ? m.home_score - m.away_score : m.away_score - m.home_score;
      return diff > 0 ? "V" : diff === 0 ? "E" : "Î";
    });
}
