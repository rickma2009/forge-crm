import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import { favoriteTargetTypeSchema, type Favorite, type FavoriteTargetType } from '@forge-crm/contracts';
import type { NavigationGateway } from './gateway';
import './favorites.css';

export type FavoriteApi = Pick<NavigationGateway, 'favorites' | 'addFavorite' | 'removeFavorite'>;
type FavoriteContextValue = { items: Favorite[]; loading: boolean; error: string; isFavorite: (type: FavoriteTargetType, targetId: string) => boolean; toggle: (type: FavoriteTargetType, targetId: string) => Promise<void>; remove: (item: Favorite) => Promise<void>; reload: () => Promise<void> };
const emptyContext: FavoriteContextValue = { items: [], loading: false, error: '', isFavorite: () => false, toggle: async () => undefined, remove: async () => undefined, reload: async () => undefined };
const FavoriteContext = createContext<FavoriteContextValue>(emptyContext);

export function FavoritesProvider({ systemCode, api, children }: { systemCode: string; api?: FavoriteApi; children: ReactNode }) {
  const [items, setItems] = useState<Favorite[]>([]), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const reload = async () => {
    if (!api?.favorites) { setItems([]); return; }
    setLoading(true); setError('');
    try { setItems(await api.favorites(systemCode)); } catch (reason) { setError(reason instanceof Error ? reason.message : '加载收藏失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, [systemCode, api]);
  const value = useMemo<FavoriteContextValue>(() => ({
    items, loading, error,
    isFavorite: (type, targetId) => items.some((item) => item.targetType === type && item.targetId === targetId),
    toggle: async (type, targetId) => {
      if (!api?.addFavorite || !api.removeFavorite) return;
      const existing = items.find((item) => item.targetType === type && item.targetId === targetId);
      setError('');
      try {
        if (existing) { await api.removeFavorite(systemCode, existing.id); setItems((current) => current.filter((item) => item.id !== existing.id)); }
        else { await api.addFavorite(systemCode, { targetType: favoriteTargetTypeSchema.parse(type), targetId }); await reload(); }
      } catch (reason) { setError(reason instanceof Error ? reason.message : '收藏操作失败'); throw reason; }
    },
    remove: async (item) => {
      if (!api?.removeFavorite) return;
      setError('');
      try { await api.removeFavorite(systemCode, item.id); setItems((current) => current.filter((row) => row.id !== item.id)); }
      catch (reason) { setError(reason instanceof Error ? reason.message : '取消收藏失败'); throw reason; }
    },
    reload,
  }), [items, loading, error, api, systemCode]);
  return <FavoriteContext.Provider value={value}>{children}</FavoriteContext.Provider>;
}

export function useFavorites() { return useContext(FavoriteContext); }

export function FavoriteToggle({ targetType, targetId, label }: { targetType: FavoriteTargetType; targetId: string; label: string }) {
  const { isFavorite, toggle } = useFavorites();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const selected = isFavorite(targetType, targetId), actionLabel = selected ? '取消收藏' : '收藏';
  return <span className="favorite-toggle-wrap"><button type="button" className={`row-action-button favorite-row-action ${selected ? 'is-favorite' : ''}`} aria-label={`${actionLabel}${label ? ` ${label}` : ''}`} title={actionLabel} disabled={busy} onClick={() => { setBusy(true); setError(''); void toggle(targetType, targetId).catch((reason) => setError(reason instanceof Error ? reason.message : '收藏操作失败')).finally(() => setBusy(false)); }}>{selected ? <IconStarFilled size={16} aria-hidden="true" /> : <IconStar size={16} aria-hidden="true" />}</button>{error && <span role="alert" className="favorite-inline-error">{error}</span>}</span>;
}

const displayTime = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });
export function FavoritePanel({ onNavigate, onClose }: { onNavigate: (path: string) => void; onClose: () => void }) {
  const { items, loading, error, remove, reload } = useFavorites();
  const [pending, setPending] = useState<Favorite | null>(null), [busy, setBusy] = useState(false), [actionError, setActionError] = useState('');
  const cancel = async () => {
    if (!pending) return;
    setBusy(true); setActionError('');
    try { await remove(pending); setPending(null); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : '取消收藏失败'); }
    finally { setBusy(false); }
  };
  return <div className="favorite-panel" role="dialog" aria-label="我的收藏">
    <header><div><strong>我的收藏</strong><span>{items.length} 条</span></div><button type="button" aria-label="关闭我的收藏" onClick={onClose}>×</button></header>
    {error && <div className="enterprise-alert" role="alert">{error}<button type="button" onClick={() => void reload()}>重试</button></div>}
    <div className="favorite-table-wrap"><table aria-label="我的收藏列表"><thead><tr><th>序号</th><th>收藏时间</th><th>对象</th><th>对象值</th><th>操作</th></tr></thead><tbody>
      {items.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{displayTime(item.createdAt)}</td><td>{item.objectTypeName}</td><td>{item.available && item.routePath ? <a href={`#${item.routePath}`} className="record-detail-link" onClick={(event) => { event.preventDefault(); onNavigate(item.routePath!); }}>{item.objectValue}</a> : <span>{item.objectValue}</span>}</td><td><button type="button" className="row-action-button is-danger" aria-label={`取消收藏 ${item.objectTypeName} ${item.objectValue}`} title="取消收藏" onClick={() => { setActionError(''); setPending(item); }}><IconStarFilled size={16} aria-hidden="true" /></button></td></tr>)}
      {!items.length && !loading && <tr><td colSpan={5} className="favorite-empty">暂无收藏</td></tr>}
      {loading && <tr><td colSpan={5} className="favorite-empty">正在加载收藏…</td></tr>}
    </tbody></table></div>
    {pending && <div className="enterprise-modal-backdrop favorite-confirm-backdrop"><section className="enterprise-modal favorite-confirm" role="dialog" aria-modal="true" aria-label="确认取消收藏"><header><h2>确认取消收藏</h2></header><div className="modal-body"><p>确定取消收藏“{pending.objectValue}”吗？</p>{actionError && <p role="alert" className="enterprise-alert">{actionError}</p>}</div><footer><button type="button" disabled={busy} onClick={() => setPending(null)}>返回</button><button type="button" className="is-primary" disabled={busy} onClick={() => void cancel()}>{busy ? '处理中…' : '确认取消收藏'}</button></footer></section></div>}
  </div>;
}
