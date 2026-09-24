-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: org_position; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_position (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    position_code character varying(64) NOT NULL,
    position_name character varying(128) NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT org_position_version_check CHECK ((version > 0))
);


--
-- Name: org_position org_position_id_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_position
    ADD CONSTRAINT org_position_id_tenant_key UNIQUE (id, tenant_id);


--
-- Name: org_position org_position_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_position
    ADD CONSTRAINT org_position_pkey PRIMARY KEY (id);


--
-- Name: org_position org_position_tenant_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_position
    ADD CONSTRAINT org_position_tenant_code_key UNIQUE (tenant_id, position_code);


--
-- Name: org_position_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_position_lookup_idx ON public.org_position USING btree (tenant_id, status, position_name);


--
-- Name: org_position org_position_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_position
    ADD CONSTRAINT org_position_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_position org_position_tenant_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_position
    ADD CONSTRAINT org_position_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_position org_position_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_position
    ADD CONSTRAINT org_position_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


