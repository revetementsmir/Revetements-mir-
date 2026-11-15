// MIR TEST installation explicitly authorized; no SMTP/HTTP email provider.
// The service refuses every project except hxtztkmbfpmzrieccwsg.
import {createTeamInvitationService} from '../_shared/team-invitations.mjs';
const testOnly={MIR_TEAM_ENROLLMENT_ENABLED:'true',MIR_TEAM_TRANSPORT:'disabled',MIR_TEAM_HELP_EMAIL:'frederickmessely@gmail.com'};
Deno.serve(createTeamInvitationService({env:{get:(key:string)=>testOnly[key as keyof typeof testOnly]??Deno.env.get(key)}}));
