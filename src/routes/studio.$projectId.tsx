import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { StudioView } from "@/components/studio/studio-view";
import { useStudio } from "@/lib/store";

export const Route = createFileRoute("/studio/$projectId")({
  component: StudioPage,
});

function StudioPage() {
  const { projectId } = Route.useParams();
  const open = useStudio((s) => s.open);
  const project = useStudio((s) => s.project);

  useEffect(() => {
    if (!project || project.id !== projectId) {
      void open(projectId);
    }
  }, [projectId, open, project]);

  return <StudioView />;
}
