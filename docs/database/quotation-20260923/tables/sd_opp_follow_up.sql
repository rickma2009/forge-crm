-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: sd_opp_follow_up; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_opp_follow_up (
    id uuid NOT NULL,
    opportunity_id uuid NOT NULL,
    followed_at timestamp(3) with time zone NOT NULL,
    follower_user_id uuid NOT NULL,
    follower_name character varying(128) NOT NULL,
    work_item character varying(1000) NOT NULL,
    result_next character varying(2000),
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sd_opp_follow_up_version_check CHECK ((version > 0))
);


--
-- Name: sd_opp_follow_up sd_opp_follow_up_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_follow_up
    ADD CONSTRAINT sd_opp_follow_up_pkey PRIMARY KEY (id);


--
-- Name: sd_opp_follow_up_list_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sd_opp_follow_up_list_idx ON public.sd_opp_follow_up USING btree (opportunity_id, followed_at DESC);


--
-- Name: sd_opp_follow_up sd_opp_follow_up_opp_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_opp_follow_up
    ADD CONSTRAINT sd_opp_follow_up_opp_fkey FOREIGN KEY (opportunity_id) REFERENCES public.sd_opp(id) ON UPDATE CASCADE ON DELETE RESTRICT;


