import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

async function createAgent(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "").trim() || null;
  const teamId = String(formData.get("teamId") || "").trim() || null;
  if (!name) return;

  await prisma.agent.create({
    data: {
      name,
      role,
      teamId,
    },
  });

  revalidatePath("/agents");
}

export default async function AgentsPage() {
  const [agents, teams] = await Promise.all([
    prisma.agent.findMany({
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      include: { team: true, managesTeam: true },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <section className="atlas-hero rounded-2xl px-5 py-6 md:px-7 md:py-8">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] font-semibold tracking-[0.34em] text-zinc-500">
              ATLAS / PERSONNEL
            </div>
            <span className="hud-chip">ROSTER</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            Agents
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Personas live here — with clear roles, teams, and responsibility.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--atlas-border)] bg-[color:var(--atlas-panel)] p-4 backdrop-blur">
        <div className="text-sm font-semibold">Add agent</div>
        <form action={createAgent} className="mt-3 grid gap-3 md:grid-cols-4">
          <input
            name="name"
            placeholder="Name (e.g., Athena)"
            className="w-full rounded-xl border border-[color:var(--atlas-border)] bg-white/60 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            required
          />
          <input
            name="role"
            placeholder="Role (optional)"
            className="w-full rounded-xl border border-[color:var(--atlas-border)] bg-white/60 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          <select
            name="teamId"
            className="w-full rounded-xl border border-[color:var(--atlas-border)] bg-white/60 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            defaultValue=""
          >
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-[color:var(--atlas-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            Create
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[color:var(--atlas-border)] bg-[color:var(--atlas-panel)] backdrop-blur">
        <div className="border-b border-[color:var(--atlas-border)] px-4 py-3 text-sm font-semibold">
          Directory ({agents.length})
        </div>
        <div className="divide-y divide-[color:var(--atlas-border)]">
          {agents.map((a) => (
            <div key={a.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">{a.name}</div>
                    {!a.isActive ? (
                      <span className="hud-chip hud-chip--muted">inactive</span>
                    ) : null}
                    {a.managesTeam ? (
                      <span className="hud-chip hud-chip--ok">manager · {a.managesTeam.name}</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {a.role || "(no role)"} · {a.team?.name || "(no team)"}
                  </div>
                </div>
                <div className="text-xs text-zinc-500">Updated {a.updatedAt.toISOString()}</div>
              </div>
            </div>
          ))}
          {agents.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">
              No agents yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
