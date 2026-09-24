-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_policy_revision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_policy_revision (
    id uuid NOT NULL,
    policy_id uuid NOT NULL,
    version integer NOT NULL,
    snapshot jsonb NOT NULL,
    summary character varying(500) NOT NULL,
    published_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sys_policy_revision_version_check CHECK ((version > 0))
);


--
-- Name: sys_policy_revision sys_policy_revision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_policy_revision
    ADD CONSTRAINT sys_policy_revision_pkey PRIMARY KEY (id);


--
-- Name: sys_policy_revision sys_policy_revision_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_policy_revision
    ADD CONSTRAINT sys_policy_revision_version_key UNIQUE (policy_id, version);


--
-- Name: sys_policy_revision sys_policy_revision_policy_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_policy_revision
    ADD CONSTRAINT sys_policy_revision_policy_fk FOREIGN KEY (policy_id) REFERENCES public.sys_role_data_policy(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_policy_revision sys_policy_revision_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_policy_revision
    ADD CONSTRAINT sys_policy_revision_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


