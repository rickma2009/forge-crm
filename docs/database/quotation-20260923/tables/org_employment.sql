-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: org_employment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_employment (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    employee_no character varying(64) NOT NULL,
    employment_type character varying(32) DEFAULT 'FULL_TIME'::character varying NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT org_employment_period_check CHECK (((expires_at IS NULL) OR (expires_at > effective_at))),
    CONSTRAINT org_employment_version_check CHECK ((version > 0))
);


--
-- Name: org_employment org_employment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employment
    ADD CONSTRAINT org_employment_pkey PRIMARY KEY (id);


--
-- Name: org_employment org_employment_tenant_employee_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employment
    ADD CONSTRAINT org_employment_tenant_employee_no_key UNIQUE (tenant_id, employee_no);


--
-- Name: org_employment_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_employment_active_idx ON public.org_employment USING btree (employee_id, status, effective_at, expires_at);


--
-- Name: org_employment org_employment_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employment
    ADD CONSTRAINT org_employment_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_employment org_employment_employee_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employment
    ADD CONSTRAINT org_employment_employee_fk FOREIGN KEY (employee_id, tenant_id) REFERENCES public.org_employee(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_employment org_employment_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employment
    ADD CONSTRAINT org_employment_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


