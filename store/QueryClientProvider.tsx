import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Create a client with sensible defaults for mobile
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Keep unused data in cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Retry failed requests 2 times
      retry: 2,
      // Don't refetch on window focus (mobile doesn't really have this)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect automatically
      refetchOnReconnect: false,
    },
  },
});

interface QueryClientProviderProps {
  children: ReactNode;
}

export function QueryClientProvider({ children }: QueryClientProviderProps) {
  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
    </TanstackQueryClientProvider>
  );
}

export { queryClient };
