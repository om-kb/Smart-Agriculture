import type { Metadata } from "next";
import FarmProfileForm from "@/components/farm-profile-form";

export const metadata: Metadata = {
  title: "Farm profile | Smart Agriculture Advisor",
};

export default function FarmPage() {
  return <FarmProfileForm />;
}
