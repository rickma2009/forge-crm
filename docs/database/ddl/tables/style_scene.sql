-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- Name: style_scene; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.style_scene (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    category character varying(64) NOT NULL,
    sub_category character varying(64),
    scene_name character varying(128) NOT NULL,
    description character varying(512),
    status public."SceneStatus" DEFAULT 'TODO'::public."SceneStatus" NOT NULL,
    page_path character varying(256),
    note character varying(512),
    done_at timestamp(3) with time zone,
    sort_no integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL
);


--
-- Name: style_scene style_scene_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.style_scene
    ADD CONSTRAINT style_scene_pkey PRIMARY KEY (id);


--
-- Name: style_scene_list_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX style_scene_list_idx ON public.style_scene USING btree (system_code, status, category, sort_no);


