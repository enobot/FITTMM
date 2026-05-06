import { useState, useEffect, useCallback } from "react";
import { fetchPlan, selectionsFromApiPlan } from "../api/workoutApi";
import { getStoredUser } from "../utils/fittmmStorage";

export function useWorkoutPlan() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const userId = getStoredUser()?.id;

  const [selections, setSelections] = useState({});
  const [planMeta, setPlanMeta] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!token) {
      setSelections({});
      setPlanMeta({ name: "", description: "" });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const plan = await fetchPlan();
      if (!plan) {
        setSelections({});
        setPlanMeta({ name: "", description: "" });
      } else {
        setSelections(selectionsFromApiPlan(plan));
        setPlanMeta({
          name: plan.name || "",
          description: plan.description || "",
        });
      }
    } catch (e) {
      setError(e.message || "Failed to load plan");
      setSelections({});
      setPlanMeta({ name: "", description: "" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload, userId]);

  return { selections, planMeta, loading, error, reload };
}
