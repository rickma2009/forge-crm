-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_opp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_opp (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    application_id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    opportunity_code character varying(32) NOT NULL,
    opportunity_name character varying(200) NOT NULL,
    customer_id uuid NOT NULL,
    customer_name character varying(255) NOT NULL,
    contact_id uuid,
    contact_name character varying(100),
    owner_user_id uuid NOT NULL,
    owner_name character varying(128) NOT NULL,
    source character varying(128),
    template_id uuid NOT NULL,
    template_name character varying(128) NOT NULL,
    stage_id uuid NOT NULL,
    stage_name character varying(128) NOT NULL,
    stage_probability integer NOT NULL,
    confidence integer DEFAULT 0 NOT NULL,
    confirmed_date date,
    expected_sign_date date,
    customer_budget numeric(18,2),
    expected_amount numeric(18,2),
    partner character varying(200),
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    remark character varying(1000),
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sd_opp_confidence_check CHECK (((confidence >= 0) AND (confidence <= 100))),
    CONSTRAINT sd_opp_stage_probability_check CHECK (((stage_probability >= 0) AND (stage_probability <= 100))),
    CONSTRAINT sd_opp_version_check CHECK ((version > 0))
);


--
-- Name: sd_opp sd_opp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp
    ADD CONSTRAINT sd_opp_pkey PRIMARY KEY (id);


--
-- Name: sd_opp_amount_scope_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_opp_amount_scope_key ON public.sd_opp USING btree (id, tenant_id, application_id);


--
-- Name: sd_opp_app_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_opp_app_code_key ON public.sd_opp USING btree (application_id, opportunity_code);


--
-- Name: sd_opp_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_opp_customer_idx ON public.sd_opp USING btree (customer_id);


--
-- Name: sd_opp_list_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_opp_list_idx ON public.sd_opp USING btree (application_id, status, updated_at DESC);


--
-- Name: sd_opp_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_opp_owner_idx ON public.sd_opp USING btree (owner_user_id);


--
-- Name: sd_opp_quote_scope_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_opp_quote_scope_key ON public.sd_opp USING btree (id, tenant_id, application_id, customer_id);


--
-- Name: sd_opp sd_opp_app_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp
    ADD CONSTRAINT sd_opp_app_fkey FOREIGN KEY (application_id, tenant_id) REFERENCES public.sys_application(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sd_opp sd_opp_contact_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp
    ADD CONSTRAINT sd_opp_contact_fkey FOREIGN KEY (contact_id) REFERENCES public.crm_customer_contact(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sd_opp sd_opp_customer_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp
    ADD CONSTRAINT sd_opp_customer_fkey FOREIGN KEY (customer_id) REFERENCES public.crm_customer(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sd_opp sd_opp_owner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp
    ADD CONSTRAINT sd_opp_owner_fkey FOREIGN KEY (owner_user_id, tenant_id) REFERENCES public.sys_user(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sd_opp sd_opp_stage_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp
    ADD CONSTRAINT sd_opp_stage_fkey FOREIGN KEY (stage_id) REFERENCES public.sd_opp_stage(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sd_opp sd_opp_template_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp
    ADD CONSTRAINT sd_opp_template_fkey FOREIGN KEY (template_id) REFERENCES public.sd_opp_template(id) ON UPDATE CASCADE ON DELETE RESTRICT;


