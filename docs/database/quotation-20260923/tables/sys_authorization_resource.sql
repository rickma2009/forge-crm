-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_authorization_resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_authorization_resource (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    resource_code character varying(128) NOT NULL,
    resource_name character varying(128) NOT NULL,
    binding_key character varying(128) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_authorization_resource_version_check CHECK ((version > 0))
);


--
-- Name: sys_authorization_resource sys_auth_resource_binding_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_auth_resource_binding_key UNIQUE (application_id, binding_key);


--
-- Name: sys_authorization_resource sys_auth_resource_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_auth_resource_code_key UNIQUE (application_id, resource_code);


--
-- Name: sys_authorization_resource sys_auth_resource_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_auth_resource_scope_key UNIQUE (id, application_id);


--
-- Name: sys_authorization_resource sys_authorization_resource_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_authorization_resource_pkey PRIMARY KEY (id);


--
-- Name: sys_authorization_resource sys_auth_resource_app_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_auth_resource_app_fk FOREIGN KEY (application_id) REFERENCES public.sys_application(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_authorization_resource sys_authorization_resource_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_authorization_resource_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_authorization_resource sys_authorization_resource_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_authorization_resource_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


