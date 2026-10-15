import type { Metadata } from "next";
import LocationSetupForm from "@/components/location-setup-form";

export const metadata: Metadata = {
  title: "Choose your location | Smart Agriculture Advisor",
};

export default function SetupPage() {
  return <LocationSetupForm />;
}
