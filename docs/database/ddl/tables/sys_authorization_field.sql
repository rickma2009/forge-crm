-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_authorization_field; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_authorization_field (
    id uuid NOT NULL,
    resource_id uuid NOT NULL,
    field_code character varying(128) NOT NULL,
    field_name character varying(128) NOT NULL,
    binding_key character varying(128) NOT NULL,
    field_type character varying(16) NOT NULL,
    group_name character varying(64) DEFAULT '基本字段'::character varying NOT NULL,
    source character varying(16) DEFAULT 'SYSTEM'::character varying NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    value_source jsonb,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_auth_field_type_check CHECK (((field_type)::text = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'date'::character varying, 'collection'::character varying])::text[]))),
    CONSTRAINT sys_authorization_field_source_check CHECK (((source)::text = ANY ((ARRAY['SYSTEM'::character varying, 'CUSTOM'::character varying])::text[]))),
    CONSTRAINT sys_authorization_field_version_check CHECK ((version > 0))
);


--
-- Name: sys_authorization_field sys_auth_field_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_field
    ADD CONSTRAINT sys_auth_field_code_key UNIQUE (resource_id, field_code);


--
-- Name: sys_authorization_field sys_auth_field_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_field
    ADD CONSTRAINT sys_auth_field_scope_key UNIQUE (id, resource_id);


--
-- Name: sys_authorization_field sys_authorization_field_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_field
    ADD CONSTRAINT sys_authorization_field_pkey PRIMARY KEY (id);


--
-- Name: sys_authorization_field sys_auth_field_resource_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_field
    ADD CONSTRAINT sys_auth_field_resource_fk FOREIGN KEY (resource_id) REFERENCES public.sys_authorization_resource(id) ON UPDATE CASCADE ON DELETE RESTRICT;


