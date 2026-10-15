import { geocodingService } from "@/lib/location/geocoding";
import { createGeocodingRouteHandler } from "@/lib/location/geocoding-route-handler";

export const GET = createGeocodingRouteHandler(geocodingService.search);
