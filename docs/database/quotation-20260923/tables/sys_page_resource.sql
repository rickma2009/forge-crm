-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_page_resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_page_resource (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    application_id uuid NOT NULL,
    page_code character varying(128) NOT NULL,
    page_name character varying(128) NOT NULL,
    parent_id uuid,
    page_type public."PageResourceType" NOT NULL,
    route_path character varying(256),
    icon_key character varying(64) NOT NULL,
    permission_mode public."ResourcePermissionMode" DEFAULT 'RESTRICTED'::public."ResourcePermissionMode" NOT NULL,
    is_auto_add_menu boolean DEFAULT true NOT NULL,
    is_view_config_enabled boolean DEFAULT false NOT NULL,
    is_group_manage_enabled boolean DEFAULT false NOT NULL,
    is_data_permission_enabled boolean DEFAULT false NOT NULL,
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    remark character varying(1000),
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_page_resource_code_format_check CHECK (((page_code)::text ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'::text)),
    CONSTRAINT sys_page_resource_not_self_parent_check CHECK (((parent_id IS NULL) OR (parent_id <> id))),
    CONSTRAINT sys_page_resource_route_shape_check CHECK ((((page_type = ANY (ARRAY['PAGE'::public."PageResourceType", 'SUBPAGE'::public."PageResourceType"])) AND ((route_path)::text ~~ '/%'::text)) OR (page_type <> ALL (ARRAY['PAGE'::public."PageResourceType", 'SUBPAGE'::public."PageResourceType"])))),
    CONSTRAINT sys_page_resource_version_check CHECK ((version > 0))
);


--
-- Name: sys_page_resource sys_page_resource_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_resource
    ADD CONSTRAINT sys_page_resource_pkey PRIMARY KEY (id);


--
-- Name: sys_page_resource_application_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_page_resource_application_code_key ON public.sys_page_resource USING btree (application_id, page_code);


--
-- Name: sys_page_resource_id_application_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_page_resource_id_application_key ON public.sys_page_resource USING btree (id, application_id);


--
-- Name: sys_page_resource_tree_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_page_resource_tree_idx ON public.sys_page_resource USING btree (application_id, parent_id, status, sort_no);


--
-- Name: sys_page_resource sys_page_resource_application_id_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_resource
    ADD CONSTRAINT sys_page_resource_application_id_tenant_id_fkey FOREIGN KEY (application_id, tenant_id) REFERENCES public.sys_application(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_page_resource sys_page_resource_parent_id_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_resource
    ADD CONSTRAINT sys_page_resource_parent_id_application_id_fkey FOREIGN KEY (parent_id, application_id) REFERENCES public.sys_page_resource(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


