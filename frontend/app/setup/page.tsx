import type { Metadata } from "next";
import FarmLocationSetup from "@/components/farm-location-setup";

export const metadata: Metadata = {
  title: "Choose your farm location | Smart Agriculture Advisor",
};

export default function SetupPage() {
  return <FarmLocationSetup />;
}
