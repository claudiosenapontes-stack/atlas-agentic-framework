import { redirect } from "next/navigation";

/**
 * ATLAS-OPTIMUS-PRIME-OPERATIONS-MERGE-045
 * Redirect /tasks -> /operations/tasks
 * 
 * Tasks is now a sub-surface within Operations.
 * All task management lives under the Operations realm.
 */
export default function TasksRedirect() {
  redirect("/operations/tasks");
}
