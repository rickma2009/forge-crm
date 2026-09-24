-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_opp_analysis_competitor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_opp_analysis_competitor (
    id uuid NOT NULL,
    analysis_id uuid NOT NULL,
    competitor_id uuid NOT NULL,
    competitor_name character varying(128) NOT NULL,
    rank integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sd_opp_analysis_rank_check CHECK (((rank >= 1) AND (rank <= 2)))
);


--
-- Name: sd_opp_analysis_competitor sd_opp_analysis_comp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_analysis_competitor
    ADD CONSTRAINT sd_opp_analysis_comp_pkey PRIMARY KEY (id);


--
-- Name: sd_opp_analysis_comp_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_opp_analysis_comp_key ON public.sd_opp_analysis_competitor USING btree (analysis_id, competitor_id);


--
-- Name: sd_opp_analysis_rank_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_opp_analysis_rank_key ON public.sd_opp_analysis_competitor USING btree (analysis_id, rank);


--
-- Name: sd_opp_analysis_competitor sd_opp_analysis_competitor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_analysis_competitor
    ADD CONSTRAINT sd_opp_analysis_competitor_fkey FOREIGN KEY (competitor_id) REFERENCES public.sd_competitor(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sd_opp_analysis_competitor sd_opp_analysis_ref_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_analysis_competitor
    ADD CONSTRAINT sd_opp_analysis_ref_fkey FOREIGN KEY (analysis_id) REFERENCES public.sd_opp_analysis(id) ON UPDATE CASCADE ON DELETE CASCADE;


