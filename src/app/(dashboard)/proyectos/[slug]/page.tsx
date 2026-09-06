import { ProjectDetailView } from "@/components/projects/ProjectDetailView";

interface ProjectDetailPageProps {
  params: { slug: string };
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  return <ProjectDetailView slug={params.slug} />;
}
