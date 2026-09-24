-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: org_employee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_employee (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    employee_name character varying(128) NOT NULL,
    email character varying(256),
    mobile character varying(32),
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    remark character varying(500),
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT org_employee_version_check CHECK ((version > 0))
);


--
-- Name: org_employee org_employee_id_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee
    ADD CONSTRAINT org_employee_id_tenant_key UNIQUE (id, tenant_id);


--
-- Name: org_employee org_employee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee
    ADD CONSTRAINT org_employee_pkey PRIMARY KEY (id);


--
-- Name: org_employee_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_employee_lookup_idx ON public.org_employee USING btree (tenant_id, status, employee_name);


--
-- Name: org_employee org_employee_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee
    ADD CONSTRAINT org_employee_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_employee org_employee_tenant_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee
    ADD CONSTRAINT org_employee_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_employee org_employee_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee
    ADD CONSTRAINT org_employee_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


