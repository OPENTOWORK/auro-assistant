import { TaskDetailView } from "@/components/tasks/TaskDetailView";

interface TaskDetailPageProps {
  params: { id: string };
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  return <TaskDetailView taskId={params.id} />;
}
