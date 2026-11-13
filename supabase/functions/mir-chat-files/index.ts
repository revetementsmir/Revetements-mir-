// PREPARED ONLY. Separate explicit TEST deployment/activation approval required.
// Auth is verified through Supabase Auth, followed by current database access.
import { createChatFileService } from '../_shared/chat-files.mjs';
Deno.serve(createChatFileService({env:Deno.env}));
