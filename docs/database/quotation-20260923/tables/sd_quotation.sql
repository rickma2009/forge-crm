-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_quotation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_quotation (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    application_id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    quote_code character varying(64) NOT NULL,
    title character varying(200) NOT NULL,
    customer_id uuid NOT NULL,
    customer_name character varying(255) NOT NULL,
    contact_id uuid,
    contact_name character varying(100),
    opportunity_id uuid,
    owner_user_id uuid NOT NULL,
    quote_date date NOT NULL,
    valid_until date NOT NULL,
    status character varying(16) DEFAULT 'DRAFT'::character varying NOT NULL,
    total numeric(18,2) DEFAULT 0 NOT NULL,
    terms character varying(8000) DEFAULT ''::character varying NOT NULL,
    remark character varying(2000) DEFAULT ''::character varying NOT NULL,
    source_quote_id uuid,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sd_quote_values_ck CHECK ((((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'ACCEPTED'::character varying, 'REJECTED'::character varying, 'EXPIRED'::character varying])::text[])) AND (total >= (0)::numeric) AND (version > 0) AND (valid_until >= quote_date)))
);


--
-- Name: sd_quotation sd_quotation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_quotation
    ADD CONSTRAINT sd_quotation_pkey PRIMARY KEY (id);


--
-- Name: sd_quotation_application_id_owner_user_id_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_quotation_application_id_owner_user_id_updated_at_idx ON public.sd_quotation USING btree (application_id, owner_user_id, updated_at);


--
-- Name: sd_quotation_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_quotation_customer_id_idx ON public.sd_quotation USING btree (customer_id);


--
-- Name: sd_quotation_id_tenant_id_application_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_quotation_id_tenant_id_application_id_key ON public.sd_quotation USING btree (id, tenant_id, application_id);


--
-- Name: sd_quotation_opportunity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_quotation_opportunity_id_idx ON public.sd_quotation USING btree (opportunity_id);


--
-- Name: sd_quotation_quote_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_quotation_quote_code_key ON public.sd_quotation USING btree (quote_code);


--
-- Name: sd_quotation_status_valid_until_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_quotation_status_valid_until_idx ON public.sd_quotation USING btree (status, valid_until);


--
-- Name: sd_quotation sd_quote_app_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_quotation
    ADD CONSTRAINT sd_quote_app_fk FOREIGN KEY (application_id, tenant_id, system_code) REFERENCES public.sys_application(id, tenant_id, application_code) ON DELETE RESTRICT;


--
-- Name: sd_quotation sd_quote_contact_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_quotation
    ADD CONSTRAINT sd_quote_contact_fk FOREIGN KEY (contact_id, customer_id, system_code) REFERENCES public.crm_customer_contact(id, customer_id, system_code) ON DELETE RESTRICT;


--
-- Name: sd_quotation sd_quote_customer_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_quotation
    ADD CONSTRAINT sd_quote_customer_fk FOREIGN KEY (customer_id, system_code) REFERENCES public.crm_customer(id, system_code) ON DELETE RESTRICT;


--
-- Name: sd_quotation sd_quote_opp_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_quotation
    ADD CONSTRAINT sd_quote_opp_fk FOREIGN KEY (opportunity_id, tenant_id, application_id, customer_id) REFERENCES public.sd_opp(id, tenant_id, application_id, customer_id) ON DELETE RESTRICT;


--
-- Name: sd_quotation sd_quote_owner_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_quotation
    ADD CONSTRAINT sd_quote_owner_fk FOREIGN KEY (owner_user_id, tenant_id) REFERENCES public.sys_user(id, tenant_id) ON DELETE RESTRICT;


--
-- Name: sd_quotation sd_quote_source_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_quotation
    ADD CONSTRAINT sd_quote_source_fk FOREIGN KEY (source_quote_id, tenant_id, application_id) REFERENCES public.sd_quotation(id, tenant_id, application_id) ON DELETE RESTRICT;


