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
      <div>
        <h1 className="text-xl font-semibold">Teams</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Each team has a manager agent and member agents.
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">Add team</div>
        <form action={createTeam} className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            name="name"
            placeholder="Team name (e.g., Research)"
            className="w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
            required
          />
          <input
            name="description"
            placeholder="Description (optional)"
            className="w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
          />
          <button className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white">
            Create
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {teams.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
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
                  className="rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
                  defaultValue={t.managerAgentId || ""}
                >
                  <option value="">No manager</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <button className="rounded border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
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
                  <span
                    key={a.id}
                    className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  >
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
          <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-800">
            No teams yet.
          </div>
        ) : null}
      </section>
    </div>
  );
}
