import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// HashRouter — адреса вида /#/trainer/clients. На GitHub Pages статика
// не умеет SPA-fallback, а хеш-маршрутизация работает без 404 на любых путях.
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { ConfirmProvider } from './components/ConfirmProvider';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>
);
