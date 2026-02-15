import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MissionStatus, RunStatus } from "@/generated/prisma/client";

async function updateMission(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) return;

  const title = String(formData.get("title") || "").trim();
  const objective = String(formData.get("objective") || "").trim() || null;
  const constraints = String(formData.get("constraints") || "").trim() || null;
  const status = String(formData.get("status") || "NEW") as MissionStatus;
  const priority = Number(formData.get("priority") || 3) || 3;

  await prisma.mission.update({
    where: { id },
    data: { title, objective, constraints, status, priority },
  });

  revalidatePath(`/missions/${id}`);
  revalidatePath("/missions");
}

async function addTask(formData: FormData) {
  "use server";
  const missionId = String(formData.get("missionId") || "");
  const title = String(formData.get("title") || "").trim();
  if (!missionId || !title) return;

  const maxOrder = await prisma.missionTask.aggregate({
    where: { missionId },
    _max: { order: true },
  });

  await prisma.missionTask.create({
    data: {
      missionId,
      title,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });

  revalidatePath(`/missions/${missionId}`);
}

async function toggleTask(formData: FormData) {
  "use server";
  const missionId = String(formData.get("missionId") || "");
  const taskId = String(formData.get("taskId") || "");
  const done = String(formData.get("done") || "") === "true";
  if (!missionId || !taskId) return;

  await prisma.missionTask.update({ where: { id: taskId }, data: { done } });
  revalidatePath(`/missions/${missionId}`);
}

async function addNote(formData: FormData) {
  "use server";
  const missionId = String(formData.get("missionId") || "");
  const author = String(formData.get("author") || "").trim() || null;
  const body = String(formData.get("body") || "").trim();
  if (!missionId || !body) return;

  await prisma.note.create({ data: { missionId, author, body } });
  revalidatePath(`/missions/${missionId}`);
}

async function createRun(formData: FormData) {
  "use server";
  const missionId = String(formData.get("missionId") || "");
  const agentId = String(formData.get("agentId") || "").trim() || null;
  if (!missionId) return;

  // MVP: just creates a run record. We'll later wire this to OpenClaw sessions_spawn.
  await prisma.run.create({
    data: {
      missionId,
      agentId,
      status: RunStatus.QUEUED,
    },
  });

  revalidatePath(`/missions/${missionId}`);
}

const statusLabel: Record<MissionStatus, string> = {
  NEW: "New",
  ACTIVE: "Active",
  BLOCKED: "Blocked",
  REVIEW: "Review",
  DONE: "Done",
  CANCELED: "Canceled",
};

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [mission, agents] = await Promise.all([
    prisma.mission.findUnique({
      where: { id },
      include: {
        team: true,
        ownerAgent: true,
        tasks: { orderBy: { order: "asc" } },
        notes: { orderBy: { createdAt: "desc" } },
        runs: {
          orderBy: { createdAt: "desc" },
          include: { agent: true, logs: { orderBy: { createdAt: "asc" } } },
        },
        artifacts: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!mission) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-zinc-500">
            <Link href="/missions" className="hover:underline">
              Missions
            </Link>
            <span> / </span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {mission.id}
            </span>
          </div>
          <h1 className="mt-1 truncate text-xl font-semibold">{mission.title}</h1>
          <div className="mt-1 text-sm text-zinc-500">
            {statusLabel[mission.status]} · Priority {mission.priority}
            {mission.team?.name ? ` · ${mission.team.name}` : ""}
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">Mission settings</div>
        <form action={updateMission} className="mt-3 grid gap-3">
          <input type="hidden" name="id" value={mission.id} />
          <div className="grid gap-3 md:grid-cols-3">
            <input
              name="title"
              defaultValue={mission.title}
              className="md:col-span-2 w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                name="status"
                defaultValue={mission.status}
                className="w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
              >
                {Object.keys(statusLabel).map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[s as MissionStatus]}
                  </option>
                ))}
              </select>
              <select
                name="priority"
                defaultValue={mission.priority}
                className="w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
              >
                {[1, 2, 3, 4, 5].map((p) => (
                  <option key={p} value={p}>
                    Priority {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            name="objective"
            defaultValue={mission.objective ?? ""}
            placeholder="Objective (what does success look like?)"
            className="min-h-20 w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
          />
          <textarea
            name="constraints"
            defaultValue={mission.constraints ?? ""}
            placeholder="Constraints (boundaries, requirements, links, etc.)"
            className="min-h-20 w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
          />

          <div>
            <button className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white">
              Save
            </button>
          </div>
        </form>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Tasks</div>
            <div className="text-xs text-zinc-500">{mission.tasks.length} total</div>
          </div>

          <form action={addTask} className="mt-3 flex gap-2">
            <input type="hidden" name="missionId" value={mission.id} />
            <input
              name="title"
              placeholder="Add a task"
              className="flex-1 rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
            />
            <button className="rounded border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
              Add
            </button>
          </form>

          <div className="mt-3 space-y-2">
            {mission.tasks.map((t) => (
              <form
                key={t.id}
                action={toggleTask}
                className="flex items-center justify-between gap-3 rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <input type="hidden" name="missionId" value={mission.id} />
                <input type="hidden" name="taskId" value={t.id} />
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-xs text-zinc-500">{t.done ? "✓" : "○"}</span>
                  <span className={t.done ? "line-through text-zinc-400" : ""}>
                    {t.title}
                  </span>
                </div>
                <input type="hidden" name="done" value={String(!t.done)} />
                <button className="rounded border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
                  {t.done ? "Undo" : "Done"}
                </button>
              </form>
            ))}
            {mission.tasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                No tasks yet.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Runs</div>
            <div className="text-xs text-zinc-500">
              {mission.runs.length} recorded
            </div>
          </div>

          <form action={createRun} className="mt-3 flex gap-2">
            <input type="hidden" name="missionId" value={mission.id} />
            <select
              name="agentId"
              className="flex-1 rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
              defaultValue={""}
            >
              <option value="">No agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white">
              Queue run
            </button>
          </form>

          <div className="mt-3 space-y-3">
            {mission.runs.map((r) => (
              <div
                key={r.id}
                className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">
                    {r.agent?.name || "(no agent)"} · {r.status}
                  </div>
                  <div className="text-xs text-zinc-500">{r.createdAt.toISOString()}</div>
                </div>
                {r.sessionKey ? (
                  <div className="mt-1 text-xs text-zinc-500">
                    sessionKey: {r.sessionKey}
                  </div>
                ) : null}
                {r.logs.length ? (
                  <div className="mt-2 max-h-40 overflow-auto rounded bg-zinc-50 p-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                    {r.logs.map((l) => (
                      <div key={l.id}>
                        [{l.level}] {l.message}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-zinc-500">No logs yet.</div>
                )}
              </div>
            ))}
            {mission.runs.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                No runs yet.
              </div>
            ) : null}
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            Wiring runs to OpenClaw execution is next.
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">Notes</div>
        <form action={addNote} className="mt-3 grid gap-3">
          <input type="hidden" name="missionId" value={mission.id} />
          <input
            name="author"
            placeholder="Author (optional)"
            className="w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
          />
          <textarea
            name="body"
            placeholder="Add a note, decision, context, or instruction"
            className="min-h-24 w-full rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
            required
          />
          <div>
            <button className="rounded border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
              Add note
            </button>
          </div>
        </form>

        <div className="mt-4 space-y-3">
          {mission.notes.map((n) => (
            <div
              key={n.id}
              className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{n.author || "(anonymous)"}</div>
                <div className="text-xs text-zinc-500">{n.createdAt.toISOString()}</div>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                {n.body}
              </div>
            </div>
          ))}
          {mission.notes.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              No notes yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
