import React, { useEffect, useRef } from 'react';
import colorsData from './data/colors.json';
import { drawFrame } from './tibia/spriteCompositor';

const DIRECTION_LABELS = ['↑', '→', '↓', '←']; // Norte, Este, Sur, Oeste
const WALK_FRAME_MS = 150;

function colorById(id) {
  const c = colorsData.find((x) => x.id === id) || colorsData[0];
  return { r: c.r, g: c.g, b: c.b };
}

// Cache simple en memoria (dura mientras el componente esta montado) para no
// volver a pedir por IPC un frame que ya se descargo/decodifico antes. Las
// animaciones de caminar reciclan siempre los mismos ~8 cuadros, asi que
// despues del primer ciclo todo sale de cache y la animacion es fluida.
function useFrameCache() {
  const cacheRef = useRef(new Map());
  return async (lookType, options) => {
    if (!lookType) return null;
    const key = `${lookType}|${options.group}|${options.direction}|${options.patternY}|${options.z}|${options.phase}`;
    if (cacheRef.current.has(key)) return cacheRef.current.get(key);
    const result = await window.tibiaAssets.getFrame(lookType, options);
    cacheRef.current.set(key, result);
    return result;
  };
}

const TibiaOutfitCanvas = ({ outfit, direction, animate, size = 160 }) => {
  const canvasRef = useRef(null);
  const phaseRef = useRef(0);
  const getFrame = useFrameCache();

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
        getFrame(outfit.lookType, { group, direction, patternY: 0, z, phase }),
        (outfit.lookAddons & 1)
          ? getFrame(outfit.lookType, { group, direction, patternY: 1, z, phase })
          : null,
        (outfit.lookAddons & 2)
          ? getFrame(outfit.lookType, { group, direction, patternY: 2, z, phase })
          : null,
        hasMount ? getFrame(outfit.lookMount, { group, direction, patternY: 0, z: 0, phase }) : null,
      ]);

      if (cancelled) return;

      // Tamaño destino: el sprite base define la escala del "tile" (32 o 64
      // px nativos) estirado al tamaño del canvas.
      const nativeSize = (baseFrame && baseFrame.ok && baseFrame.width) || 64;
      const scale = size / nativeSize;
      const dx = 0;
      const dy = 0;

      if (mountFrame && mountFrame.ok) {
        drawFrame(ctx, mountFrame, colors, dx, dy, mountFrame.width * scale, mountFrame.height * scale);
      }
      if (baseFrame && baseFrame.ok) {
        drawFrame(ctx, baseFrame, colors, dx, dy, baseFrame.width * scale, baseFrame.height * scale);
      }
      if (addon1Frame && addon1Frame.ok) {
        drawFrame(ctx, addon1Frame, colors, dx, dy, addon1Frame.width * scale, addon1Frame.height * scale);
      }
      if (addon2Frame && addon2Frame.ok) {
        drawFrame(ctx, addon2Frame, colors, dx, dy, addon2Frame.width * scale, addon2Frame.height * scale);
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
  }, [
    outfit.lookType,
    outfit.lookHead,
    outfit.lookBody,
    outfit.lookLegs,
    outfit.lookFeet,
    outfit.lookAddons,
    outfit.lookMount,
    direction,
    animate,
    size,
  ]);

  return <canvas ref={canvasRef} width={size} height={size} className="tibia-outfit-canvas" />;
};

export default TibiaOutfitCanvas;
export { DIRECTION_LABELS };
