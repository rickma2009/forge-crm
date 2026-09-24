-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: org_unit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_unit (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    parent_id uuid,
    unit_code character varying(64) NOT NULL,
    unit_name character varying(128) NOT NULL,
    unit_type public."OrgUnitType" NOT NULL,
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    remark character varying(500),
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT org_unit_not_self_parent_check CHECK (((parent_id IS NULL) OR (parent_id <> id))),
    CONSTRAINT org_unit_period_check CHECK (((expires_at IS NULL) OR (expires_at > effective_at)))
);


--
-- Name: org_unit org_unit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_unit
    ADD CONSTRAINT org_unit_pkey PRIMARY KEY (id);


--
-- Name: org_unit_id_tenant_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX org_unit_id_tenant_key ON public.org_unit USING btree (id, tenant_id);


--
-- Name: org_unit_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_unit_status_idx ON public.org_unit USING btree (tenant_id, status);


--
-- Name: org_unit_tenant_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX org_unit_tenant_code_key ON public.org_unit USING btree (tenant_id, unit_code);


--
-- Name: org_unit_tree_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_unit_tree_idx ON public.org_unit USING btree (tenant_id, parent_id, sort_no);


--
-- Name: org_unit org_unit_parent_id_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_unit
    ADD CONSTRAINT org_unit_parent_id_tenant_id_fkey FOREIGN KEY (parent_id, tenant_id) REFERENCES public.org_unit(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_unit org_unit_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_unit
    ADD CONSTRAINT org_unit_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


