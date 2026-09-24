-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_user_list_view_preference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_user_list_view_preference (
    user_id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    page_code character varying(64) NOT NULL,
    action_code character varying(64) NOT NULL,
    selected_view_key character varying(160) NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    application_id uuid
);


--
-- Name: sys_user_list_view_preference sys_user_list_view_preference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_list_view_preference
    ADD CONSTRAINT sys_user_list_view_preference_pkey PRIMARY KEY (user_id, system_code, page_code, action_code);


--
-- Name: sys_user_list_view_preference sys_user_list_view_preference_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_list_view_preference
    ADD CONSTRAINT sys_user_list_view_preference_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.sys_user(id) ON UPDATE CASCADE ON DELETE RESTRICT;


