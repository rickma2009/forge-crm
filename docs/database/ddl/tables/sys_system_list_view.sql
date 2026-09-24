-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_system_list_view; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_system_list_view (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    page_code character varying(64) NOT NULL,
    action_code character varying(64) NOT NULL,
    view_code character varying(64) NOT NULL,
    view_name character varying(128) NOT NULL,
    description character varying(512),
    is_default boolean DEFAULT false NOT NULL,
    allow_personal_override boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    config jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    application_id uuid,
    CONSTRAINT ui_system_list_view_version_check CHECK ((version > 0))
);


--
-- Name: sys_system_list_view sys_system_list_view_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_system_list_view
    ADD CONSTRAINT sys_system_list_view_pkey PRIMARY KEY (id);


--
-- Name: ui_system_list_view_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ui_system_list_view_lookup_idx ON public.sys_system_list_view USING btree (system_code, page_code, action_code, status, priority);


--
-- Name: ui_system_list_view_one_default_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ui_system_list_view_one_default_key ON public.sys_system_list_view USING btree (system_code, page_code, action_code) WHERE ((is_default = true) AND (status = 'ACTIVE'::public."RecordStatus"));


--
-- Name: ui_system_list_view_scope_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ui_system_list_view_scope_code_key ON public.sys_system_list_view USING btree (system_code, page_code, action_code, view_code);


