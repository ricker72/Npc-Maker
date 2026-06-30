import React, { useState, useMemo } from 'react';
import OutfitSelector from './OutfitSelector';
import MonsterLibrary from './MonsterLibrary';
import { generateMonsterLua, getMonsterFileName } from './monsterLuaGenerator';
import {
  DEFAULT_MONSTER,
  BESTIARY_RACES,
  RACE_TYPES,
  COMMON_ATTACK_NAMES,
  CONDITION_TYPES,
  COMMON_SHOOT_EFFECTS
} from './data/monsterConstants';

const SUB_TABS = [
  { key: 'basic', icon: '📋', label: 'Basic Info' },
  { key: 'appearance', icon: '👕', label: 'Appearance' },
  { key: 'combat', icon: '⚔️', label: 'Combat' },
  { key: 'loot', icon: '💰', label: 'Loot' },
  { key: 'bestiary', icon: '📖', label: 'Bestiary' },
  { key: 'voices', icon: '🗣️', label: 'Voices & Summons' },
  { key: 'preview', icon: '👁️', label: 'Preview Lua' },
  { key: 'library', icon: '📚', label: 'Library' }
];

const MonsterEditor = () => {
  const [monster, setMonster] = useState(DEFAULT_MONSTER);
  const [subTab, setSubTab] = useState('basic');

  const update = (patch) => setMonster((prev) => ({ ...prev, ...patch }));
  const updateNested = (key, patch) => setMonster((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const luaCode = useMemo(() => generateMonsterLua(monster), [monster]);

  const exportLua = () => {
    const fileName = getMonsterFileName(monster.name);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(luaCode));
    element.setAttribute('download', fileName);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyLua = () => navigator.clipboard.writeText(luaCode);

  // ───── Loot ─────
  const addLootItem = () => {
    update({ loot: [...monster.loot, { uid: Date.now(), name: '', chance: 1000, maxCount: 1 }] });
  };
  const updateLootItem = (uid, patch) => {
    update({ loot: monster.loot.map((it) => (it.uid === uid ? { ...it, ...patch } : it)) });
  };
  const removeLootItem = (uid) => {
    update({ loot: monster.loot.filter((it) => it.uid !== uid) });
  };

  // ───── Attacks ─────
  const addAttack = () => {
    update({ attacks: [...monster.attacks, { uid: Date.now(), name: 'melee', interval: 2000, chance: 100, minDamage: 0, maxDamage: -10 }] });
  };
  const updateAttack = (uid, patch) => {
    update({ attacks: monster.attacks.map((a) => (a.uid === uid ? { ...a, ...patch } : a)) });
  };
  const removeAttack = (uid) => {
    update({ attacks: monster.attacks.filter((a) => a.uid !== uid) });
  };

  // ───── Elements / Immunities ─────
  const updateElement = (type, percent) => {
    update({ elements: monster.elements.map((e) => (e.type === type ? { ...e, percent } : e)) });
  };
  const toggleImmunity = (type, condition) => {
    update({ immunities: monster.immunities.map((i) => (i.type === type ? { ...i, condition } : i)) });
  };

  // ───── Defense Abilities (auto-buffs como "speed" dentro de defenses) ─────
  const addDefenseAbility = () => {
    update({ defenseAbilities: [...(monster.defenseAbilities || []), { uid: Date.now(), name: 'speed', interval: 2000, chance: 15, speedChange: 200, duration: 5000, effect: '' }] });
  };
  const updateDefenseAbility = (uid, patch) => {
    update({ defenseAbilities: monster.defenseAbilities.map((d) => (d.uid === uid ? { ...d, ...patch } : d)) });
  };
  const removeDefenseAbility = (uid) => {
    update({ defenseAbilities: monster.defenseAbilities.filter((d) => d.uid !== uid) });
  };

  // ───── Voices ─────
  const addVoice = () => {
    updateNested('voices', { list: [...(monster.voices.list || []), { uid: Date.now(), text: '', yell: false }] });
  };
  const updateVoice = (uid, patch) => {
    updateNested('voices', { list: monster.voices.list.map((v) => (v.uid === uid ? { ...v, ...patch } : v)) });
  };
  const removeVoice = (uid) => {
    updateNested('voices', { list: monster.voices.list.filter((v) => v.uid !== uid) });
  };

  // ───── Summons ─────
  const addSummon = () => {
    updateNested('summon', { summons: [...(monster.summon.summons || []), { uid: Date.now(), name: '', chance: 10, interval: 2000, count: 1 }] });
  };
  const updateSummon = (uid, patch) => {
    updateNested('summon', { summons: monster.summon.summons.map((sm) => (sm.uid === uid ? { ...sm, ...patch } : sm)) });
  };
  const removeSummon = (uid) => {
    updateNested('summon', { summons: monster.summon.summons.filter((sm) => sm.uid !== uid) });
  };

  const loadFromLibrary = (loadedMonster) => {
    setMonster({ ...DEFAULT_MONSTER, ...loadedMonster });
    setSubTab('basic');
  };

  return (
    <div className="monster-editor">
      <div className="monster-editor-header">
        <div className="monster-sub-tabs">
          {SUB_TABS.map((t) => (
            <button
              key={t.key}
              className={`sub-panel-tab ${subTab === t.key ? 'active' : ''}`}
              onClick={() => setSubTab(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="monster-editor-actions">
          <button className="btn btn-gold-sm" onClick={exportLua}>📥 Export Lua</button>
          <button className="btn btn-gold-sm" onClick={copyLua}>📋 Copiar</button>
        </div>
      </div>

      {/* Todos los sub-paneles quedan siempre montados (igual que el resto
          de la app) para no perder lo editado al cambiar de sub-pestaña. */}

      <div style={{ display: subTab === 'basic' ? 'block' : 'none' }}>
        <div className="section">
          <h3 className="section-title">Información Básica</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Nombre del monstruo</label>
              <input
                type="text"
                className="form-input"
                value={monster.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="ej: Rotworm"
              />
            </div>
            <div className="form-group">
              <label>Descripción (corpse look text)</label>
              <input
                type="text"
                className="form-input"
                value={monster.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="ej: a rotworm"
              />
            </div>
            <div className="form-group">
              <label>Experience</label>
              <input
                type="number"
                className="form-input"
                value={monster.experience}
                onChange={(e) => update({ experience: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Race ID</label>
              <input
                type="number"
                className="form-input"
                value={monster.raceId}
                onChange={(e) => update({ raceId: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        <div className="section">
          <h3 className="section-title">Salud y Movimiento</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Health</label>
              <input
                type="number"
                className="form-input"
                value={monster.health}
                onChange={(e) => update({ health: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Max Health</label>
              <input
                type="number"
                className="form-input"
                value={monster.maxHealth}
                onChange={(e) => update({ maxHealth: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Speed</label>
              <input
                type="number"
                className="form-input"
                value={monster.speed}
                onChange={(e) => update({ speed: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Race (sangre/decay)</label>
              <select className="form-input" value={monster.race} onChange={(e) => update({ race: e.target.value })}>
                {RACE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Corpse (item ID)</label>
              <input
                type="number"
                className="form-input"
                value={monster.corpse}
                onChange={(e) => update({ corpse: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Mana Cost (convencer)</label>
              <input
                type="number"
                className="form-input"
                value={monster.manaCost}
                onChange={(e) => update({ manaCost: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        <div className="section">
          <h3 className="section-title">Flags</h3>
          <div className="flags-grid">
            {Object.keys(monster.flags).map((key) => {
              const value = monster.flags[key];
              const isBool = typeof value === 'boolean';
              return (
                <div key={key} className={isBool ? 'flag-checkbox' : 'form-group'}>
                  {isBool ? (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => updateNested('flags', { [key]: e.target.checked })}
                      />
                      {key}
                    </label>
                  ) : (
                    <>
                      <label>{key}</label>
                      <input
                        type="number"
                        className="form-input"
                        value={value}
                        onChange={(e) => updateNested('flags', { [key]: parseInt(e.target.value) || 0 })}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: subTab === 'appearance' ? 'block' : 'none' }}>
        <div className="section">
          <h3 className="section-title">Apariencia del Monstruo</h3>
          <p className="section-hint">
            Mismo sistema visual de looktype/colores/addons/mounts que el de NPCs — totalmente
            reutilizado para garantizar consistencia.
          </p>
          <OutfitSelector outfit={monster.outfit} onChange={(outfit) => update({ outfit })} />
        </div>
      </div>

      <div style={{ display: subTab === 'combat' ? 'block' : 'none' }}>
        <div className="section">
          <h3 className="section-title">Defensas</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Defense</label>
              <input
                type="number"
                className="form-input"
                value={monster.defenses.defense}
                onChange={(e) => updateNested('defenses', { defense: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Armor</label>
              <input
                type="number"
                className="form-input"
                value={monster.defenses.armor}
                onChange={(e) => updateNested('defenses', { armor: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Mitigation</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={monster.defenses.mitigation}
                onChange={(e) => updateNested('defenses', { mitigation: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Habilidades Defensivas (auto-buffs)</h3>
            <button className="btn btn-gold-sm" onClick={addDefenseAbility}>➕ Agregar</button>
          </div>
          <p className="section-hint">
            Hechizos que el monstruo se lanza a sí mismo (ej. aumentar su velocidad). Viven dentro
            de <code>monster.defenses</code> en el Lua real, junto a defense/armor/mitigation.
          </p>
          <div className="items-list">
            {(monster.defenseAbilities || []).length === 0 ? (
              <div className="empty-state-sm">Sin habilidades defensivas configuradas</div>
            ) : (
              monster.defenseAbilities.map((d) => (
                <div key={d.uid} className="item-card">
                  <div className="item-grid">
                    <div className="form-group">
                      <label>Nombre</label>
                      <input
                        type="text"
                        className="form-input"
                        value={d.name}
                        onChange={(e) => updateDefenseAbility(d.uid, { name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Interval</label>
                      <input
                        type="number"
                        className="form-input"
                        value={d.interval}
                        onChange={(e) => updateDefenseAbility(d.uid, { interval: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Chance</label>
                      <input
                        type="number"
                        className="form-input"
                        value={d.chance}
                        onChange={(e) => updateDefenseAbility(d.uid, { chance: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Speed Change</label>
                      <input
                        type="number"
                        className="form-input"
                        value={d.speedChange || 0}
                        onChange={(e) => updateDefenseAbility(d.uid, { speedChange: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Duration (ms)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={d.duration || 0}
                        onChange={(e) => updateDefenseAbility(d.uid, { duration: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Effect</label>
                      <select
                        className="form-input"
                        value={d.effect || ''}
                        onChange={(e) => updateDefenseAbility(d.uid, { effect: e.target.value })}
                      >
                        <option value="">(ninguno)</option>
                        {COMMON_SHOOT_EFFECTS.map((fx) => <option key={fx} value={fx}>{fx.replace('CONST_ME_', '')}</option>)}
                      </select>
                    </div>
                    <button className="btn btn-danger-sm" onClick={() => removeDefenseAbility(d.uid)}>🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="section">
          <h3 className="section-title">Elementos (resistencias %)</h3>
          <p className="section-hint">Positivo = más daño recibido. Negativo = resistencia. -100 = inmune. 100 = debilidad total.</p>
          <div className="elements-grid">
            {monster.elements.map((e) => (
              <div key={e.type} className="form-group">
                <label>{e.type.replace('COMBAT_', '').replace('DAMAGE', '')}</label>
                <input
                  type="number"
                  className="form-input"
                  value={e.percent}
                  onChange={(ev) => updateElement(e.type, parseInt(ev.target.value) || 0)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h3 className="section-title">Inmunidades a condiciones</h3>
          <div className="addon-checkboxes immunities-checkboxes">
            {monster.immunities.map((i) => (
              <label key={i.type} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={i.condition}
                  onChange={(e) => toggleImmunity(i.type, e.target.checked)}
                />
                {i.type}
              </label>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Ataques</h3>
            <button className="btn btn-gold-sm" onClick={addAttack}>➕ Agregar Ataque</button>
          </div>
          <div className="items-list">
            {monster.attacks.length === 0 ? (
              <div className="empty-state-sm">Sin ataques configurados (el monstruo no haría daño)</div>
            ) : (
              monster.attacks.map((a) => (
                <div key={a.uid} className="item-card">
                  <div className="item-grid attack-grid">
                    <div className="form-group">
                      <label>Nombre</label>
                      <input
                        type="text"
                        className="form-input"
                        list="attack-names"
                        value={a.name}
                        onChange={(e) => updateAttack(a.uid, { name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Interval</label>
                      <input
                        type="number"
                        className="form-input"
                        value={a.interval}
                        onChange={(e) => updateAttack(a.uid, { interval: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Chance</label>
                      <input
                        type="number"
                        className="form-input"
                        value={a.chance}
                        onChange={(e) => updateAttack(a.uid, { chance: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Min Damage</label>
                      <input
                        type="number"
                        className="form-input"
                        value={a.minDamage}
                        onChange={(e) => updateAttack(a.uid, { minDamage: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Max Damage</label>
                      <input
                        type="number"
                        className="form-input"
                        value={a.maxDamage}
                        onChange={(e) => updateAttack(a.uid, { maxDamage: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Range</label>
                      <input
                        type="number"
                        className="form-input"
                        value={a.range || 0}
                        onChange={(e) => updateAttack(a.uid, { range: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <button className="btn btn-danger-sm" onClick={() => removeAttack(a.uid)}>🗑️</button>
                  </div>

                  {/* Daño continuo (condition: poison/fire/energy/etc) */}
                  <div className="attack-extra-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={!!a.condition}
                        onChange={(e) =>
                          updateAttack(a.uid, {
                            condition: e.target.checked
                              ? { type: 'CONDITION_POISON', totalDamage: 100, interval: 4000 }
                              : undefined
                          })
                        }
                      />
                      Daño continuo (poison/fire/energy...)
                    </label>
                    {a.condition && (
                      <div className="attack-condition-fields">
                        <select
                          className="form-input"
                          value={a.condition.type}
                          onChange={(e) => updateAttack(a.uid, { condition: { ...a.condition, type: e.target.value } })}
                        >
                          {CONDITION_TYPES.map((c) => <option key={c} value={c}>{c.replace('CONDITION_', '')}</option>)}
                        </select>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Total Damage"
                          value={a.condition.totalDamage}
                          onChange={(e) => updateAttack(a.uid, { condition: { ...a.condition, totalDamage: parseInt(e.target.value) || 0 } })}
                        />
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Interval (ms)"
                          value={a.condition.interval}
                          onChange={(e) => updateAttack(a.uid, { condition: { ...a.condition, interval: parseInt(e.target.value) || 0 } })}
                        />
                      </div>
                    )}
                  </div>

                  {/* Speed change (paralyze/slow al jugador) */}
                  <div className="attack-extra-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={!!a.speedChange}
                        onChange={(e) => updateAttack(a.uid, { speedChange: e.target.checked ? 200 : 0, duration: e.target.checked ? (a.duration || 5000) : 0 })}
                      />
                      Paralyze / cambio de velocidad
                    </label>
                    {!!a.speedChange && (
                      <div className="attack-condition-fields">
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Speed Change"
                          value={a.speedChange}
                          onChange={(e) => updateAttack(a.uid, { speedChange: parseInt(e.target.value) || 0 })}
                        />
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Duration (ms)"
                          value={a.duration || 0}
                          onChange={(e) => updateAttack(a.uid, { duration: parseInt(e.target.value) || 0 })}
                        />
                        <select
                          className="form-input"
                          value={a.effect || ''}
                          onChange={(e) => updateAttack(a.uid, { effect: e.target.value })}
                        >
                          <option value="">(sin efecto visual)</option>
                          {COMMON_SHOOT_EFFECTS.map((fx) => <option key={fx} value={fx}>{fx.replace('CONST_ME_', '')}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <datalist id="attack-names">
            {COMMON_ATTACK_NAMES.map((n) => <option key={n} value={n} />)}
          </datalist>
        </div>
      </div>

      <div style={{ display: subTab === 'loot' ? 'block' : 'none' }}>
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Loot Table</h3>
            <button className="btn btn-gold-sm" onClick={addLootItem}>➕ Agregar Item</button>
          </div>
          <p className="section-hint">Chance va de 1 a 100000 (100000 = 100% de probabilidad).</p>
          <div className="items-list">
            {monster.loot.length === 0 ? (
              <div className="empty-state-sm">Sin loot configurado</div>
            ) : (
              monster.loot.map((it) => (
                <div key={it.uid} className="item-card">
                  <div className="item-grid">
                    <div className="form-group">
                      <label>Nombre del item</label>
                      <input
                        type="text"
                        className="form-input"
                        value={it.name}
                        onChange={(e) => updateLootItem(it.uid, { name: e.target.value })}
                        placeholder="ej: gold coin"
                      />
                    </div>
                    <div className="form-group">
                      <label>Chance (1-100000)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={it.chance}
                        onChange={(e) => updateLootItem(it.uid, { chance: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Max Count</label>
                      <input
                        type="number"
                        className="form-input"
                        value={it.maxCount}
                        onChange={(e) => updateLootItem(it.uid, { maxCount: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <button className="btn btn-danger-sm" onClick={() => removeLootItem(it.uid)}>🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: subTab === 'bestiary' ? 'block' : 'none' }}>
        <div className="section">
          <h3 className="section-title">Bestiary</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Class</label>
              <input
                type="text"
                className="form-input"
                value={monster.bestiary.class}
                onChange={(e) => updateNested('bestiary', { class: e.target.value })}
                placeholder="ej: Vermin"
              />
            </div>
            <div className="form-group">
              <label>Race (categoría)</label>
              <select
                className="form-input"
                value={monster.bestiary.race}
                onChange={(e) => updateNested('bestiary', { race: e.target.value })}
              >
                {BESTIARY_RACES.map((r) => <option key={r} value={r}>{r.replace('BESTY_RACE_', '')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Stars (dificultad 1-4)</label>
              <input
                type="number"
                min="1"
                max="4"
                className="form-input"
                value={monster.bestiary.stars}
                onChange={(e) => updateNested('bestiary', { stars: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="form-group">
              <label>To Kill</label>
              <input
                type="number"
                className="form-input"
                value={monster.bestiary.toKill}
                onChange={(e) => updateNested('bestiary', { toKill: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>First Unlock</label>
              <input
                type="number"
                className="form-input"
                value={monster.bestiary.firstUnlock}
                onChange={(e) => updateNested('bestiary', { firstUnlock: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Second Unlock</label>
              <input
                type="number"
                className="form-input"
                value={monster.bestiary.secondUnlock}
                onChange={(e) => updateNested('bestiary', { secondUnlock: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Charms Points</label>
              <input
                type="number"
                className="form-input"
                value={monster.bestiary.charmsPoints}
                onChange={(e) => updateNested('bestiary', { charmsPoints: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Occurrence</label>
              <input
                type="number"
                className="form-input"
                value={monster.bestiary.occurrence}
                onChange={(e) => updateNested('bestiary', { occurrence: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label>Locations</label>
            <textarea
              className="form-textarea"
              rows="3"
              value={monster.bestiary.locations}
              onChange={(e) => updateNested('bestiary', { locations: e.target.value })}
              placeholder="ej: Almost everywhere, like Ancient Temple, Vandura..."
            />
          </div>
        </div>
      </div>

      <div style={{ display: subTab === 'voices' ? 'block' : 'none' }}>
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Voices</h3>
            <button className="btn btn-gold-sm" onClick={addVoice}>➕ Agregar Voz</button>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Interval</label>
              <input
                type="number"
                className="form-input"
                value={monster.voices.interval}
                onChange={(e) => updateNested('voices', { interval: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Chance</label>
              <input
                type="number"
                className="form-input"
                value={monster.voices.chance}
                onChange={(e) => updateNested('voices', { chance: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="items-list" style={{ marginTop: '12px' }}>
            {(monster.voices.list || []).map((v) => (
              <div key={v.uid} className="shop-item-row">
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1 }}
                  value={v.text}
                  onChange={(e) => updateVoice(v.uid, { text: e.target.value })}
                  placeholder="Texto de la voz"
                />
                <label className="checkbox-label">
                  <input type="checkbox" checked={v.yell} onChange={(e) => updateVoice(v.uid, { yell: e.target.checked })} />
                  Yell
                </label>
                <button className="btn btn-danger-sm" onClick={() => removeVoice(v.uid)}>🗑️</button>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Summons</h3>
            <button className="btn btn-gold-sm" onClick={addSummon}>➕ Agregar Summon</button>
          </div>
          <div className="form-group">
            <label>Max Summons</label>
            <input
              type="number"
              className="form-input"
              style={{ maxWidth: '150px' }}
              value={monster.summon.maxSummons}
              onChange={(e) => updateNested('summon', { maxSummons: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="items-list" style={{ marginTop: '12px' }}>
            {(monster.summon.summons || []).map((sm) => (
              <div key={sm.uid} className="item-card">
                <div className="item-grid">
                  <div className="form-group">
                    <label>Nombre del monstruo a invocar</label>
                    <input
                      type="text"
                      className="form-input"
                      value={sm.name}
                      onChange={(e) => updateSummon(sm.uid, { name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Chance</label>
                    <input
                      type="number"
                      className="form-input"
                      value={sm.chance}
                      onChange={(e) => updateSummon(sm.uid, { chance: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Interval</label>
                    <input
                      type="number"
                      className="form-input"
                      value={sm.interval}
                      onChange={(e) => updateSummon(sm.uid, { interval: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Count</label>
                    <input
                      type="number"
                      className="form-input"
                      value={sm.count}
                      onChange={(e) => updateSummon(sm.uid, { count: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <button className="btn btn-danger-sm" onClick={() => removeSummon(sm.uid)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: subTab === 'preview' ? 'block' : 'none' }}>
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Lua Script Preview</h3>
            <button className="btn btn-gold-sm" onClick={copyLua}>📋 Copiar</button>
          </div>
          <div className="preview-box lua-preview">
            <pre className="lua-code">{luaCode}</pre>
          </div>
        </div>
      </div>

      <div style={{ display: subTab === 'library' ? 'block' : 'none' }}>
        <MonsterLibrary onLoadMonster={loadFromLibrary} />
      </div>
    </div>
  );
};

export default MonsterEditor;
