import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { ProjectList } from '@/components/projects/ProjectList';

export const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  component: ProjectListPage,
});

function ProjectListPage() {
  return <ProjectList />;
}
