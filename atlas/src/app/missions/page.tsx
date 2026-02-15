import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

async function createMission(formData: FormData) {
  "use server";
  const title = String(formData.get("title") || "").trim();
  const teamId = String(formData.get("teamId") || "").trim() || null;
  const priority = Number(formData.get("priority") || 3) || 3;
  if (!title) return;

  await prisma.mission.create({
    data: {
      title,
      teamId,
      priority,
    },
  });

  revalidatePath("/missions");
}

const statusLabel: Record<string, string> = {
  NEW: "New",
  ACTIVE: "Active",
  BLOCKED: "Blocked",
  REVIEW: "Review",
  DONE: "Done",
  CANCELED: "Canceled",
};

export default async function MissionsPage() {
  const [missions, teams] = await Promise.all([
    prisma.mission.findMany({
      orderBy: [{ status: "asc" }, { priority: "asc" }, { updatedAt: "desc" }],
      include: { team: true },
      take: 200,
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Missions</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create missions, then drill in for tasks, runs, logs, and artifacts.
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">New mission</div>
        <form action={createMission} className="mt-3 grid gap-3 md:grid-cols-5">
          <input
            name="title"
            placeholder="Title"
            className="md:col-span-2 w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
            required
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
          <select
            name="priority"
            className="w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
            defaultValue={3}
          >
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>
                Priority {p}
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
          Pipeline ({missions.length})
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {missions.map((m) => (
            <div key={m.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/missions/${m.id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {m.title}
                  </Link>
                  <div className="mt-1 text-xs text-zinc-500">
                    {statusLabel[m.status]} · Priority {m.priority}
                    {m.team?.name ? ` · ${m.team.name}` : ""}
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  Updated {m.updatedAt.toISOString()}
                </div>
              </div>
            </div>
          ))}
          {missions.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">
              No missions yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
