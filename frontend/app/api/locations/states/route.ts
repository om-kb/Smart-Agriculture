import { createStatesRouteHandler } from "@/lib/lgd/route-handler";
import { lgdService } from "@/lib/lgd/service";

export const GET = createStatesRouteHandler(() => lgdService.states());
