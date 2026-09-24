-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_quote_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_quote_event (
    id uuid NOT NULL,
    quotation_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    application_id uuid NOT NULL,
    action character varying(32) NOT NULL,
    request_key uuid NOT NULL,
    request_hash character varying(64) NOT NULL,
    actor_id uuid NOT NULL,
    note character varying(2000) DEFAULT ''::character varying NOT NULL,
    result jsonb NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sd_quote_event sd_quote_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_quote_event
    ADD CONSTRAINT sd_quote_event_pkey PRIMARY KEY (id);


--
-- Name: sd_quote_event_application_id_actor_id_request_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_quote_event_application_id_actor_id_request_key_key ON public.sd_quote_event USING btree (application_id, actor_id, request_key);


--
-- Name: sd_quote_event_quotation_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_quote_event_quotation_id_created_at_idx ON public.sd_quote_event USING btree (quotation_id, created_at);


--
-- Name: sd_quote_event sd_quote_event_quotation_id_tenant_id_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_quote_event
    ADD CONSTRAINT sd_quote_event_quotation_id_tenant_id_application_id_fkey FOREIGN KEY (quotation_id, tenant_id, application_id) REFERENCES public.sd_quotation(id, tenant_id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


