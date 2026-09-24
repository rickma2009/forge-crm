-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_product_price; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_product_price (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    version integer NOT NULL,
    standard_price numeric(18,2) NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sd_price_values_ck CHECK (((version > 0) AND (standard_price >= (0)::numeric)))
);


--
-- Name: sd_product_price sd_product_price_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_product_price
    ADD CONSTRAINT sd_product_price_pkey PRIMARY KEY (id);


--
-- Name: sd_product_price_id_tenant_id_product_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_product_price_id_tenant_id_product_id_key ON public.sd_product_price USING btree (id, tenant_id, product_id);


--
-- Name: sd_product_price_product_id_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_product_price_product_id_version_key ON public.sd_product_price USING btree (product_id, version);


--
-- Name: sd_product_price_tenant_id_product_id_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_product_price_tenant_id_product_id_version_idx ON public.sd_product_price USING btree (tenant_id, product_id, version);


--
-- Name: sd_product_price sd_price_product_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_product_price
    ADD CONSTRAINT sd_price_product_fk FOREIGN KEY (product_id, tenant_id) REFERENCES public.md_product(id, tenant_id) ON DELETE RESTRICT;


