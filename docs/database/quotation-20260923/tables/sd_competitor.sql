-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_competitor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_competitor (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    competitor_name character varying(128) NOT NULL,
    industry_position character varying(128),
    location character varying(256),
    main_products character varying(1000),
    strengths character varying(2000),
    weaknesses character varying(2000),
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    remark character varying(500),
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sd_competitor_version_check CHECK ((version > 0))
);


--
-- Name: sd_competitor sd_competitor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_competitor
    ADD CONSTRAINT sd_competitor_pkey PRIMARY KEY (id);


--
-- Name: sd_competitor_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_competitor_lookup_idx ON public.sd_competitor USING btree (tenant_id, status, competitor_name);


--
-- Name: sd_competitor_tenant_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sd_competitor_tenant_name_key ON public.sd_competitor USING btree (tenant_id, competitor_name);


--
-- Name: sd_competitor sd_competitor_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_competitor
    ADD CONSTRAINT sd_competitor_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


