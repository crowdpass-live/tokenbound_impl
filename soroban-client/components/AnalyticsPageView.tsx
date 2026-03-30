"use client";

import { useTrackPageView } from "@/lib/analytics";

export default function AnalyticsPageView({ page }: { page: string }) {
  useTrackPageView(page);
  return null;
}
