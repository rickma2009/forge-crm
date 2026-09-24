-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_audit_log (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    application_id uuid NOT NULL,
    actor_user_id uuid,
    action_code character varying(128) NOT NULL,
    resource_type character varying(64) NOT NULL,
    resource_id character varying(128),
    before_snapshot jsonb,
    after_snapshot jsonb,
    request_id character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sys_audit_log sys_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_audit_log
    ADD CONSTRAINT sys_audit_log_pkey PRIMARY KEY (id);


--
-- Name: sys_audit_log_actor_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_audit_log_actor_time_idx ON public.sys_audit_log USING btree (actor_user_id, created_at DESC);


--
-- Name: sys_audit_log_application_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_audit_log_application_time_idx ON public.sys_audit_log USING btree (application_id, created_at DESC);


