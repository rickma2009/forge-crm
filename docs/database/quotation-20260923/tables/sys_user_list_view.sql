-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_user_list_view; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_user_list_view (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    page_code character varying(64) NOT NULL,
    action_code character varying(64) NOT NULL,
    base_view_id uuid NOT NULL,
    user_id uuid NOT NULL,
    view_name character varying(128) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    config jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    application_id uuid,
    CONSTRAINT ui_user_list_view_version_check CHECK ((version > 0))
);


--
-- Name: sys_user_list_view sys_user_list_view_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_list_view
    ADD CONSTRAINT sys_user_list_view_pkey PRIMARY KEY (id);


--
-- Name: ui_user_list_view_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ui_user_list_view_lookup_idx ON public.sys_user_list_view USING btree (user_id, system_code, page_code, action_code);


--
-- Name: ui_user_list_view_one_default_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ui_user_list_view_one_default_key ON public.sys_user_list_view USING btree (user_id, system_code, page_code, action_code) WHERE (is_default = true);


--
-- Name: ui_user_list_view_owner_scope_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ui_user_list_view_owner_scope_name_key ON public.sys_user_list_view USING btree (user_id, system_code, page_code, action_code, view_name);


--
-- Name: sys_user_list_view sys_user_list_view_base_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_list_view
    ADD CONSTRAINT sys_user_list_view_base_view_id_fkey FOREIGN KEY (base_view_id) REFERENCES public.sys_system_list_view(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_user_list_view sys_user_list_view_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_list_view
    ADD CONSTRAINT sys_user_list_view_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.sys_user(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict 0aOLBA91JhWbtlsrJjkGVXZDniS493g3oicbeCnaUSoudMs2RY5Hn2aKB9rwJgH

