import { createContext, useContext, useEffect, useRef, useState } from "react";
import { crmRepository } from "../services/crmRepository";
const Context = createContext(null);
export function CRMProvider({ children }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const current = useRef(null),
    timer = useRef();
  const notify = (message) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3500);
  };
  useEffect(() => {
    let active = true;
    crmRepository
      .load()
      .then((value) => {
        if (active) {
          current.current = value;
          setData(value);
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
      clearTimeout(timer.current);
    };
  }, []);
  const commit = async (next) => {
    try {
      await crmRepository.save(next);
      current.current = next;
      setData(next);
    } catch {
      notify("Could not save. Browser storage may be full or unavailable.");
      throw new Error("Save failed");
    }
  };
  const save = async (entity, record) => {
    const existing = Boolean(record.id);
    const item = { ...record, id: record.id || crypto.randomUUID() };
    await commit({
      ...current.current,
      [entity]: existing
        ? current.current[entity].map((x) => (x.id === item.id ? item : x))
        : [item, ...current.current[entity]],
    });
    notify(existing ? "Changes saved" : "Record added");
    return item;
  };
  const remove = async (entity, id) => {
    await commit({
      ...current.current,
      [entity]: current.current[entity].filter((x) => x.id !== id),
    });
    notify("Record deleted");
  };
  const saveSettings = async (settings) => {
    await commit({ ...current.current, settings });
    notify("Settings saved");
  };
  return (
    <Context.Provider
      value={{ data, error, save, remove, saveSettings, notify }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </Context.Provider>
  );
}
export const useCRM = () => useContext(Context);
