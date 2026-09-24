-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sys_role_data_rule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_data_rule (
    id uuid NOT NULL,
    policy_id uuid NOT NULL,
    rule_name character varying(128) NOT NULL,
    effect character varying(8) NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    sort_no integer DEFAULT 0 NOT NULL,
    condition jsonb NOT NULL,
    CONSTRAINT sys_role_data_rule_effect_check CHECK (((effect)::text = ANY ((ARRAY['ALLOW'::character varying, 'DENY'::character varying])::text[])))
);


--
-- Name: sys_role_data_rule sys_role_data_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_rule
    ADD CONSTRAINT sys_role_data_rule_pkey PRIMARY KEY (id);


--
-- Name: sys_role_data_rule_policy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_role_data_rule_policy_idx ON public.sys_role_data_rule USING btree (policy_id, enabled);


--
-- Name: sys_role_data_rule sys_role_data_rule_policy_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_rule
    ADD CONSTRAINT sys_role_data_rule_policy_fk FOREIGN KEY (policy_id) REFERENCES public.sys_role_data_policy(id) ON UPDATE CASCADE ON DELETE RESTRICT;


