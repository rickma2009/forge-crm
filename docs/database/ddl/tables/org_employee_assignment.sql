-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: org_employee_assignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_employee_assignment (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    org_unit_id uuid NOT NULL,
    position_id uuid NOT NULL,
    position_name_snapshot character varying(128) NOT NULL,
    assignment_type character varying(32) DEFAULT 'PRIMARY'::character varying NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT org_employee_assignment_period_check CHECK (((expires_at IS NULL) OR (expires_at > effective_at))),
    CONSTRAINT org_employee_assignment_version_check CHECK ((version > 0))
);


--
-- Name: org_employee_assignment org_employee_assignment_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_period_key UNIQUE (employee_id, org_unit_id, position_id, effective_at);


--
-- Name: org_employee_assignment org_employee_assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_pkey PRIMARY KEY (id);


--
-- Name: org_employee_assignment_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_employee_assignment_active_idx ON public.org_employee_assignment USING btree (employee_id, status, effective_at, expires_at);


--
-- Name: org_employee_assignment_open_primary_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX org_employee_assignment_open_primary_key ON public.org_employee_assignment USING btree (employee_id) WHERE ((is_primary = true) AND (status = 'ACTIVE'::public."RecordStatus") AND (expires_at IS NULL));


--
-- Name: org_employee_assignment_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_employee_assignment_org_idx ON public.org_employee_assignment USING btree (org_unit_id, status);


--
-- Name: org_employee_assignment org_employee_assignment_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_employee_assignment org_employee_assignment_employee_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_employee_fk FOREIGN KEY (employee_id, tenant_id) REFERENCES public.org_employee(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_employee_assignment org_employee_assignment_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_org_fk FOREIGN KEY (org_unit_id, tenant_id) REFERENCES public.org_unit(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_employee_assignment org_employee_assignment_position_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_position_fk FOREIGN KEY (position_id, tenant_id) REFERENCES public.org_position(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_employee_assignment org_employee_assignment_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


