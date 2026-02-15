import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

async function createTeam(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  if (!name) return;

  await prisma.team.create({ data: { name, description } });
  revalidatePath("/teams");
  revalidatePath("/agents");
}

async function setManager(formData: FormData) {
  "use server";
  const teamId = String(formData.get("teamId") || "");
  const managerAgentId = String(formData.get("managerAgentId") || "") || null;
  if (!teamId) return;

  await prisma.team.update({
    where: { id: teamId },
    data: { managerAgentId },
  });

  revalidatePath("/teams");
  revalidatePath("/agents");
}

export default async function TeamsPage() {
  const [teams, agents] = await Promise.all([
    prisma.team.findMany({
      orderBy: { name: "asc" },
      include: {
        managerAgent: true,
        agents: { orderBy: { name: "asc" } },
      },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <section className="atlas-hero rounded-2xl px-5 py-6 md:px-7 md:py-8">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] font-semibold tracking-[0.34em] text-zinc-500">
              ATLAS / ORG CHART
            </div>
            <span className="hud-chip hud-chip--ok">SYS OK</span>
            <span className="hud-chip hud-chip--muted">UTC</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            Teams
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Manager agents + members — organized like a mission crew roster.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--atlas-border)] bg-[color:var(--atlas-panel)] p-4 backdrop-blur">
        <div className="text-sm font-semibold">Add team</div>
        <form action={createTeam} className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            name="name"
            placeholder="Team name (e.g., Research)"
            className="w-full rounded-xl border border-[color:var(--atlas-border)] bg-white/60 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            required
          />
          <input
            name="description"
            placeholder="Description (optional)"
            className="w-full rounded-xl border border-[color:var(--atlas-border)] bg-white/60 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          <button className="rounded-xl bg-[color:var(--atlas-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            Create
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {teams.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl border border-[color:var(--atlas-border)] bg-[color:var(--atlas-panel)] p-4 backdrop-blur"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">{t.name}</div>
                {t.description ? (
                  <div className="mt-1 text-sm text-zinc-500">{t.description}</div>
                ) : null}
              </div>

              <form action={setManager} className="flex items-center gap-2">
                <input type="hidden" name="teamId" value={t.id} />
                <select
                  name="managerAgentId"
                  className="rounded-xl border border-[color:var(--atlas-border)] bg-white/60 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  defaultValue={t.managerAgentId || ""}
                >
                  <option value="">No manager</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <button className="rounded-xl border border-[color:var(--atlas-border)] bg-white/40 px-3 py-2 text-sm hover:bg-white/60">
                  Set manager
                </button>
              </form>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Members ({t.agents.length})
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {t.agents.map((a) => (
                  <span key={a.id} className="hud-chip">
                    {a.name}
                  </span>
                ))}
                {t.agents.length === 0 ? (
                  <div className="text-sm text-zinc-500">No members yet.</div>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {teams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--atlas-border)] bg-white/40 p-10 text-center text-sm text-zinc-500">
            No teams yet.
          </div>
        ) : null}
      </section>
    </div>
  );
}
