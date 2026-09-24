-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: crm_customer_address; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_customer_address (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    customer_id uuid NOT NULL,
    address_type character varying(32) NOT NULL,
    recipient character varying(100),
    phone character varying(32),
    province character varying(64),
    city character varying(64),
    district character varying(64),
    detail character varying(500) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
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
-- Name: crm_customer_address crm_customer_address_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_customer_address
    ADD CONSTRAINT crm_customer_address_pkey PRIMARY KEY (id);


--
-- Name: crm_address_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_address_customer_idx ON public.crm_customer_address USING btree (system_code, customer_id);


--
-- Name: crm_customer_address crm_customer_address_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_customer_address
    ADD CONSTRAINT crm_customer_address_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.crm_customer(id) ON UPDATE CASCADE ON DELETE CASCADE;


