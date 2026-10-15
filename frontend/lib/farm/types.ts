export const cropOptions = [
  "Rice",
  "Wheat",
  "Maize",
  "Cotton",
  "Sugarcane",
  "Groundnut",
  "Tomato",
  "Potato",
  "Other",
] as const;

export const soilOptions = [
  "Sandy",
  "Clay",
  "Loamy",
  "Black soil",
  "Red soil",
  "Alluvial soil",
  "Unknown",
] as const;

export const irrigationOptions = [
  "Rainfed",
  "Canal",
  "Borewell",
  "Drip",
  "Sprinkler",
  "Other",
] as const;

export const growthStageOptions = [
  "Not set",
  "Land preparation",
  "Sowing / planting",
  "Vegetative growth",
  "Flowering",
  "Harvest",
] as const;

export type FarmProfile = {
  farmName: string;
  farmSize: number | null;
  farmSizeUnit: "acres" | "hectares";
  crop: (typeof cropOptions)[number] | "";
  soilType: (typeof soilOptions)[number] | "";
  irrigationType: (typeof irrigationOptions)[number] | "";
  growthStage: (typeof growthStageOptions)[number] | "";
  sowingDate: string;
};

export const emptyFarmProfile: FarmProfile = {
  farmName: "",
  farmSize: null,
  farmSizeUnit: "acres",
  crop: "",
  soilType: "",
  irrigationType: "",
  growthStage: "",
  sowingDate: "",
};
