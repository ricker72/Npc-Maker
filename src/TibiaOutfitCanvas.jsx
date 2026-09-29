import React, { useCallback, useEffect, useRef, useState } from 'react';
import colorsData from './data/colors.json';
import { drawFrame, fitToBox } from './tibia/spriteCompositor';
import { useTibiaAssets } from './tibia/TibiaAssetsContext';
import { useTranslation } from './i18n/LanguageContext';

const DIRECTION_LABELS = ['↑', '→', '↓', '←'];
const WALK_FRAME_MS = 150;

function colorById(id) {
  const c = colorsData.find((x) => x.id === id) || colorsData[0];
  return { r: c.r, g: c.g, b: c.b };
}

const NEUTRAL_COLORS = { head: colorById(0), body: colorById(0), legs: colorById(0), feet: colorById(0) };

function useFrameCache() {
  const cacheRef = useRef(new Map());
  const { status } = useTibiaAssets();

  return useCallback(
    async (kind, id, options) => {
      const api = typeof window !== 'undefined' ? window.tibiaAssets : null;
      if (!api || !id) return null;
      const key = `${status.path}|${kind}|${id}|${options.group}|${options.direction}|${options.patternY}|${options.z}|${options.phase}`;
      if (cacheRef.current.has(key)) return cacheRef.current.get(key);
      const result = kind === 'item'
        ? await api.getItemFrame(id, { frame: options.phase || 0 })
        : await api.getFrame(id, options);
      cacheRef.current.set(key, result);
      return result;
    },
    [status.path]
  );
}

export function AssetsMissingNotice({ compact = false, onSelectFolder, reason }) {
  const { downloadAssets, downloadUrl, status } = useTibiaAssets();
  const { t } = useTranslation();

  return (
    <div className={`assets-missing-notice ${compact ? 'compact' : ''}`}>
      <span className="assets-missing-icon">📦</span>
      <p className="assets-missing-text">{reason || status.error || t('assets.missingVersion')}</p>
      <a
        className="assets-missing-link"
        href={downloadUrl}
        onClick={(e) => {
          e.preventDefault();
          downloadAssets();
        }}
      >
        ⬇️ {t('assets.downloadZip')}
      </a>
      {onSelectFolder && (
        <button className="btn btn-gold-sm" onClick={onSelectFolder} disabled={status.loading}>
          📁 {status.loading ? t('assets.loading') : t('assets.selectFolder')}
        </button>
      )}
    </div>
  );
}


const TibiaOutfitCanvas = ({ outfit, direction, animate, size = 160, className = '', onMissing }) => {
  const canvasRef = useRef(null);
  const phaseRef = useRef(0);
  const getFrame = useFrameCache();
  const { loaded } = useTibiaAssets();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const colors = {
      head: colorById(outfit.lookHead),
      body: colorById(outfit.lookBody),
      legs: colorById(outfit.lookLegs),
      feet: colorById(outfit.lookFeet),
    };
    const hasMount = !!outfit.lookMount;
    const group = animate ? 'moving' : 'idle';

    async function renderOnce() {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const phase = phaseRef.current;
      const z = hasMount ? 1 : 0;

      const [baseFrame, addon1Frame, addon2Frame, mountFrame] = await Promise.all([
        getFrame('look', outfit.lookType, { group, direction, patternY: 0, z, phase }),
        outfit.lookAddons & 1 ? getFrame('look', outfit.lookType, { group, direction, patternY: 1, z, phase }) : null,
        outfit.lookAddons & 2 ? getFrame('look', outfit.lookType, { group, direction, patternY: 2, z, phase }) : null,
        hasMount ? getFrame('look', outfit.lookMount, { group, direction, patternY: 0, z: 0, phase }) : null,
      ]);

      if (cancelled) return;

      const isMissing = !!(baseFrame && baseFrame.missing) || !!(mountFrame && mountFrame.missing);
      setMissing(isMissing);
      if (onMissing) onMissing(isMissing);
      if (isMissing) return;

      
      
      
      const fit = fitToBox([baseFrame, addon1Frame, addon2Frame, mountFrame], size);
      if (!fit) return;

      for (const frame of fit.frames) {
        drawFrame(ctx, frame, colors, fit.dx, fit.dy, frame.width * fit.scale, frame.height * fit.scale);
      }
    }

    phaseRef.current = 0;
    renderOnce();

    if (animate) {
      intervalId = setInterval(() => {
        phaseRef.current += 1;
        renderOnce();
      }, WALK_FRAME_MS);
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [loaded, outfit.lookType, outfit.lookHead, outfit.lookBody, outfit.lookLegs, outfit.lookFeet, outfit.lookAddons, outfit.lookMount, direction, animate, size, getFrame, onMissing]);

  if (!loaded || missing) return null;

  return <canvas ref={canvasRef} width={size} height={size} className={`tibia-outfit-canvas ${className}`.trim()} />;
};

const TibiaLookSprite = ({ lookType, size = 64, direction = 2, animate = false, className = '' }) => {
  const { loaded } = useTibiaAssets();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!loaded || !lookType) return undefined;
    let cancelled = false;
    window.tibiaAssets.hasAppearance(lookType).then((exists) => {
      if (!cancelled) setMissing(!exists);
    });
    return () => { cancelled = true; };
  }, [loaded, lookType]);

  if (!loaded || missing || !lookType) return null;

  const outfit = { lookType, lookHead: 0, lookBody: 0, lookLegs: 0, lookFeet: 0, lookAddons: 0, lookMount: 0 };

  return <TibiaOutfitCanvas outfit={outfit} direction={direction} animate={animate} size={size} className={className} />;
};

const TibiaItemSprite = ({ objectId, size = 32, frame = 0, className = '' }) => {
  const canvasRef = useRef(null);
  const getFrame = useFrameCache();
  const { loaded } = useTibiaAssets();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !loaded || !objectId) return undefined;

    (async () => {
      const result = await getFrame('item', objectId, { phase: frame });
      if (cancelled || !canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!result || result.missing || !result.ok) {
        setMissing(true);
        return;
      }
      setMissing(false);
      
      
      const fit = fitToBox([result], size);
      if (!fit) return;
      for (const frame of fit.frames) {
        drawFrame(ctx, frame, NEUTRAL_COLORS, fit.dx, fit.dy, frame.width * fit.scale, frame.height * fit.scale);
      }
    })();

    return () => { cancelled = true; };
  }, [loaded, objectId, size, frame, getFrame]);

  if (!loaded || !objectId || missing) return null;

  return <canvas ref={canvasRef} width={size} height={size} className={`tibia-item-sprite ${className}`.trim()} />;
};

export default TibiaOutfitCanvas;
export { DIRECTION_LABELS, TibiaLookSprite, TibiaItemSprite };