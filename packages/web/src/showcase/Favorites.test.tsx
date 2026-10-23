import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FavoritesProvider, FavoritePanel } from './Favorites';

const favorite = {
  id: '50000000-0000-4000-8000-000000000005',
  targetType: 'PRODUCT' as const,
  targetId: '40000000-0000-4000-8000-000000000004',
  createdAt: '2026-10-06T01:02:03.000Z',
  objectTypeName: '产品',
  objectValue: '当前产品名称',
  available: true,
  routePath: '/showcase/products/40000000-0000-4000-8000-000000000004',
};

describe('我的收藏面板', () => {
  it('显示收藏并在确认后取消收藏', async () => {
    const api = {
      favorites: vi.fn().mockResolvedValue([favorite]),
      addFavorite: vi.fn().mockResolvedValue(undefined),
      removeFavorite: vi.fn().mockResolvedValue(undefined),
    };
    render(<FavoritesProvider systemCode="demo-portal" api={api}><FavoritePanel onNavigate={vi.fn()} onClose={vi.fn()} /></FavoritesProvider>);

    expect(await screen.findByRole('link', { name: '当前产品名称' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '取消收藏 产品 当前产品名称' }));
    expect(screen.getByRole('dialog', { name: '确认取消收藏' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '确认取消收藏' }));

    await waitFor(() => expect(api.removeFavorite).toHaveBeenCalledWith('demo-portal', favorite.id));
    await waitFor(() => expect(screen.queryByRole('link', { name: '当前产品名称' })).toBeNull());
  });
});
