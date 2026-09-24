-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_role_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_user (
    role_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    granted_by uuid,
    ended_by uuid,
    ended_at timestamp(3) with time zone,
    CONSTRAINT iam_role_user_period_check CHECK (((effective_at IS NULL) OR (expires_at IS NULL) OR (effective_at < expires_at)))
);


--
-- Name: sys_role_user sys_role_user_no_overlap; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_user
    ADD CONSTRAINT sys_role_user_no_overlap EXCLUDE USING gist (role_id WITH =, user_id WITH =, tstzrange(effective_at, expires_at, '[)'::text) WITH &&) WHERE ((status = 'ACTIVE'::public."RecordStatus"));


--
-- Name: sys_role_user sys_role_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_user
    ADD CONSTRAINT sys_role_user_pkey PRIMARY KEY (id);


--
-- Name: iam_role_user_effective_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX iam_role_user_effective_idx ON public.sys_role_user USING btree (user_id, status, effective_at, expires_at);


--
-- Name: sys_role_user_period_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_role_user_period_key ON public.sys_role_user USING btree (role_id, user_id, effective_at);


--
-- Name: sys_role_user sys_role_user_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_user
    ADD CONSTRAINT sys_role_user_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.sys_role(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_user sys_role_user_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_user
    ADD CONSTRAINT sys_role_user_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.sys_user(id) ON UPDATE CASCADE ON DELETE RESTRICT;


