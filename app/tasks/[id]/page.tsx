import { redirect } from "next/navigation";

/**
 * ATLAS-OPTIMUS-PRIME-OPERATIONS-MERGE-045
 * Redirect /tasks/[id] -> /operations/tasks/[id]
 */
export default function TaskDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/operations/tasks/${params.id}`);
}
