-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_role_field_rule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_field_rule (
    id uuid NOT NULL,
    policy_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    field_id uuid NOT NULL,
    visible boolean NOT NULL,
    writable boolean NOT NULL,
    exportable boolean NOT NULL,
    mask character varying(16) NOT NULL,
    CONSTRAINT sys_role_field_rule_export_check CHECK (((NOT exportable) OR visible)),
    CONSTRAINT sys_role_field_rule_mask_check CHECK (((mask)::text = ANY ((ARRAY['NONE'::character varying, 'PHONE'::character varying, 'AMOUNT'::character varying, 'PARTIAL'::character varying])::text[])))
);


--
-- Name: sys_role_field_rule sys_role_field_rule_field_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_field_rule
    ADD CONSTRAINT sys_role_field_rule_field_key UNIQUE (policy_id, field_id);


--
-- Name: sys_role_field_rule sys_role_field_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_field_rule
    ADD CONSTRAINT sys_role_field_rule_pkey PRIMARY KEY (id);


--
-- Name: sys_role_field_rule sys_role_field_rule_field_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_field_rule
    ADD CONSTRAINT sys_role_field_rule_field_fk FOREIGN KEY (field_id, resource_id) REFERENCES public.sys_authorization_field(id, resource_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_field_rule sys_role_field_rule_policy_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_field_rule
    ADD CONSTRAINT sys_role_field_rule_policy_fk FOREIGN KEY (policy_id, resource_id) REFERENCES public.sys_role_data_policy(id, resource_id) ON UPDATE CASCADE ON DELETE RESTRICT;


