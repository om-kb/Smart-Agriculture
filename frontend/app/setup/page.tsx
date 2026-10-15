import type { Metadata } from "next";
import LocationSetup from "@/components/location-setup";

export const metadata: Metadata = {
  title: "Set weather location | Smart Agriculture Advisor",
};

export default function SetupPage() {
  return <LocationSetup />;
}
