-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_user (
    id uuid NOT NULL,
    account character varying(128) NOT NULL,
    normalized_account character varying(128) NOT NULL,
    display_name character varying(128) NOT NULL,
    auth_source character varying(32) DEFAULT 'LOCAL'::character varying NOT NULL,
    external_subject character varying(256),
    password_hash character varying(512),
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    user_type public."UserType" DEFAULT 'INTERNAL'::public."UserType" NOT NULL,
    tenant_id uuid,
    employee_id uuid,
    CONSTRAINT iam_user_auth_check CHECK (((((auth_source)::text = 'LOCAL'::text) AND (password_hash IS NOT NULL)) OR (((auth_source)::text <> 'LOCAL'::text) AND (external_subject IS NOT NULL)))),
    CONSTRAINT iam_user_version_check CHECK ((version > 0))
);


--
-- Name: sys_user sys_user_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_employee_id_key UNIQUE (employee_id);


--
-- Name: sys_user sys_user_employee_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_employee_tenant_key UNIQUE (employee_id, tenant_id);


--
-- Name: sys_user sys_user_id_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_id_tenant_key UNIQUE (id, tenant_id);


--
-- Name: sys_user sys_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_pkey PRIMARY KEY (id);


--
-- Name: iam_user_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX iam_user_status_idx ON public.sys_user USING btree (status);


--
-- Name: sys_user_quote_scope_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_user_quote_scope_key ON public.sys_user USING btree (id, tenant_id);


--
-- Name: sys_user_tenant_normalized_account_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_user_tenant_normalized_account_key ON public.sys_user USING btree (tenant_id, normalized_account);


--
-- Name: sys_user sys_user_employee_scope_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_employee_scope_fk FOREIGN KEY (employee_id, tenant_id) REFERENCES public.org_employee(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


