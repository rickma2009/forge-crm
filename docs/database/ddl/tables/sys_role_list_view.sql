-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_role_list_view; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_list_view (
    role_id uuid NOT NULL,
    view_id uuid NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sys_role_list_view sys_role_list_view_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_list_view
    ADD CONSTRAINT sys_role_list_view_pkey PRIMARY KEY (role_id, view_id);


--
-- Name: iam_role_list_view_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX iam_role_list_view_lookup_idx ON public.sys_role_list_view USING btree (view_id, status);


--
-- Name: sys_role_list_view sys_role_list_view_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_list_view
    ADD CONSTRAINT sys_role_list_view_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.sys_role(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_list_view sys_role_list_view_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_list_view
    ADD CONSTRAINT sys_role_list_view_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.sys_system_list_view(id) ON UPDATE CASCADE ON DELETE RESTRICT;


