import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Card } from "@/components/admin/fields";
import { formatKickoff } from "@/lib/datetime";
import { createSessionClient } from "@/lib/supabase/server";
import { createMatch, deleteMatch, updateMatch } from "./actions";
import { MatchFields, statusLabel, type MatchData, type StageOption, type TeamOption } from "./match-fields";

export const metadata: Metadata = { title: "Meciuri și rezultate", robots: { index: false } };

type CompetitionRow = {
  id: string;
  name: string;
  season: { start_date: string | null; is_current: boolean } | null;
  category: { sort_order: number } | null;
};

export default async function MatchesPage({ searchParams }: PageProps<"/admin/meciuri">) {
  const { competitie } = await searchParams;
  const requested = Array.isArray(competitie) ? competitie[0] : competitie;

  const supabase = await createSessionClient();
  const competitions = await supabase
    .from("competitions")
    .select("id, name, season:seasons(start_date, is_current), category:categories(sort_order)")
    .overrideTypes<CompetitionRow[]>();
  if (competitions.error) throw new Error(competitions.error.message);

  const list = (competitions.data ?? []).sort(
    (a, b) =>
      Number(b.season?.is_current ?? false) - Number(a.season?.is_current ?? false) ||
      (b.season?.start_date ?? "").localeCompare(a.season?.start_date ?? "") ||
      (a.category?.sort_order ?? 0) - (b.category?.sort_order ?? 0),
  );
  const selected = list.find((c) => c.id === requested) ?? list[0];

  const header = (
    <div>
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Meciuri și rezultate</h1>
      <p className="mt-1 text-muted">
        Programezi meciurile și introduci scorul final. Marcatorii, assisturile, cartonașele și prezențele se adaugă din pagina fiecărui meci.
      </p>
    </div>
  );

  if (!selected) {
    return (
      <div className="max-w-4xl space-y-8">
        {header}
        <p className="text-sm text-muted">
          Nu există nicio competiție.{" "}
          <Link href="/admin/competitii" className="font-medium text-pitch-700 underline">
            Creeaz-o aici
          </Link>
          .
        </p>
      </div>
    );
  }

  const [stages, teams, matches] = await Promise.all([
    supabase
      .from("stages")
      .select("id, name, type, sort_order, stage_groups(id, name, sort_order)")
      .eq("competition_id", selected.id)
      .overrideTypes<StageOption[]>(),
    supabase.from("teams").select("id, name").eq("competition_id", selected.id).order("name").overrideTypes<TeamOption[]>(),
    supabase
      .from("matches")
      .select(
        "id, stage_id, group_id, round, round_label, home_team_id, away_team_id, kickoff_at, venue, status, home_score, away_score, home_penalties, away_penalties, notes",
      )
      .eq("competition_id", selected.id)
      .order("kickoff_at", { ascending: true, nullsFirst: false })
      .overrideTypes<MatchData[]>(),
  ]);
  const failed = stages.error ?? teams.error ?? matches.error;
  if (failed) throw new Error(failed.message);

  const stageList = (stages.data ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const teamList = teams.data ?? [];
  const teamName = new Map(teamList.map((t) => [t.id, t.name]));
  const matchList = matches.data ?? [];
  const canCreate = stageList.length > 0 && teamList.length >= 2;

  return (
    <div className="max-w-4xl space-y-8">
      {header}

      <nav className="flex flex-wrap gap-2" aria-label="Competiție">
        {list.map((c) => (
          <Link
            key={c.id}
            href={`/admin/meciuri?competitie=${c.id}`}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              c.id === selected.id
                ? "border-pitch-700 bg-pitch-700 text-white"
                : "border-line bg-white hover:bg-canvas"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <Card title="Adaugă meci">
        {canCreate ? (
          <ActionForm key={selected.id} action={createMatch} resetOnSuccess className="space-y-4">
            <MatchFields stages={stageList} teams={teamList} />
            <SubmitButton>Adaugă meciul</SubmitButton>
          </ActionForm>
        ) : (
          <p className="text-sm text-muted">
            Competiția are nevoie de cel puțin o fază și două echipe.{" "}
            <Link href="/admin/competitii" className="font-medium text-pitch-700 underline">
              Faze
            </Link>{" "}
            ·{" "}
            <Link href="/admin/echipe" className="font-medium text-pitch-700 underline">
              Echipe
            </Link>
          </p>
        )}
      </Card>

      <div className="space-y-6">
        {stageList.map((stage) => {
          const stageMatches = matchList.filter((m) => m.stage_id === stage.id);
          if (stageMatches.length === 0) return null;
          return (
            <section key={stage.id} className="space-y-2">
              <h2 className="font-display text-xl font-bold uppercase tracking-wide">{stage.name}</h2>
              {stageMatches.map((match) => (
                <MatchRow key={match.id} match={match} stages={stageList} teams={teamList} teamName={teamName} />
              ))}
            </section>
          );
        })}
        {matchList.length === 0 && <p className="text-sm text-muted">Niciun meci în această competiție încă.</p>}
      </div>
    </div>
  );
}

function MatchRow({
  match,
  stages,
  teams,
  teamName,
}: {
  match: MatchData;
  stages: StageOption[];
  teams: TeamOption[];
  teamName: Map<string, string>;
}) {
  const finished = match.status === "finished";
  const hasScore = finished || match.status === "live";
  const penalties =
    finished && match.home_penalties !== null && match.away_penalties !== null
      ? ` (${match.home_penalties}–${match.away_penalties} d.l.d.)`
      : "";
  const round = match.round_label ?? (match.round ? `Etapa ${match.round}` : null);

  return (
    <details className="rounded-xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
        <span className="min-w-0 flex-1 font-semibold">
          {teamName.get(match.home_team_id)}{" "}
          <span className="mx-1 rounded bg-canvas px-2 py-0.5 text-sm tabular-nums">
            {hasScore ? `${match.home_score} – ${match.away_score}` : "vs"}
          </span>{" "}
          {teamName.get(match.away_team_id)}
          {penalties && <span className="text-sm font-normal text-muted">{penalties}</span>}
        </span>
        <span className="text-sm text-muted">
          {[round, formatKickoff(match.kickoff_at), match.venue].filter(Boolean).join(" · ")}
        </span>
        {match.status === "live" ? (
          <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">● LIVE</span>
        ) : (
          !finished && <span className="rounded bg-gold-100 px-2 py-0.5 text-xs font-medium">{statusLabel[match.status]}</span>
        )}
      </summary>
      <div className="space-y-4 border-t border-line px-4 py-4">
        <ActionForm action={updateMatch} className="space-y-4">
          <input type="hidden" name="id" value={match.id} />
          <MatchFields stages={stages} teams={teams} match={match} />
          <SubmitButton variant="secondary">Salvează</SubmitButton>
        </ActionForm>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <Link
            href={`/admin/meciuri/${match.id}`}
            className="rounded-md bg-pitch-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-pitch-800"
          >
            Marcatori, cartonașe, prezențe →
          </Link>
          <ActionForm action={deleteMatch}>
            <input type="hidden" name="id" value={match.id} />
            <SubmitButton variant="danger" confirm="Ștergi acest meci?">
              Șterge meciul
            </SubmitButton>
          </ActionForm>
        </div>
      </div>
    </details>
  );
}
