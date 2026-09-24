-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_quotation_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_quotation_line (
    id uuid NOT NULL,
    quotation_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    application_id uuid NOT NULL,
    product_id uuid NOT NULL,
    price_id uuid NOT NULL,
    product_code character varying(32) NOT NULL,
    product_name character varying(128) NOT NULL,
    model character varying(128),
    unit character varying(32) NOT NULL,
    product_line character varying(64) NOT NULL,
    quantity numeric(18,4) NOT NULL,
    suggested_price numeric(18,2) NOT NULL,
    price_source character varying(16) NOT NULL,
    lower_qty numeric(18,4),
    upper_qty numeric(18,4),
    unit_price numeric(18,2) NOT NULL,
    discount numeric(5,2) DEFAULT 0 NOT NULL,
    amount numeric(18,2) NOT NULL,
    sort_no integer NOT NULL,
    delivery character varying(200) DEFAULT ''::character varying NOT NULL,
    remark character varying(2000) DEFAULT ''::character varying NOT NULL,
    CONSTRAINT sd_quote_line_values_ck CHECK (((quantity > (0)::numeric) AND (unit_price >= (0)::numeric) AND (suggested_price >= (0)::numeric) AND ((discount >= (0)::numeric) AND (discount <= (100)::numeric)) AND (amount >= (0)::numeric) AND (sort_no >= 0) AND ((price_source)::text = ANY ((ARRAY['STANDARD'::character varying, 'TIER'::character varying])::text[]))))
);


--
-- Name: sd_quotation_line sd_quotation_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_quotation_line
    ADD CONSTRAINT sd_quotation_line_pkey PRIMARY KEY (id);


--
-- Name: sd_quotation_line_quotation_id_sort_no_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_quotation_line_quotation_id_sort_no_idx ON public.sd_quotation_line USING btree (quotation_id, sort_no);


--
-- Name: sd_quotation_line sd_quotation_line_quotation_id_tenant_id_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_quotation_line
    ADD CONSTRAINT sd_quotation_line_quotation_id_tenant_id_application_id_fkey FOREIGN KEY (quotation_id, tenant_id, application_id) REFERENCES public.sd_quotation(id, tenant_id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sd_quotation_line sd_quote_line_price_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_quotation_line
    ADD CONSTRAINT sd_quote_line_price_fk FOREIGN KEY (price_id, tenant_id, product_id) REFERENCES public.sd_product_price(id, tenant_id, product_id) ON DELETE RESTRICT;


