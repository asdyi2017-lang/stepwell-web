import { useEffect, useState } from "react";
import { getHealthSnapshot } from "../lib/api";

export function useHealth(userId: number) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const snapshot = await getHealthSnapshot(userId);
    setData(snapshot);
    setLoading(false);
  }

  return { data, loading };
}