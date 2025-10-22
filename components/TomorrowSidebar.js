"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TomorrowSidebar() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching tomorrow workout...");

      const res = await fetch("/api/tomorrow-workout");
      console.log("Response status:", res.status);

      const json = await res.json();
      console.log("Response data:", json);

      if (res.ok) {
        setData(json);
      } else {
        setError(json.error || "Failed to load");
      }
    } catch (e) {
      console.error("Fetch error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  return (
    <aside className="flex w-80 xl:w-96 flex-col border-l bg-background">
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Tomorrow&apos;s Workout</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <div>Loading...</div>}
            {error && <div className="text-red-500">Error: {error}</div>}
            {!loading && !error && !data && <div>No data received</div>}
            {data?.workout && (
              <div className="space-y-2">
                <p className="font-medium">{data.workout.name}</p>
                <p className="text-sm text-gray-600">
                  {data.workout.estimatedDuration} min
                </p>
                <ul className="text-sm space-y-1">
                  {data.workout.exercises?.map((ex, i) => (
                    <li key={i}>
                      • {ex.name} — {ex.sets}×{ex.reps}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
