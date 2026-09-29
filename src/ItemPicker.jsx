import React, { useState, useMemo } from 'react';
import itemsData from './data/items.json';
import npcPrices from './data/npcPrices.json';
import { useTranslation } from './i18n/LanguageContext';
import { useTibiaAssets } from './tibia/TibiaAssetsContext';
import { TibiaItemSprite, AssetsMissingNotice } from './TibiaOutfitCanvas';

const ItemPicker = ({ onAdd, label }) => {
  const { t } = useTranslation();
  const { status, selectFolder } = useTibiaAssets();
  const buttonLabel = label || t('shop.addToShop');

  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [count, setCount] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notice, setNotice] = useState(null);

  const suggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const term = search.toLowerCase();
    return itemsData
      .filter((it) => it.name.toLowerCase().includes(term) || String(it.id).includes(term))
      .slice(0, 12);
  }, [search]);

  const getOfficialPrice = (item) => (item ? npcPrices[String(item.id)] || null : null);
  const officialPrice = getOfficialPrice(selectedItem);

  const selectItem = (item) => {
    setSelectedItem(item);
    setSearch(`${item.name} (#${item.id})`);
    setShowSuggestions(false);
    setNotice(null);

    const official = getOfficialPrice(item);
    if (official) {
      if (!buyPrice && official[0] > 0) setBuyPrice(String(official[0]));
      if (!sellPrice && official[1] > 0) setSellPrice(String(official[1]));
    }
  };

  const handleAdd = () => {
    if (!selectedItem) {
      setNotice({ type: 'error', text: '⚠️ ' + t('shop.selectValidItem') });
      return;
    }
    if (!buyPrice && !sellPrice) {
      setNotice({ type: 'error', text: '⚠️ ' + t('shop.enterPrice') });
      return;
    }
    onAdd({
      id: selectedItem.id,
      name: selectedItem.name,
      buy: buyPrice ? parseInt(buyPrice) : '',
      sell: sellPrice ? parseInt(sellPrice) : '',
      count: count || 1
    });
    setSelectedItem(null);
    setSearch('');
    setBuyPrice('');
    setSellPrice('');
    setCount(1);
    setNotice({ type: 'success', text: '✅ ' + t('shop.itemAdded') });
    setTimeout(() => setNotice(null), 1800);
  };

  return (
    <div className="item-picker">
      <div className="item-picker-search">
        <input
          type="text"
          className="form-input"
          placeholder={`🔍 ${t('shop.searchPlaceholder')}`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedItem(null);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {suggestions.map((it) => (
              <div
                key={it.id}
                className="suggestion-row"
                onClick={() => selectItem(it)}
              >
                <TibiaItemSprite objectId={it.id} size={24} className="shop-item-thumb" />
                <span>{it.name}</span>
                <span className="suggestion-id">#{it.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="item-picker-selected">
          <TibiaItemSprite objectId={selectedItem.id} size={48} className="shop-item-thumb-lg" />
          <div className="item-picker-selected-info">
            <strong>{selectedItem.name}</strong>
            <small>#{selectedItem.id}</small>
          </div>
        </div>
      )}

      {!status.loaded && <AssetsMissingNotice compact onSelectFolder={selectFolder} />}

      <div className="item-picker-fields">
        <div className="form-group">
          <label>{t('shop.buyPrice')}</label>
          <input
            type="number"
            className="form-input"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="e.g: 100"
          />
        </div>
        <div className="form-group">
          <label>{t('shop.sellPrice')}</label>
          <input
            type="number"
            className="form-input"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            placeholder="e.g: 50"
          />
        </div>
        <div className="form-group">
          <label>{t('shop.count')}</label>
          <input
            type="number"
            className="form-input"
            value={count}
            min="1"
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
          />
        </div>
        <button className="btn btn-gold-sm" onClick={handleAdd}>➕ {buttonLabel}</button>
      </div>
      {officialPrice && (
        <div className="inline-notice info">
          💰 {t('shop.officialNpcPrice')}
          {officialPrice[0] > 0 ? ` · ${t('shop.buy')}: ${officialPrice[0]} gp` : ''}
          {officialPrice[1] > 0 ? ` · ${t('shop.sell')}: ${officialPrice[1]} gp` : ''}
          {officialPrice[2] ? ` — ${officialPrice[2]}${officialPrice[3] ? ` (${officialPrice[3]})` : ''}` : ''}
        </div>
      )}
      {notice && <div className={`inline-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );
};

export default ItemPicker;
