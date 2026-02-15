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
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Agents</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Personas live here. Managers are just agents with responsibility.
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">Add agent</div>
        <form action={createAgent} className="mt-3 grid gap-3 md:grid-cols-4">
          <input
            name="name"
            placeholder="Name (e.g., Athena)"
            className="w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
            required
          />
          <input
            name="role"
            placeholder="Role (optional)"
            className="w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
          />
          <select
            name="teamId"
            className="w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
            defaultValue=""
          >
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white">
            Create
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
          Directory ({agents.length})
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {agents.map((a) => (
            <div key={a.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">{a.name}</div>
                    {!a.isActive ? (
                      <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        inactive
                      </span>
                    ) : null}
                    {a.managesTeam ? (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        manager of {a.managesTeam.name}
                      </span>
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
