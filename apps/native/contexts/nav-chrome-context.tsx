import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useDatabase } from "@/contexts/database-context";
import { settingsQueries } from "@/lib/db/database";
import type { TillOperator } from "@/lib/types";

type NavChromeContextType = {
  /** Phone slide-in drawer visibility. */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** The till operator (for the header avatar / drawer identity). */
  operator: TillOperator | null;
};

const NavChromeContext = createContext<NavChromeContextType | undefined>(undefined);

export function NavChromeProvider({ children }: { children: React.ReactNode }) {
  const { db, isReady } = useDatabase();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [operator, setOperator] = useState<TillOperator | null>(null);

  useEffect(() => {
    if (!isReady || !db) return;
    let active = true;
    settingsQueries.getOperator(db).then((op) => {
      if (active) setOperator(op);
    });
    return () => {
      active = false;
    };
  }, [isReady, db]);

  const value = useMemo(
    () => ({
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      operator,
    }),
    [drawerOpen, operator],
  );

  return <NavChromeContext.Provider value={value}>{children}</NavChromeContext.Provider>;
}

export function useNavChrome() {
  const context = useContext(NavChromeContext);
  if (!context) {
    throw new Error("useNavChrome must be used within NavChromeProvider");
  }
  return context;
}
