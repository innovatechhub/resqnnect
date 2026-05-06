import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from '../features/auth/AuthProvider';
import { appQueryClient } from './queryClient';
import { appRouter } from './router';

export function App() {
  return (
    <QueryClientProvider client={appQueryClient}>
      <AuthProvider>
        <RouterProvider router={appRouter} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
