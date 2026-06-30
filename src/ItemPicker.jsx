import React, { useState, useMemo } from 'react';
import itemsData from './data/items.json';

const ItemPicker = ({ onAdd, label = 'Agregar item' }) => {
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

  const selectItem = (item) => {
    setSelectedItem(item);
    setSearch(`${item.name} (#${item.id})`);
    setShowSuggestions(false);
    setNotice(null);
  };

  const handleAdd = () => {
    if (!selectedItem) {
      setNotice({ type: 'error', text: '⚠️ Selecciona un item válido de la lista de sugerencias.' });
      return;
    }
    if (!buyPrice && !sellPrice) {
      setNotice({ type: 'error', text: '⚠️ Ingresa al menos un precio de compra o venta.' });
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
    setNotice({ type: 'success', text: '✅ Item agregado.' });
    setTimeout(() => setNotice(null), 1800);
  };

  return (
    <div className="item-picker">
      <div className="item-picker-search">
        <input
          type="text"
          className="form-input"
          placeholder="🔍 Buscar item por nombre o ID..."
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
                <span>{it.name}</span>
                <span className="suggestion-id">#{it.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="item-picker-fields">
        <div className="form-group">
          <label>Buy Price (NPC vende)</label>
          <input
            type="number"
            className="form-input"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="ej: 100"
          />
        </div>
        <div className="form-group">
          <label>Sell Price (NPC compra)</label>
          <input
            type="number"
            className="form-input"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            placeholder="ej: 50"
          />
        </div>
        <div className="form-group">
          <label>Count</label>
          <input
            type="number"
            className="form-input"
            value={count}
            min="1"
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
          />
        </div>
        <button className="btn btn-gold-sm" onClick={handleAdd}>➕ {label}</button>
      </div>
      {notice && <div className={`inline-notice ${notice.type}`}>{notice.text}</div>}
    </div>
  );
};

export default ItemPicker;
