import { createRootRoute, Outlet } from '@tanstack/react-router';

export const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <Outlet />
    </div>
  );
}
