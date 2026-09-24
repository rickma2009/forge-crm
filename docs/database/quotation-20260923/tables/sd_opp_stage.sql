-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_opp_stage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_opp_stage (
    id uuid NOT NULL,
    template_id uuid NOT NULL,
    stage_code character varying(32) NOT NULL,
    stage_name character varying(128) NOT NULL,
    probability integer NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sd_opp_stage_probability_check CHECK (((probability >= 0) AND (probability <= 100))),
    CONSTRAINT sd_opp_stage_version_check CHECK ((version > 0))
);


--
-- Name: sd_opp_stage sd_opp_stage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_stage
    ADD CONSTRAINT sd_opp_stage_pkey PRIMARY KEY (id);


--
-- Name: sd_opp_stage_default_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_opp_stage_default_key ON public.sd_opp_stage USING btree (template_id) WHERE ((is_default = true) AND (status = 'ACTIVE'::public."RecordStatus"));


--
-- Name: sd_opp_stage_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_opp_stage_lookup_idx ON public.sd_opp_stage USING btree (template_id, status, sort_no);


--
-- Name: sd_opp_stage_template_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_opp_stage_template_code_key ON public.sd_opp_stage USING btree (template_id, stage_code);


--
-- Name: sd_opp_stage sd_opp_stage_template_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_stage
    ADD CONSTRAINT sd_opp_stage_template_fkey FOREIGN KEY (template_id) REFERENCES public.sd_opp_template(id) ON UPDATE CASCADE ON DELETE RESTRICT;


