import { requirePermission } from "@/lib/auth-helpers";
import { getProjectManagerData, getProjectNormReport } from "@/lib/queries/projects";
import { ProjectManager } from "@/components/project-manager";
import { ProjectNormReport } from "@/components/project-norm-report";

export default async function CongTrinhPage() {
  await requirePermission("project.view");
  const [data, reportRows] = await Promise.all([
    getProjectManagerData(),
    getProjectNormReport(),
  ]);

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Công trình và định mức</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý công trình, hạng mục và định mức vật tư theo từng hạng mục.
        </p>
      </div>

      <ProjectManager data={data} />
      <ProjectNormReport rows={reportRows} />
    </div>
  );
}
