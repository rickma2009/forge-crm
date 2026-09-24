-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_role_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_permission (
    id uuid NOT NULL,
    role_id uuid NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    permission_id uuid NOT NULL,
    application_id uuid NOT NULL,
    granted_by uuid,
    revoked_by uuid,
    revoked_at timestamp(3) with time zone,
    CONSTRAINT iam_role_permission_version_check CHECK ((version > 0))
);


--
-- Name: sys_role_permission sys_role_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_permission
    ADD CONSTRAINT sys_role_permission_pkey PRIMARY KEY (id);


--
-- Name: sys_role_permission_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_role_permission_role_idx ON public.sys_role_permission USING btree (role_id, status);


--
-- Name: sys_role_permission_role_permission_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_role_permission_role_permission_key ON public.sys_role_permission USING btree (role_id, permission_id);


--
-- Name: sys_role_permission sys_role_permission_permission_id_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_permission
    ADD CONSTRAINT sys_role_permission_permission_id_application_id_fkey FOREIGN KEY (permission_id, application_id) REFERENCES public.sys_permission(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_permission sys_role_permission_role_id_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_permission
    ADD CONSTRAINT sys_role_permission_role_id_application_id_fkey FOREIGN KEY (role_id, application_id) REFERENCES public.sys_role(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


