import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

const TEST_QUERY_CLIENT_DEFAULT_OPTIONS = {
  queries: {
    retry: false,
    gcTime: 0,
  },
  mutations: {
    retry: false,
  },
} as const;

interface WrapperProps {
  children?: ReactNode;
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

type RenderWithProvidersResult = ReturnType<typeof render> & {
  queryClient: QueryClient;
};

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: TEST_QUERY_CLIENT_DEFAULT_OPTIONS,
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: WrapperProps): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  return {
    queryClient,
    ...render(ui, {
      wrapper: createWrapper(queryClient),
      ...renderOptions,
    }),
  };
}

export * from "@testing-library/react";
