-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    role_code character varying(64) NOT NULL,
    role_name character varying(128) NOT NULL,
    role_type public."RoleType" NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    description character varying(512),
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    tenant_id uuid,
    application_id uuid,
    role_group_id uuid,
    effective_date_begin timestamp(3) with time zone,
    effective_date_end timestamp(3) with time zone,
    is_enabled boolean DEFAULT true NOT NULL,
    parent_id uuid,
    role_abbr_name character varying(64),
    sort_no integer DEFAULT 0 NOT NULL,
    archived_at timestamp(3) with time zone,
    CONSTRAINT iam_role_code_format_check CHECK (((role_code)::text ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'::text)),
    CONSTRAINT iam_role_system_code_format_check CHECK (((system_code)::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
    CONSTRAINT iam_role_system_shape_check CHECK (((is_system AND (role_type = 'SYSTEM'::public."RoleType")) OR ((NOT is_system) AND (role_type = 'BUSINESS'::public."RoleType")))),
    CONSTRAINT iam_role_version_check CHECK ((version > 0)),
    CONSTRAINT sys_role_effective_period_check CHECK (((effective_date_begin IS NULL) OR (effective_date_end IS NULL) OR (effective_date_begin < effective_date_end))),
    CONSTRAINT sys_role_not_own_parent_check CHECK (((parent_id IS NULL) OR (parent_id <> id)))
);


--
-- Name: sys_role sys_role_id_application_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role
    ADD CONSTRAINT sys_role_id_application_tenant_key UNIQUE (id, application_id, tenant_id);


--
-- Name: sys_role sys_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role
    ADD CONSTRAINT sys_role_pkey PRIMARY KEY (id);


--
-- Name: iam_role_id_system_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX iam_role_id_system_code_key ON public.sys_role USING btree (id, system_code);


--
-- Name: iam_role_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX iam_role_lookup_idx ON public.sys_role USING btree (system_code, status);


--
-- Name: iam_role_one_system_manager_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX iam_role_one_system_manager_key ON public.sys_role USING btree (system_code) WHERE (is_system = true);


--
-- Name: iam_role_system_code_role_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX iam_role_system_code_role_code_key ON public.sys_role USING btree (system_code, role_code);


--
-- Name: sys_role_id_application_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_role_id_application_key ON public.sys_role USING btree (id, application_id);


--
-- Name: sys_role_tree_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_role_tree_idx ON public.sys_role USING btree (parent_id, sort_no);


--
-- Name: sys_role sys_role_parent_application_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role
    ADD CONSTRAINT sys_role_parent_application_fkey FOREIGN KEY (parent_id, application_id) REFERENCES public.sys_role(id, application_id) ON DELETE RESTRICT;


--
-- Name: sys_role sys_role_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role
    ADD CONSTRAINT sys_role_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.sys_role(id) ON UPDATE CASCADE ON DELETE RESTRICT;


