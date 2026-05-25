import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";

import { PosPage } from "@/modules/pos/pages/PosPage";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const posRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: PosPage,
});

const routeTree = rootRoute.addChildren([posRoute]);

export const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ["/"] }),
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
