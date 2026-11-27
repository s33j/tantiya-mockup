import type { Metadata } from "next";
import { TwoStep } from "@/components/two-step";

export const metadata: Metadata = {
  title: "Two-step sign-in · Tantiya Staff",
};

// S2 (set up) or S3 (enter code).
export default function TwoStepPage() {
  return <TwoStep />;
}
