import { createEdgeService } from '../_shared/estimate-edge.mjs';
Deno.serve(createEdgeService({env:Deno.env}));
