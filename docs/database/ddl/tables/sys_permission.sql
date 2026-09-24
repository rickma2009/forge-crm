-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_permission (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    permission_code character varying(160) NOT NULL,
    permission_name character varying(128) NOT NULL,
    resource_code character varying(128) NOT NULL,
    action_code character varying(64) NOT NULL,
    source public."PermissionSource" DEFAULT 'SYSTEM'::public."PermissionSource" NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL
);


--
-- Name: sys_permission sys_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_permission
    ADD CONSTRAINT sys_permission_pkey PRIMARY KEY (id);


--
-- Name: sys_permission_application_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_permission_application_code_key ON public.sys_permission USING btree (application_id, permission_code);


--
-- Name: sys_permission_id_application_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_permission_id_application_key ON public.sys_permission USING btree (id, application_id);


--
-- Name: sys_permission_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_permission_lookup_idx ON public.sys_permission USING btree (application_id, resource_code, status);


--
-- Name: sys_permission sys_permission_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_permission
    ADD CONSTRAINT sys_permission_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.sys_application(id) ON UPDATE CASCADE ON DELETE RESTRICT;


