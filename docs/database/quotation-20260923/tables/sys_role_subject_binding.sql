-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_role_subject_binding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_subject_binding (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    role_id uuid NOT NULL,
    org_unit_id uuid,
    group_id uuid,
    include_descendants boolean DEFAULT false NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_role_subject_binding_check CHECK (((expires_at IS NULL) OR (expires_at > effective_at))),
    CONSTRAINT sys_role_subject_binding_version_check CHECK ((version > 0)),
    CONSTRAINT sys_role_subject_descendants_check CHECK (((group_id IS NULL) OR (NOT include_descendants))),
    CONSTRAINT sys_role_subject_one_kind CHECK (((((org_unit_id IS NOT NULL))::integer + ((group_id IS NOT NULL))::integer) = 1))
);


--
-- Name: sys_role_subject_binding sys_role_subject_binding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_binding_pkey PRIMARY KEY (id);


--
-- Name: sys_role_subject_binding sys_role_subject_group_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_group_period_key UNIQUE (role_id, group_id, effective_at);


--
-- Name: sys_role_subject_binding sys_role_subject_org_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_org_period_key UNIQUE (role_id, org_unit_id, effective_at);


--
-- Name: sys_role_subject_binding_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_role_subject_binding_active_idx ON public.sys_role_subject_binding USING btree (application_id, status, effective_at, expires_at);


--
-- Name: sys_role_subject_binding sys_role_subject_binding_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_binding_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_role_subject_binding sys_role_subject_binding_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_binding_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_role_subject_binding sys_role_subject_group_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_group_fk FOREIGN KEY (group_id, application_id, tenant_id) REFERENCES public.sys_user_group(id, application_id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_subject_binding sys_role_subject_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_org_fk FOREIGN KEY (org_unit_id, tenant_id) REFERENCES public.org_unit(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_subject_binding sys_role_subject_role_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_role_fk FOREIGN KEY (role_id, application_id, tenant_id) REFERENCES public.sys_role(id, application_id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


