import type { SQLiteDatabase } from "expo-sqlite";
import React, { createContext, useContext, useEffect, useState } from "react";

import { openDb } from "@/lib/db/database";

type DatabaseContextType = {
  db: SQLiteDatabase | null;
  isReady: boolean;
};

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    openDb()
      .then((database) => {
        if (!active) {
          closeDatabase(database);
          return;
        }
        setDb(database);
        setIsReady(true);
      })
      .catch((error) => {
        console.error("Failed to open database", error);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
}

async function closeDatabase(db: SQLiteDatabase) {
  try {
    await db.closeAsync();
  } catch {
    // noop
  }
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabase must be used within DatabaseProvider");
  }
  return context;
}
