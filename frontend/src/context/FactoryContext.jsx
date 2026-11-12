import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { factorySeed } from "../data/factorySeed";

const FactoryContext = createContext(null);
const STORAGE_KEY = "aroma-factory-demo-v1";

/** Provides sample factory records and optional browser-local demo edits. */
export function FactoryProvider({ children }) {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...factorySeed, ...JSON.parse(saved) } : factorySeed;
    } catch {
      return factorySeed;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // The demo remains usable in private browsing when storage is unavailable.
    }
  }, [data]);

  const value = useMemo(() => ({
    data,
    addRecord: (collection, record) => setData((current) => ({
      ...current,
      [collection]: [{ id: `${collection.slice(0, 2).toUpperCase()}-${Date.now()}`, ...record }, ...current[collection]],
    })),
    updateRecord: (collection, id, updates) => setData((current) => ({
      ...current,
      [collection]: current[collection].map((record) => record.id === id ? { ...record, ...updates } : record),
    })),
  }), [data]);

  return <FactoryContext.Provider value={value}>{children}</FactoryContext.Provider>;
}

export function useFactory() {
  const context = useContext(FactoryContext);
  if (!context) throw new Error("useFactory must be used within FactoryProvider");
  return context;
}
