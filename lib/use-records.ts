"use client";

import { STORAGE_KEY } from "@/lib/constants";
import { CounselingRecord } from "@/lib/types";
import { useEffect, useState } from "react";

export function useRecords() {
  const [records, setRecords] = useState<CounselingRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setIsLoaded(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as CounselingRecord[];
      setRecords(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Ignore storage write errors (private mode / quota).
    }
  }, [isLoaded, records]);

  return { records, setRecords };
}
