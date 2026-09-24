-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_role_data_policy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_data_policy (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    role_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    action_code character varying(32) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    published_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_role_data_policy_action_code_check CHECK (((action_code)::text = ANY ((ARRAY['read'::character varying, 'create'::character varying, 'update'::character varying])::text[]))),
    CONSTRAINT sys_role_data_policy_version_check CHECK ((version > 0))
);


--
-- Name: sys_role_data_policy sys_role_data_policy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_policy
    ADD CONSTRAINT sys_role_data_policy_pkey PRIMARY KEY (id);


--
-- Name: sys_role_data_policy sys_role_data_policy_resource_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_policy
    ADD CONSTRAINT sys_role_data_policy_resource_key UNIQUE (id, resource_id);


--
-- Name: sys_role_data_policy sys_role_data_policy_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_policy
    ADD CONSTRAINT sys_role_data_policy_scope_key UNIQUE (role_id, resource_id, action_code);


--
-- Name: sys_role_data_policy sys_role_data_policy_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_policy
    ADD CONSTRAINT sys_role_data_policy_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_role_data_policy sys_role_data_policy_resource_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_policy
    ADD CONSTRAINT sys_role_data_policy_resource_fk FOREIGN KEY (resource_id, application_id) REFERENCES public.sys_authorization_resource(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_data_policy sys_role_data_policy_role_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_policy
    ADD CONSTRAINT sys_role_data_policy_role_fk FOREIGN KEY (role_id, application_id) REFERENCES public.sys_role(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


