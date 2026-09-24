-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: md_product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.md_product (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    product_code character varying(32) NOT NULL,
    product_name character varying(128) NOT NULL,
    model character varying(128),
    product_line character varying(64),
    unit character varying(32),
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    remark character varying(500),
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT md_product_version_check CHECK ((version > 0))
);


--
-- Name: md_product md_product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.md_product
    ADD CONSTRAINT md_product_pkey PRIMARY KEY (id);


--
-- Name: md_product_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX md_product_lookup_idx ON public.md_product USING btree (tenant_id, status, product_name);


--
-- Name: md_product_quote_scope_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX md_product_quote_scope_key ON public.md_product USING btree (id, tenant_id);


--
-- Name: md_product_tenant_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX md_product_tenant_code_key ON public.md_product USING btree (tenant_id, product_code);


--
-- Name: md_product md_product_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.md_product
    ADD CONSTRAINT md_product_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


