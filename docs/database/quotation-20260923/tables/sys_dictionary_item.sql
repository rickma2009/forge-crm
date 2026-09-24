-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_dictionary_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_dictionary_item (
    id uuid NOT NULL,
    dictionary_id uuid NOT NULL,
    item_code character varying(64) NOT NULL,
    item_value character varying(128) NOT NULL,
    item_name character varying(128) NOT NULL,
    color_key character varying(32),
    description character varying(512),
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_dictionary_item_version_check CHECK ((version > 0))
);


--
-- Name: sys_dictionary_item sys_dictionary_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_dictionary_item
    ADD CONSTRAINT sys_dictionary_item_pkey PRIMARY KEY (id);


--
-- Name: sys_dictionary_item_dict_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_dictionary_item_dict_code_key ON public.sys_dictionary_item USING btree (dictionary_id, item_code);


--
-- Name: sys_dictionary_item_dict_value_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_dictionary_item_dict_value_key ON public.sys_dictionary_item USING btree (dictionary_id, item_value);


--
-- Name: sys_dictionary_item_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_dictionary_item_lookup_idx ON public.sys_dictionary_item USING btree (dictionary_id, status, sort_no);


--
-- Name: sys_dictionary_item sys_dictionary_item_dictionary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_dictionary_item
    ADD CONSTRAINT sys_dictionary_item_dictionary_id_fkey FOREIGN KEY (dictionary_id) REFERENCES public.sys_dictionary(id) ON UPDATE CASCADE ON DELETE RESTRICT;


