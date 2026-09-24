-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: crm_customer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_customer (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    customer_code character varying(20) NOT NULL,
    customer_name character varying(255) NOT NULL,
    short_name character varying(100) NOT NULL,
    category_value character varying(128) NOT NULL,
    address character varying(500),
    status_value character varying(128) NOT NULL,
    industry_value character varying(128),
    level_value character varying(128),
    sales_owner_key character varying(128),
    sales_owner_name character varying(128),
    remark character varying(1000),
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT crm_customer_code_check CHECK (((customer_code)::text ~ '^C[0-9]{10}$'::text)),
    CONSTRAINT crm_customer_version_check CHECK ((version > 0))
);


--
-- Name: crm_customer crm_customer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_customer
    ADD CONSTRAINT crm_customer_pkey PRIMARY KEY (id);


--
-- Name: crm_customer_list_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_customer_list_idx ON public.crm_customer USING btree (system_code, status_value, category_value, updated_at DESC);


--
-- Name: crm_customer_quote_scope_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX crm_customer_quote_scope_key ON public.crm_customer USING btree (id, system_code);


--
-- Name: crm_customer_system_code_customer_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX crm_customer_system_code_customer_code_key ON public.crm_customer USING btree (system_code, customer_code);


--
-- Name: crm_customer_system_code_customer_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX crm_customer_system_code_customer_name_key ON public.crm_customer USING btree (system_code, customer_name);


