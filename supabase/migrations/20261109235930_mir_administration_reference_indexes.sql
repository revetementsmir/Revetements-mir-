begin;
-- Cover the foreign keys introduced by the administration/estimate modules.
create index mir_admin_events_actor on mir_core.admin_events(actor_id);
create index mir_portal_operations_actor on mir_core.portal_operations(actor_id);
create index mir_staff_profiles_user on mir_core.staff_profiles(user_id);
create index mir_staff_jobs_by_job on mir_core.staff_job_assignments(organization_id,job_id);
create index mir_job_documents_author on mir_core.job_documents(created_by);
create index mir_estimate_followups_request on mir_core.estimate_followups(estimate_id);
create index mir_estimate_followups_owner on mir_core.estimate_followups(owner_id);
create index mir_coordination_responsible on mir_core.coordination_routes(responsible_id);
create index mir_estimates_requests_org on mir_estimates.requests(organization_id);
create index mir_estimates_settings_org on mir_estimates.settings(organization_id);
create index mir_coordination_expected on mir_core.coordination_routes(organization_id,expected_date) where route='supplier' and delivered_qty<quantity;
commit;
