-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_opp_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_opp_analysis (
    id uuid NOT NULL,
    opportunity_id uuid NOT NULL,
    opportunity_name character varying(200) NOT NULL,
    stage_id uuid NOT NULL,
    stage_name character varying(128) NOT NULL,
    stage_probability integer NOT NULL,
    confidence integer NOT NULL,
    opportunity_point character varying(2000) NOT NULL,
    risk character varying(2000) NOT NULL,
    next_plan character varying(2000) NOT NULL,
    remark character varying(1000),
    analyst_user_id uuid NOT NULL,
    analyst_name character varying(128) NOT NULL,
    analyzed_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sd_opp_analysis_conf_check CHECK (((confidence >= 0) AND (confidence <= 100))),
    CONSTRAINT sd_opp_analysis_prob_check CHECK (((stage_probability >= 0) AND (stage_probability <= 100)))
);


--
-- Name: sd_opp_analysis sd_opp_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_analysis
    ADD CONSTRAINT sd_opp_analysis_pkey PRIMARY KEY (id);


--
-- Name: sd_opp_analysis_list_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_opp_analysis_list_idx ON public.sd_opp_analysis USING btree (opportunity_id, analyzed_at DESC);


--
-- Name: sd_opp_analysis sd_opp_analysis_opp_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_analysis
    ADD CONSTRAINT sd_opp_analysis_opp_fkey FOREIGN KEY (opportunity_id) REFERENCES public.sd_opp(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sd_opp_analysis sd_opp_analysis_stage_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_analysis
    ADD CONSTRAINT sd_opp_analysis_stage_fkey FOREIGN KEY (stage_id) REFERENCES public.sd_opp_stage(id) ON UPDATE CASCADE ON DELETE RESTRICT;


