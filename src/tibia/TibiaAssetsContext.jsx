import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const TibiaAssetsContext = createContext(null);

const ASSETS_DOWNLOAD_URL =
  'https://github.com/ricker72/ricker72.github.io/releases/download/Clients/Cliente.15.33.assets.zip';

const getApi = () => (typeof window !== 'undefined' && window.tibiaAssets ? window.tibiaAssets : null);

export function TibiaAssetsProvider({ children }) {
  const [status, setStatus] = useState({ loading: true, loaded: false, path: null, outfitCount: 0, objectCount: 0, error: null });

  const loadFromSavedOrDetect = useCallback(async () => {
    const api = getApi();
    if (!api) {
      setStatus({ loading: false, loaded: false, path: null, outfitCount: 0, objectCount: 0, error: null, unsupported: true });
      return;
    }

    setStatus((s) => ({ ...s, loading: true, error: null }));

    let result = null;
    try {
      const savedPath = await api.getSavedPath();
      if (savedPath) {
        result = await api.loadSaved();
      }
      if (!result || !result.ok) {
        result = await api.autoDetect();
      }
    } catch (err) {
      result = { ok: false, error: err.message };
    }

    if (result && result.ok) {
      setStatus({
        loading: false,
        loaded: true,
        path: result.path,
        outfitCount: result.outfitCount || 0,
        objectCount: result.objectCount || 0,
        error: null
      });
    } else {
      setStatus({
        loading: false,
        loaded: false,
        path: null,
        outfitCount: 0,
        objectCount: 0,
        error: (result && result.error) || 'No se pudieron cargar los assets del cliente.'
      });
    }
  }, []);

  useEffect(() => {
    loadFromSavedOrDetect();
  }, [loadFromSavedOrDetect]);

  const selectFolder = useCallback(async () => {
    const api = getApi();
    if (!api) return { ok: false, error: 'API no disponible' };
    setStatus((s) => ({ ...s, loading: true }));
    const result = await api.selectFolder();
    if (result.canceled) {
      setStatus((s) => ({ ...s, loading: false }));
      return result;
    }
    if (result.ok) {
      setStatus({
        loading: false,
        loaded: true,
        path: result.path,
        outfitCount: result.outfitCount || 0,
        objectCount: result.objectCount || 0,
        error: null
      });
    } else {
      setStatus((s) => ({ ...s, loading: false, error: result.error }));
    }
    return result;
  }, []);

  const retry = useCallback(() => {
    loadFromSavedOrDetect();
  }, [loadFromSavedOrDetect]);

  const downloadAssets = useCallback(async () => {
    const api = getApi();
    if (!api) return false;
    return api.downloadAssets();
  }, []);

  const value = useMemo(
    () => ({
      status,
      api: getApi(),
      isElectron: !!getApi(),
      loaded: status.loaded,
      selectFolder,
      retry,
      downloadAssets,
      downloadUrl: ASSETS_DOWNLOAD_URL
    }),
    [status, selectFolder, retry, downloadAssets]
  );

  return <TibiaAssetsContext.Provider value={value}>{children}</TibiaAssetsContext.Provider>;
}

export function useTibiaAssets() {
  const ctx = useContext(TibiaAssetsContext);
  if (!ctx) {
    throw new Error('useTibiaAssets debe usarse dentro de <TibiaAssetsProvider>');
  }
  return ctx;
}

export default TibiaAssetsContext;
