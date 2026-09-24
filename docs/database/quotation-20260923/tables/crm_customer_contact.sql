-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: crm_customer_contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_customer_contact (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    customer_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    department character varying(128),
    "position" character varying(128),
    decision_role character varying(64),
    mobile character varying(32),
    phone character varying(32),
    email character varying(128),
    status character varying(32) DEFAULT 'ACTIVE'::character varying NOT NULL,
    remark character varying(500),
    "sortNo" integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL
);


--
-- Name: crm_customer_contact crm_customer_contact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_customer_contact
    ADD CONSTRAINT crm_customer_contact_pkey PRIMARY KEY (id);


--
-- Name: crm_contact_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_contact_customer_idx ON public.crm_customer_contact USING btree (system_code, customer_id);


--
-- Name: crm_contact_quote_scope_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX crm_contact_quote_scope_key ON public.crm_customer_contact USING btree (id, customer_id, system_code);


--
-- Name: crm_customer_contact crm_customer_contact_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_customer_contact
    ADD CONSTRAINT crm_customer_contact_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.crm_customer(id) ON UPDATE CASCADE ON DELETE CASCADE;


