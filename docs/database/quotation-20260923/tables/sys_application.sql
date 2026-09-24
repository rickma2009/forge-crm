-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_application; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_application (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    application_code character varying(64) NOT NULL,
    application_name character varying(128) NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_application_version_check CHECK ((version > 0))
);


--
-- Name: sys_application sys_application_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_application
    ADD CONSTRAINT sys_application_pkey PRIMARY KEY (id);


--
-- Name: sys_app_quote_scope_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_app_quote_scope_key ON public.sys_application USING btree (id, tenant_id, application_code);


--
-- Name: sys_application_code_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_application_code_status_idx ON public.sys_application USING btree (application_code, status);


--
-- Name: sys_application_id_tenant_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_application_id_tenant_key ON public.sys_application USING btree (id, tenant_id);


--
-- Name: sys_application_tenant_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_application_tenant_code_key ON public.sys_application USING btree (tenant_id, application_code);


--
-- Name: sys_application sys_application_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_application
    ADD CONSTRAINT sys_application_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


