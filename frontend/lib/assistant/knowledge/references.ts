import type { SourceReference } from "../types.ts";

export const ICAR_PORTAL: SourceReference = {
  label: "Indian Council of Agricultural Research (ICAR) portal",
  url: "https://icar.org.in/",
  note: "Official portal; the general guidance in this answer is not verified against a topic-specific ICAR publication.",
};

export const IMD_PORTAL: SourceReference = {
  label: "India Meteorological Department",
  url: "https://mausam.imd.gov.in/",
  note: "Official weather portal; no live forecast was queried for this general answer.",
};

export const SOIL_HEALTH_PORTAL: SourceReference = {
  label: "Government of India Soil Health Card portal",
  url: "https://soilhealth.dac.gov.in/",
  note: "Official soil-health resource; local laboratory procedures and recommendations may differ.",
};

export const PMKSY_PORTAL: SourceReference = {
  label: "Pradhan Mantri Krishi Sinchayee Yojana",
  url: "https://pmksy.gov.in/",
  note: "Official program overview on water conservation and micro-irrigation; it does not verify every general practice listed here.",
};

export const APPLICATION_REFERENCE: SourceReference = {
  label: "Application scope for this release",
  note: "This assistant branch documents intended app help; the corresponding location, profile, or dashboard screen is not connected here.",
};
