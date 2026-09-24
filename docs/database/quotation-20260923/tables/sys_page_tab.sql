-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_page_tab; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_page_tab (
    id uuid NOT NULL,
    page_id uuid NOT NULL,
    target_page_id uuid NOT NULL,
    tab_name character varying(80) NOT NULL,
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    remark character varying(300),
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    application_id uuid NOT NULL,
    CONSTRAINT sys_page_tab_not_self_check CHECK ((page_id <> target_page_id)),
    CONSTRAINT sys_page_tab_version_check CHECK ((version > 0))
);


--
-- Name: sys_page_tab sys_page_tab_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_tab
    ADD CONSTRAINT sys_page_tab_pkey PRIMARY KEY (id);


--
-- Name: sys_page_tab_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_page_tab_lookup_idx ON public.sys_page_tab USING btree (page_id, status, sort_no);


--
-- Name: sys_page_tab_page_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_page_tab_page_name_key ON public.sys_page_tab USING btree (page_id, tab_name);


--
-- Name: sys_page_tab_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_page_tab_target_idx ON public.sys_page_tab USING btree (target_page_id);


--
-- Name: sys_page_tab sys_page_tab_page_application_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_tab
    ADD CONSTRAINT sys_page_tab_page_application_fkey FOREIGN KEY (page_id, application_id) REFERENCES public.sys_page_resource(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_page_tab sys_page_tab_target_application_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_tab
    ADD CONSTRAINT sys_page_tab_target_application_fkey FOREIGN KEY (target_page_id, application_id) REFERENCES public.sys_page_resource(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


