import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { projectRepository, type Project } from '@staves/storage';
import { ProjectCard } from './ProjectCard';
import { NewProjectDialog } from './NewProjectDialog';

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();

  const loadProjects = useCallback(async () => {
    const list = await projectRepository.listProjects();
    setProjects(list);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = useCallback(
    async (name: string, bpm: number) => {
      const project = await projectRepository.createProject(name, bpm);
      navigate({ to: '/project/$projectId', params: { projectId: project.id } });
    },
    [navigate],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await projectRepository.deleteProject(id);
      loadProjects();
    },
    [loadProjects],
  );

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-16">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Staves</h1>
            <p className="mt-1 text-sm text-zinc-500">Browser-based recording studio</p>
          </div>
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-1.5 rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 1v10M1 6h10" />
            </svg>
            New Project
          </button>
        </div>

        {/* Project grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20">
            <p className="text-sm text-zinc-500">No projects yet</p>
            <button
              onClick={() => setShowDialog(true)}
              className="mt-3 text-sm text-zinc-400 underline underline-offset-2 hover:text-zinc-200 transition-colors"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => navigate({ to: '/project/$projectId', params: { projectId: p.id } })}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      <NewProjectDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
