-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_page_button; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_page_button (
    id uuid NOT NULL,
    page_id uuid NOT NULL,
    button_code character varying(128) NOT NULL,
    button_name character varying(128) NOT NULL,
    button_type public."ResourceButtonType" NOT NULL,
    icon_key character varying(64),
    event_name character varying(128),
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    remark character varying(1000),
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_page_button_version_check CHECK ((version > 0))
);


--
-- Name: sys_page_button sys_page_button_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_button
    ADD CONSTRAINT sys_page_button_pkey PRIMARY KEY (id);


--
-- Name: sys_page_button_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_page_button_lookup_idx ON public.sys_page_button USING btree (page_id, status, sort_no);


--
-- Name: sys_page_button_page_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_page_button_page_code_key ON public.sys_page_button USING btree (page_id, button_code);


--
-- Name: sys_page_button sys_page_button_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_button
    ADD CONSTRAINT sys_page_button_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.sys_page_resource(id) ON UPDATE CASCADE ON DELETE RESTRICT;


