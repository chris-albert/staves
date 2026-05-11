import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { LandingPage } from '@/components/landing/LandingPage';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPageRoute,
});

function LandingPageRoute() {
  return <LandingPage />;
}
