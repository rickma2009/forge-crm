-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_dictionary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_dictionary (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    dict_code character varying(64) NOT NULL,
    dict_name character varying(128) NOT NULL,
    group_code character varying(64),
    description character varying(512),
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    parent_id uuid,
    items_editable boolean DEFAULT true NOT NULL,
    CONSTRAINT sys_dictionary_code_check CHECK (((dict_code)::text ~ '^[a-z][a-z0-9_]*$'::text)),
    CONSTRAINT sys_dictionary_parent_not_self_check CHECK (((parent_id IS NULL) OR (parent_id <> id))),
    CONSTRAINT sys_dictionary_version_check CHECK ((version > 0))
);


--
-- Name: sys_dictionary sys_dictionary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_dictionary
    ADD CONSTRAINT sys_dictionary_pkey PRIMARY KEY (id);


--
-- Name: sys_dictionary_id_system_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_dictionary_id_system_code_key ON public.sys_dictionary USING btree (id, system_code);


--
-- Name: sys_dictionary_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_dictionary_lookup_idx ON public.sys_dictionary USING btree (system_code, status, sort_no);


--
-- Name: sys_dictionary_system_code_dict_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_dictionary_system_code_dict_code_key ON public.sys_dictionary USING btree (system_code, dict_code);


--
-- Name: sys_dictionary_tree_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_dictionary_tree_idx ON public.sys_dictionary USING btree (system_code, parent_id, status, sort_no);


--
-- Name: sys_dictionary sys_dictionary_parent_id_system_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_dictionary
    ADD CONSTRAINT sys_dictionary_parent_id_system_code_fkey FOREIGN KEY (parent_id, system_code) REFERENCES public.sys_dictionary(id, system_code) ON UPDATE CASCADE ON DELETE RESTRICT;


