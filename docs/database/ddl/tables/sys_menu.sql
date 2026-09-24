-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_menu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_menu (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    menu_code character varying(64) NOT NULL,
    menu_name character varying(128) NOT NULL,
    node_type public."MenuNodeType" NOT NULL,
    parent_id uuid,
    route_path character varying(256),
    icon_key character varying(64) NOT NULL,
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    application_id uuid,
    access_permission_id uuid,
    page_resource_id uuid,
    menu_type character varying(20) DEFAULT 'PAGE'::character varying NOT NULL,
    open_type character varying(20) DEFAULT 'INTERNAL'::character varying NOT NULL,
    is_auto_add boolean DEFAULT true NOT NULL,
    remark character varying(500),
    CONSTRAINT ui_menu_code_format_check CHECK (((menu_code)::text ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'::text)),
    CONSTRAINT ui_menu_node_shape_check CHECK ((((node_type = 'GROUP'::public."MenuNodeType") AND (route_path IS NULL)) OR ((node_type = 'PAGE'::public."MenuNodeType") AND ((route_path)::text ~~ '/%'::text)))),
    CONSTRAINT ui_menu_not_self_parent_check CHECK (((parent_id IS NULL) OR (parent_id <> id))),
    CONSTRAINT ui_menu_system_code_format_check CHECK (((system_code)::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
    CONSTRAINT ui_menu_version_check CHECK ((version > 0))
);


--
-- Name: sys_menu sys_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_menu
    ADD CONSTRAINT sys_menu_pkey PRIMARY KEY (id);


--
-- Name: sys_menu_page_resource_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_menu_page_resource_idx ON public.sys_menu USING btree (page_resource_id);


--
-- Name: ui_menu_id_system_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ui_menu_id_system_code_key ON public.sys_menu USING btree (id, system_code);


--
-- Name: ui_menu_navigation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ui_menu_navigation_idx ON public.sys_menu USING btree (system_code, status, parent_id, sort_no);


--
-- Name: ui_menu_system_code_menu_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ui_menu_system_code_menu_code_key ON public.sys_menu USING btree (system_code, menu_code);


--
-- Name: ui_menu_system_route_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ui_menu_system_route_key ON public.sys_menu USING btree (system_code, route_path) WHERE ((node_type = 'PAGE'::public."MenuNodeType") AND (route_path IS NOT NULL));


--
-- Name: sys_menu sys_menu_page_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_menu
    ADD CONSTRAINT sys_menu_page_resource_id_fkey FOREIGN KEY (page_resource_id) REFERENCES public.sys_page_resource(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_menu sys_menu_parent_id_system_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_menu
    ADD CONSTRAINT sys_menu_parent_id_system_code_fkey FOREIGN KEY (parent_id, system_code) REFERENCES public.sys_menu(id, system_code) ON UPDATE CASCADE ON DELETE RESTRICT;


