import { createEntityRouteHandler } from "@/lib/lgd/route-handler";
import { lgdService } from "@/lib/lgd/service";

export const GET = createEntityRouteHandler("state", (state) =>
  lgdService.districts(state),
);
