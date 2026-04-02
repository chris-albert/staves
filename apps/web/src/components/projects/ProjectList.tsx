import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { projectRepository, type Project } from '@staves/storage';
import { ProjectCard } from './ProjectCard';
import { NewProjectDialog } from './NewProjectDialog';
import { JoinSessionDialog } from './JoinSessionDialog';

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
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
      navigate({ to: '/project/$projectId', params: { projectId: project.id }, search: { roomId: undefined } });
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

  const handleJoinSession = useCallback(
    (roomId: string) => {
      // Use the roomId as the projectId for join-only peers.
      // The project page will create a skeleton project and Yjs will sync the real data.
      const projectId = roomId;
      navigate({
        to: '/project/$projectId',
        params: { projectId },
        search: { roomId },
      });
    },
    [navigate],
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowJoinDialog(true)}
              className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M5 8l2-2M3.5 9.5a2 2 0 010-2.8L5 5.2a2 2 0 012.8 0" />
                <path d="M8.5 2.5a2 2 0 010 2.8L7 6.8a2 2 0 01-2.8 0" />
              </svg>
              Join Session
            </button>
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
                onClick={() => navigate({ to: '/project/$projectId', params: { projectId: p.id }, search: { roomId: undefined } })}
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

      <JoinSessionDialog
        open={showJoinDialog}
        onClose={() => setShowJoinDialog(false)}
        onJoin={handleJoinSession}
      />
    </div>
  );
}
