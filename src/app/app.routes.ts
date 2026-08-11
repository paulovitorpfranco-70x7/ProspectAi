import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./presentation/features/search/search.routes').then((m) => m.SEARCH_ROUTES),
  },
  {
    path: 'fila',
    loadChildren: () =>
      import('./presentation/features/fila/fila.routes').then((m) => m.FILA_ROUTES),
  },
  {
    path: 'pipeline',
    loadChildren: () =>
      import('./presentation/features/pipeline/pipeline.routes').then((m) => m.PIPELINE_ROUTES),
  },
  {
    path: 'add',
    loadChildren: () =>
      import('./presentation/features/add-lead/add-lead.routes').then((m) => m.ADD_LEAD_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
