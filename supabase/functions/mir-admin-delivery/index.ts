import {createAdminDelivery} from '../_shared/admin-delivery.mjs';
Deno.serve(createAdminDelivery({env:Deno.env}));
