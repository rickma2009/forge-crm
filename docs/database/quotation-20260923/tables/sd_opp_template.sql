-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_opp_template; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_opp_template (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    application_id uuid NOT NULL,
    template_code character varying(32) NOT NULL,
    template_name character varying(128) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sd_opp_template_version_check CHECK ((version > 0))
);


--
-- Name: sd_opp_template sd_opp_template_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_template
    ADD CONSTRAINT sd_opp_template_pkey PRIMARY KEY (id);


--
-- Name: sd_opp_template_app_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_opp_template_app_code_key ON public.sd_opp_template USING btree (application_id, template_code);


--
-- Name: sd_opp_template_default_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_opp_template_default_key ON public.sd_opp_template USING btree (application_id) WHERE ((is_default = true) AND (status = 'ACTIVE'::public."RecordStatus"));


--
-- Name: sd_opp_template_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_opp_template_lookup_idx ON public.sd_opp_template USING btree (application_id, status);


--
-- Name: sd_opp_template sd_opp_template_app_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_template
    ADD CONSTRAINT sd_opp_template_app_fkey FOREIGN KEY (application_id, tenant_id) REFERENCES public.sys_application(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


