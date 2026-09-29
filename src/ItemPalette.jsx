import React, { useState, useMemo, useEffect } from 'react';
import itemsData from './data/items.json';
import npcPrices from './data/npcPrices.json';
import { useTranslation } from './i18n/LanguageContext';
import { useTibiaAssets } from './tibia/TibiaAssetsContext';
import { TibiaItemSprite, AssetsMissingNotice } from './TibiaOutfitCanvas';





const TILE_PAGE = 120;










const CATEGORIES = [
  { key: 'all' },
  { key: 'weapons', match: (n) => /sword|axe|bow|crossbow|spear|mace|hammer|dagger|katana|staff|wand|knife|cleaver|rod|sling|bolt|arrow|ammo/i.test(n) },
  { key: 'armor', match: (n) => /armor|armour|helmet|shield|legs|boots|gloves|ring|amulet|plate|robe|garb|coat|cloak/i.test(n) },
  { key: 'deposits', match: (n) => /chest|box|locker|cabinet|safe|crate|inlay|backpack|depot|container/i.test(n) },
  { key: 'tools', match: (n) => /pickaxe|pick|hammer|shovel|tool|rope|ladder|bucket|bottle|bag|torch|candle|fish/i.test(n) },
  { key: 'coins', match: (n) => /coin|gold|gem|diamond|ruby|emerald|sapphire|crystal|token|medal/i.test(n) },
  { key: 'runes', match: (n) => /rune|imbuement|charm|orb|heart|figure|doll/i.test(n) },
  { key: 'quest', match: (n) => /quest|key|ticket|scroll|parchment|seal|label|letter|map|note|pass/i.test(n) },
  { key: 'misc' },
];

const ItemPalette = ({ shopItems, onAdd, onRemove }) => {
  const { t } = useTranslation();
  const { status, selectFolder } = useTibiaAssets();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(TILE_PAGE);
  const [notice, setNotice] = useState(null);
  const [noticeTimer, setNoticeTimer] = useState(null);

  
  
  const shopCounts = useMemo(() => {
    const map = new Map();
    (shopItems || []).forEach((it) => map.set(it.id, (map.get(it.id) || 0) + 1));
    return map;
  }, [shopItems]);

  
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matchesTerm = (it) =>
      !term || it.name.toLowerCase().includes(term) || String(it.id).includes(term);

    if (category === 'misc') {
      const others = CATEGORIES.filter((c) => c.key !== 'all' && c.key !== 'misc');
      return itemsData.filter((it) => !others.some((c) => c.match(it.name)) && matchesTerm(it));
    }

    const cat = CATEGORIES.find((c) => c.key === category);
    const list = category === 'all' || !cat ? itemsData : itemsData.filter((it) => cat.match(it.name));
    return list.filter(matchesTerm);
  }, [search, category]);

  const shown = useMemo(() => visible.slice(0, visibleCount), [visible, visibleCount]);
  const remaining = Math.max(0, visible.length - shown.length);

  
  
  useEffect(() => {
    setVisibleCount(TILE_PAGE);
  }, [search, category]);

  
  
  useEffect(() => {
    const term = search.trim();
    if (!/^\d+$/.test(term)) return;
    const match = itemsData.find((it) => it.id === Number(term));
    if (match) setSelectedId(match.id);
  }, [search]);

  const selected = useMemo(
    () => (selectedId ? itemsData.find((it) => it.id === selectedId) || null : null),
    [selectedId]
  );

  const showNotice = (type, text) => {
    setNotice({ type, text });
    if (noticeTimer) window.clearTimeout(noticeTimer);
    setNoticeTimer(window.setTimeout(() => setNotice(null), 1800));
  };

  const handleAdd = () => {
    if (!selected) return;
    if (shopCounts.has(selected.id)) {
      showNotice('error', t('shopPalette.alreadyInShop'));
      return;
    }
    
    
    const official = npcPrices[String(selected.id)] || null;
    onAdd({
      id: selected.id,
      name: selected.name,
      buy: official && official[0] > 0 ? official[0] : '',
      sell: official && official[1] > 0 ? official[1] : '',
      count: 1,
    });
    showNotice('success', t('shopPalette.added'));
  };

  const handleRemove = () => {
    if (!selected) return;
    if (!shopCounts.get(selected.id)) return;
    onRemove(selected.id);
    showNotice('success', t('shopPalette.removed'));
  };

  const inShop = selected ? shopCounts.get(selected.id) || 0 : 0;
  const official = selected ? npcPrices[String(selected.id)] || null : null;

  return (
    <div className="item-palette">
      <div className="item-palette-head">
        <input
          type="text"
          className="form-input item-palette-search"
          placeholder={`🔍 ${t('shopPalette.searchPlaceholder')}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="item-palette-count">
          {shown.length} / {visible.length}
        </span>
      </div>

      <div className="item-palette-cats">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`item-palette-cat ${category === c.key ? 'active' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {t(`shopPalette.categories.${c.key}`)}
          </button>
        ))}
      </div>

      {selected && (
        <div className="item-palette-selected">
          <TibiaItemSprite objectId={selected.id} size={48} className="shop-item-thumb-lg" />
          <div className="item-palette-selected-info">
            <strong>{selected.name}</strong>
            <small>#{selected.id}</small>
            {official && (
              <small className="item-palette-official">
                {official[0] > 0 ? `${t('shop.buy')}: ${official[0]} gp` : ''}
                {official[0] > 0 && official[1] > 0 ? ' · ' : ''}
                {official[1] > 0 ? `${t('shop.sell')}: ${official[1]} gp` : ''}
              </small>
            )}
          </div>
          <div className="item-palette-actions">
            <button
              className="btn btn-gold-sm"
              onClick={handleAdd}
              disabled={inShop > 0}
              title={inShop > 0 ? t('shopPalette.alreadyInShop') : t('shopPalette.add')}
            >
              ➕ {t('shopPalette.add')}
            </button>
            <button
              className="btn btn-danger-sm"
              onClick={handleRemove}
              disabled={inShop === 0}
              title={inShop === 0 ? t('shopPalette.notInShop') : t('shopPalette.remove')}
            >
              🗑️ {t('shopPalette.remove')}
            </button>
          </div>
        </div>
      )}

      {notice && <div className={`inline-notice ${notice.type}`}>{notice.text}</div>}

      <div
        className="item-palette-grid"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80 && remaining > 0) {
            setVisibleCount((n) => n + TILE_PAGE);
          }
        }}
      >
        {visible.length === 0 ? (
          <div className="empty-state-sm">{t('shopPalette.noResults')}</div>
        ) : (
          shown.map((item) => {
            const count = shopCounts.get(item.id) || 0;
            return (
              <button
                key={item.id}
                className={`item-palette-tile ${selectedId === item.id ? 'selected' : ''} ${count > 0 ? 'in-shop' : ''}`}
                onClick={() => setSelectedId(item.id)}
                title={`${item.name} #${item.id}`}
              >
                <span className="item-palette-sprite">
                  <TibiaItemSprite objectId={item.id} size={32} />
                </span>
                <span className="item-palette-name">{item.name}</span>
                <span className="item-palette-id">#{item.id}</span>
                {count > 0 && <span className="item-palette-badge">{count}</span>}
              </button>
            );
          })
        )}
      </div>

      {remaining > 0 && (
        <div className="item-palette-more-hint">
          {t('shopPalette.moreHint', { count: remaining })}
        </div>
      )}
    </div>
  );
};

export default ItemPalette;