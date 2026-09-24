-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_user_group_member; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_user_group_member (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_user_group_member_check CHECK (((expires_at IS NULL) OR (expires_at > effective_at))),
    CONSTRAINT sys_user_group_member_version_check CHECK ((version > 0))
);


--
-- Name: sys_user_group_member sys_user_group_member_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group_member
    ADD CONSTRAINT sys_user_group_member_period_key UNIQUE (group_id, user_id, effective_at);


--
-- Name: sys_user_group_member sys_user_group_member_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group_member
    ADD CONSTRAINT sys_user_group_member_pkey PRIMARY KEY (id);


--
-- Name: sys_user_group_member_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_user_group_member_active_idx ON public.sys_user_group_member USING btree (user_id, application_id, status);


--
-- Name: sys_user_group_member sys_user_group_member_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group_member
    ADD CONSTRAINT sys_user_group_member_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_user_group_member sys_user_group_member_group_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group_member
    ADD CONSTRAINT sys_user_group_member_group_fk FOREIGN KEY (group_id, application_id, tenant_id) REFERENCES public.sys_user_group(id, application_id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_user_group_member sys_user_group_member_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group_member
    ADD CONSTRAINT sys_user_group_member_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_user_group_member sys_user_group_member_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group_member
    ADD CONSTRAINT sys_user_group_member_user_fk FOREIGN KEY (user_id, tenant_id) REFERENCES public.sys_user(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


