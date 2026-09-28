import { Card } from "@/components/ui/card";
import { useStudio } from "@/lib/store";

export function WorldStep() {
  const project = useStudio((s) => s.project)!;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.18em] text-muted uppercase">World bible</p>
        <h1 className="mt-1 font-display text-3xl">Places, objects, time</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Recurring rooms and props stay visually consistent because they are named here, not reinvented per prompt.
        </p>
      </div>
      <h2 className="font-display text-xl">Locations</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {project.locations.map((l) => (
          <Card key={l.id}>
            <h3 className="font-display text-lg">{l.name}</h3>
            <dl className="mt-3 space-y-1 text-sm text-muted">
              <div>Architecture: {l.architecture}</div>
              <div>Environment: {l.environment}</div>
              <div>Interior: {l.interior}</div>
              <div>Weather / season: {l.timeSeasonWeather}</div>
            </dl>
          </Card>
        ))}
        {project.locations.length === 0 ? <p className="text-muted">No locations extracted yet.</p> : null}
      </div>
      <h2 className="font-display text-xl">Objects</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {project.objects.map((o) => (
          <Card key={o.id}>
            <h3 className="font-display text-lg">{o.name}</h3>
            <p className="mt-2 text-sm text-muted">{o.description}</p>
          </Card>
        ))}
        {project.objects.length === 0 ? <p className="text-muted">No objects extracted yet.</p> : null}
      </div>
      <h2 className="font-display text-xl">Timeline</h2>
      <ol className="space-y-2">
        {project.timeline.map((t) => (
          <li key={t.id} className="rounded-lg bg-surface px-4 py-3 text-sm shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_10%,transparent)]">
            <span className="text-muted">
              {t.sequence}. {t.chapter} · {t.scene}
            </span>
            <p>{t.summary}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
