-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_opp_amount_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_opp_amount_event (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    application_id uuid NOT NULL,
    opportunity_id uuid NOT NULL,
    quotation_id uuid,
    old_amount numeric(18,2),
    new_amount numeric(18,2),
    opportunity_version integer NOT NULL,
    actor_id character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sd_opp_amount_event sd_opp_amount_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_amount_event
    ADD CONSTRAINT sd_opp_amount_event_pkey PRIMARY KEY (id);


--
-- Name: sd_opp_amount_event_opportunity_id_opportunity_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_opp_amount_event_opportunity_id_opportunity_version_key ON public.sd_opp_amount_event USING btree (opportunity_id, opportunity_version);


--
-- Name: sd_opp_amount_event sd_amount_opp_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_amount_event
    ADD CONSTRAINT sd_amount_opp_fk FOREIGN KEY (opportunity_id, tenant_id, application_id) REFERENCES public.sd_opp(id, tenant_id, application_id) ON DELETE RESTRICT;


--
-- Name: sd_opp_amount_event sd_amount_quote_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_amount_event
    ADD CONSTRAINT sd_amount_quote_fk FOREIGN KEY (quotation_id, tenant_id, application_id) REFERENCES public.sd_quotation(id, tenant_id, application_id) ON DELETE RESTRICT;


