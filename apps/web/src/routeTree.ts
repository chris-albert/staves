import { rootRoute } from './routes/__root';
import { indexRoute } from './routes/index';
import { projectRoute } from './routes/project.$projectId';

export const routeTree = rootRoute.addChildren([indexRoute, projectRoute]);
