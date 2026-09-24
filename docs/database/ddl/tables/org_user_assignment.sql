-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: org_user_assignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_user_assignment (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    org_unit_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT org_user_assignment_check CHECK (((expires_at IS NULL) OR (expires_at > effective_at))),
    CONSTRAINT org_user_assignment_version_check CHECK ((version > 0))
);


--
-- Name: org_user_assignment org_user_assignment_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_user_assignment
    ADD CONSTRAINT org_user_assignment_period_key UNIQUE (org_unit_id, user_id, effective_at);


--
-- Name: org_user_assignment org_user_assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_user_assignment
    ADD CONSTRAINT org_user_assignment_pkey PRIMARY KEY (id);


--
-- Name: org_user_assignment_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_user_assignment_active_idx ON public.org_user_assignment USING btree (user_id, status, effective_at, expires_at);


--
-- Name: org_user_assignment org_user_assignment_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_user_assignment
    ADD CONSTRAINT org_user_assignment_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_user_assignment org_user_assignment_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_user_assignment
    ADD CONSTRAINT org_user_assignment_org_fk FOREIGN KEY (org_unit_id, tenant_id) REFERENCES public.org_unit(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_user_assignment org_user_assignment_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_user_assignment
    ADD CONSTRAINT org_user_assignment_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_user_assignment org_user_assignment_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_user_assignment
    ADD CONSTRAINT org_user_assignment_user_fk FOREIGN KEY (user_id, tenant_id) REFERENCES public.sys_user(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


