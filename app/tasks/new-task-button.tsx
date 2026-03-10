"use client";

import { TaskCreateModal } from "@/app/components/task-create-modal";
import { useRouter } from "next/navigation";

interface NewTaskButtonProps {
  companies?: { id: string; name: string }[];
}

export function NewTaskButton({ companies = [] }: NewTaskButtonProps) {
  const router = useRouter();

  return (
    <TaskCreateModal
      companies={companies}
      onTaskCreated={() => {
        // Refresh the page to show new task
        router.refresh();
      }}
    />
  );
}
