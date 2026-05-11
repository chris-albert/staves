import { rootRoute } from './routes/__root';
import { indexRoute } from './routes/index';
import { projectsRoute } from './routes/projects';
import { projectRoute } from './routes/project.$projectId';

export const routeTree = rootRoute.addChildren([indexRoute, projectsRoute, projectRoute]);
