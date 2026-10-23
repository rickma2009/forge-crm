import { lazy, Suspense } from 'react';
import type { BusinessDataGrid as GridComponent, GridProps } from './BusinessDataGrid';
export type { GridColumn } from './BusinessDataGrid';
const Grid = lazy(async () => { const module = await import('./BusinessDataGrid'); return { default: module.BusinessDataGrid }; }) as typeof GridComponent;
/** Keep the grid engine out of unrelated page bundles. */
export function BusinessDataGrid<T>(props: GridProps<T>) {
  return <Suspense fallback={<p role="status">正在加载网格…</p>}><Grid<T> {...props} /></Suspense>;
}
