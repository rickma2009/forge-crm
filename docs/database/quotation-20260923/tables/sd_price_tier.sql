-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_price_tier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_price_tier (
    id uuid NOT NULL,
    price_id uuid NOT NULL,
    lower_qty numeric(18,4) NOT NULL,
    upper_qty numeric(18,4),
    unit_price numeric(18,2) NOT NULL,
    CONSTRAINT sd_tier_values_ck CHECK (((lower_qty >= (0)::numeric) AND ((upper_qty IS NULL) OR (upper_qty > lower_qty)) AND (unit_price >= (0)::numeric)))
);


--
-- Name: sd_price_tier sd_price_tier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_price_tier
    ADD CONSTRAINT sd_price_tier_pkey PRIMARY KEY (id);


--
-- Name: sd_price_tier_price_id_lower_qty_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_price_tier_price_id_lower_qty_key ON public.sd_price_tier USING btree (price_id, lower_qty);


--
-- Name: sd_price_tier sd_price_tier_price_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_price_tier
    ADD CONSTRAINT sd_price_tier_price_id_fkey FOREIGN KEY (price_id) REFERENCES public.sd_product_price(id) ON UPDATE CASCADE ON DELETE RESTRICT;


