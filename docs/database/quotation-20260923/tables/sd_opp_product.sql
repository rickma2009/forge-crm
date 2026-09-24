-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_opp_product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_opp_product (
    id uuid NOT NULL,
    opportunity_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_code character varying(32) NOT NULL,
    product_name character varying(128) NOT NULL,
    model character varying(128),
    quantity numeric(18,4) NOT NULL,
    unit_price numeric(18,2) NOT NULL,
    expected_amount numeric(18,2) NOT NULL,
    requirement character varying(1000),
    sort_no integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sd_opp_product_price_check CHECK (((unit_price >= (0)::numeric) AND (expected_amount >= (0)::numeric))),
    CONSTRAINT sd_opp_product_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT sd_opp_product_version_check CHECK ((version > 0))
);


--
-- Name: sd_opp_product sd_opp_product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_product
    ADD CONSTRAINT sd_opp_product_pkey PRIMARY KEY (id);


--
-- Name: sd_opp_product_list_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_opp_product_list_idx ON public.sd_opp_product USING btree (opportunity_id, sort_no);


--
-- Name: sd_opp_product sd_opp_product_opp_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_product
    ADD CONSTRAINT sd_opp_product_opp_fkey FOREIGN KEY (opportunity_id) REFERENCES public.sd_opp(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sd_opp_product sd_opp_product_product_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_product
    ADD CONSTRAINT sd_opp_product_product_fkey FOREIGN KEY (product_id) REFERENCES public.md_product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


