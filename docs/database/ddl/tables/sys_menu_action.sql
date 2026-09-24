-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_menu_action; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_menu_action (
    id uuid NOT NULL,
    menu_id uuid NOT NULL,
    action_code character varying(64) NOT NULL,
    action_name character varying(128) NOT NULL,
    action_type character varying(64) NOT NULL,
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    permission_id uuid,
    CONSTRAINT ui_menu_action_code_format_check CHECK (((action_code)::text ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'::text)),
    CONSTRAINT ui_menu_action_type_format_check CHECK (((action_type)::text ~ '^[A-Z][A-Z0-9_]*$'::text)),
    CONSTRAINT ui_menu_action_version_check CHECK ((version > 0))
);


--
-- Name: sys_menu_action sys_menu_action_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_menu_action
    ADD CONSTRAINT sys_menu_action_pkey PRIMARY KEY (id);


--
-- Name: ui_menu_action_id_menu_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ui_menu_action_id_menu_id_key ON public.sys_menu_action USING btree (id, menu_id);


--
-- Name: ui_menu_action_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ui_menu_action_lookup_idx ON public.sys_menu_action USING btree (menu_id, status, sort_no);


--
-- Name: ui_menu_action_menu_id_action_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ui_menu_action_menu_id_action_code_key ON public.sys_menu_action USING btree (menu_id, action_code);


--
-- Name: sys_menu_action sys_menu_action_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_menu_action
    ADD CONSTRAINT sys_menu_action_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.sys_menu(id) ON UPDATE CASCADE ON DELETE RESTRICT;


