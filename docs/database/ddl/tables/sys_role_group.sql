-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_role_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_group (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    group_code character varying(64) NOT NULL,
    group_name character varying(128) NOT NULL,
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL
);


--
-- Name: sys_role_group sys_role_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_group
    ADD CONSTRAINT sys_role_group_pkey PRIMARY KEY (id);


--
-- Name: sys_role_group_application_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_role_group_application_code_key ON public.sys_role_group USING btree (application_id, group_code);


--
-- Name: sys_role_group sys_role_group_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_group
    ADD CONSTRAINT sys_role_group_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.sys_application(id) ON UPDATE CASCADE ON DELETE RESTRICT;


