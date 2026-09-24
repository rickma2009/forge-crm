-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_user_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_user_group (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    group_code character varying(64) NOT NULL,
    group_name character varying(128) NOT NULL,
    description character varying(500),
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_user_group_version_check CHECK ((version > 0))
);


--
-- Name: sys_user_group sys_user_group_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group
    ADD CONSTRAINT sys_user_group_code_key UNIQUE (application_id, group_code);


--
-- Name: sys_user_group sys_user_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group
    ADD CONSTRAINT sys_user_group_pkey PRIMARY KEY (id);


--
-- Name: sys_user_group sys_user_group_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group
    ADD CONSTRAINT sys_user_group_scope_key UNIQUE (id, application_id, tenant_id);


--
-- Name: sys_user_group sys_user_group_app_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group
    ADD CONSTRAINT sys_user_group_app_fk FOREIGN KEY (application_id, tenant_id) REFERENCES public.sys_application(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_user_group sys_user_group_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group
    ADD CONSTRAINT sys_user_group_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_user_group sys_user_group_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group
    ADD CONSTRAINT sys_user_group_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


