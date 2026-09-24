-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- PostgreSQL database dump
--

\restrict scuinaEepNTIlNiwPUvstDzgLS3NzJyJ3TqnphDtaxnL9hfvO6vRTVAHI5R5Eul

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: MenuNodeType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MenuNodeType" AS ENUM (
    'GROUP',
    'PAGE'
);


--
-- Name: OrgUnitType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrgUnitType" AS ENUM (
    'COMPANY',
    'DIVISION',
    'DEPARTMENT',
    'TEAM'
);


--
-- Name: PageResourceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PageResourceType" AS ENUM (
    'SYSTEM',
    'MODULE',
    'PAGE',
    'SUBPAGE',
    'COMPONENT'
);


--
-- Name: PermissionSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PermissionSource" AS ENUM (
    'SYSTEM',
    'CUSTOM'
);


--
-- Name: PermissionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PermissionType" AS ENUM (
    'MENU',
    'ACTION'
);


--
-- Name: RecordStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RecordStatus" AS ENUM (
    'ACTIVE',
    'DISABLED'
);


--
-- Name: ResourceButtonType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ResourceButtonType" AS ENUM (
    'TOOL',
    'LINE'
);


--
-- Name: ResourcePermissionMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ResourcePermissionMode" AS ENUM (
    'RESTRICTED',
    'COMMON'
);


--
-- Name: RoleType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RoleType" AS ENUM (
    'SYSTEM',
    'BUSINESS'
);


--
-- Name: SceneStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SceneStatus" AS ENUM (
    'DONE',
    'WIP',
    'TODO'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'DISABLED',
    'LOCKED'
);


--
-- Name: UserType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserType" AS ENUM (
    'INTERNAL',
    'EXTERNAL',
    'SERVICE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: crm_customer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_customer (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    customer_code character varying(20) NOT NULL,
    customer_name character varying(255) NOT NULL,
    short_name character varying(100) NOT NULL,
    category_value character varying(128) NOT NULL,
    address character varying(500),
    status_value character varying(128) NOT NULL,
    industry_value character varying(128),
    level_value character varying(128),
    sales_owner_key character varying(128),
    sales_owner_name character varying(128),
    remark character varying(1000),
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT crm_customer_code_check CHECK (((customer_code)::text ~ '^C[0-9]{10}$'::text)),
    CONSTRAINT crm_customer_version_check CHECK ((version > 0))
);


--
-- Name: crm_customer_address; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_customer_address (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    customer_id uuid NOT NULL,
    address_type character varying(32) NOT NULL,
    recipient character varying(100),
    phone character varying(32),
    province character varying(64),
    city character varying(64),
    district character varying(64),
    detail character varying(500) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    status character varying(32) DEFAULT 'ACTIVE'::character varying NOT NULL,
    remark character varying(500),
    "sortNo" integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL
);


--
-- Name: crm_customer_contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_customer_contact (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    customer_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    department character varying(128),
    "position" character varying(128),
    decision_role character varying(64),
    mobile character varying(32),
    phone character varying(32),
    email character varying(128),
    status character varying(32) DEFAULT 'ACTIVE'::character varying NOT NULL,
    remark character varying(500),
    "sortNo" integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL
);


--
-- Name: org_employee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_employee (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    employee_name character varying(128) NOT NULL,
    email character varying(256),
    mobile character varying(32),
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    remark character varying(500),
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT org_employee_version_check CHECK ((version > 0))
);


--
-- Name: org_employee_assignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_employee_assignment (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    org_unit_id uuid NOT NULL,
    position_id uuid NOT NULL,
    position_name_snapshot character varying(128) NOT NULL,
    assignment_type character varying(32) DEFAULT 'PRIMARY'::character varying NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT org_employee_assignment_period_check CHECK (((expires_at IS NULL) OR (expires_at > effective_at))),
    CONSTRAINT org_employee_assignment_version_check CHECK ((version > 0))
);


--
-- Name: org_employment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_employment (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    employee_no character varying(64) NOT NULL,
    employment_type character varying(32) DEFAULT 'FULL_TIME'::character varying NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT org_employment_period_check CHECK (((expires_at IS NULL) OR (expires_at > effective_at))),
    CONSTRAINT org_employment_version_check CHECK ((version > 0))
);


--
-- Name: org_position; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_position (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    position_code character varying(64) NOT NULL,
    position_name character varying(128) NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT org_position_version_check CHECK ((version > 0))
);


--
-- Name: org_unit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_unit (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    parent_id uuid,
    unit_code character varying(64) NOT NULL,
    unit_name character varying(128) NOT NULL,
    unit_type public."OrgUnitType" NOT NULL,
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    remark character varying(500),
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT org_unit_not_self_parent_check CHECK (((parent_id IS NULL) OR (parent_id <> id))),
    CONSTRAINT org_unit_period_check CHECK (((expires_at IS NULL) OR (expires_at > effective_at)))
);


--
-- Name: org_user_assignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_user_assignment (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    org_unit_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT org_user_assignment_check CHECK (((expires_at IS NULL) OR (expires_at > effective_at))),
    CONSTRAINT org_user_assignment_version_check CHECK ((version > 0))
);


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
-- Name: sys_application; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_application (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    application_code character varying(64) NOT NULL,
    application_name character varying(128) NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_application_version_check CHECK ((version > 0))
);


--
-- Name: sys_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_audit_log (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    application_id uuid NOT NULL,
    actor_user_id uuid,
    action_code character varying(128) NOT NULL,
    resource_type character varying(64) NOT NULL,
    resource_id character varying(128),
    before_snapshot jsonb,
    after_snapshot jsonb,
    request_id character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sys_authorization_field; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_authorization_field (
    id uuid NOT NULL,
    resource_id uuid NOT NULL,
    field_code character varying(128) NOT NULL,
    field_name character varying(128) NOT NULL,
    binding_key character varying(128) NOT NULL,
    field_type character varying(16) NOT NULL,
    group_name character varying(64) DEFAULT '基本字段'::character varying NOT NULL,
    source character varying(16) DEFAULT 'SYSTEM'::character varying NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    value_source jsonb,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_auth_field_type_check CHECK (((field_type)::text = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'date'::character varying, 'collection'::character varying])::text[]))),
    CONSTRAINT sys_authorization_field_source_check CHECK (((source)::text = ANY ((ARRAY['SYSTEM'::character varying, 'CUSTOM'::character varying])::text[]))),
    CONSTRAINT sys_authorization_field_version_check CHECK ((version > 0))
);


--
-- Name: sys_authorization_resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_authorization_resource (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    resource_code character varying(128) NOT NULL,
    resource_name character varying(128) NOT NULL,
    binding_key character varying(128) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_authorization_resource_version_check CHECK ((version > 0))
);


--
-- Name: sys_dictionary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_dictionary (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    dict_code character varying(64) NOT NULL,
    dict_name character varying(128) NOT NULL,
    group_code character varying(64),
    description character varying(512),
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    parent_id uuid,
    items_editable boolean DEFAULT true NOT NULL,
    CONSTRAINT sys_dictionary_code_check CHECK (((dict_code)::text ~ '^[a-z][a-z0-9_]*$'::text)),
    CONSTRAINT sys_dictionary_parent_not_self_check CHECK (((parent_id IS NULL) OR (parent_id <> id))),
    CONSTRAINT sys_dictionary_version_check CHECK ((version > 0))
);


--
-- Name: sys_dictionary_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_dictionary_item (
    id uuid NOT NULL,
    dictionary_id uuid NOT NULL,
    item_code character varying(64) NOT NULL,
    item_value character varying(128) NOT NULL,
    item_name character varying(128) NOT NULL,
    color_key character varying(32),
    description character varying(512),
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by character varying(128) NOT NULL,
    updated_by character varying(128) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_dictionary_item_version_check CHECK ((version > 0))
);


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
-- Name: sys_page_button; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_page_button (
    id uuid NOT NULL,
    page_id uuid NOT NULL,
    button_code character varying(128) NOT NULL,
    button_name character varying(128) NOT NULL,
    button_type public."ResourceButtonType" NOT NULL,
    icon_key character varying(64),
    event_name character varying(128),
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    remark character varying(1000),
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_page_button_version_check CHECK ((version > 0))
);


--
-- Name: sys_page_resource; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_page_resource (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    application_id uuid NOT NULL,
    page_code character varying(128) NOT NULL,
    page_name character varying(128) NOT NULL,
    parent_id uuid,
    page_type public."PageResourceType" NOT NULL,
    route_path character varying(256),
    icon_key character varying(64) NOT NULL,
    permission_mode public."ResourcePermissionMode" DEFAULT 'RESTRICTED'::public."ResourcePermissionMode" NOT NULL,
    is_auto_add_menu boolean DEFAULT true NOT NULL,
    is_view_config_enabled boolean DEFAULT false NOT NULL,
    is_group_manage_enabled boolean DEFAULT false NOT NULL,
    is_data_permission_enabled boolean DEFAULT false NOT NULL,
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    remark character varying(1000),
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_page_resource_code_format_check CHECK (((page_code)::text ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'::text)),
    CONSTRAINT sys_page_resource_not_self_parent_check CHECK (((parent_id IS NULL) OR (parent_id <> id))),
    CONSTRAINT sys_page_resource_route_shape_check CHECK ((((page_type = ANY (ARRAY['PAGE'::public."PageResourceType", 'SUBPAGE'::public."PageResourceType"])) AND ((route_path)::text ~~ '/%'::text)) OR (page_type <> ALL (ARRAY['PAGE'::public."PageResourceType", 'SUBPAGE'::public."PageResourceType"])))),
    CONSTRAINT sys_page_resource_version_check CHECK ((version > 0))
);


--
-- Name: sys_page_tab; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_page_tab (
    id uuid NOT NULL,
    page_id uuid NOT NULL,
    target_page_id uuid NOT NULL,
    tab_name character varying(80) NOT NULL,
    sort_no integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    remark character varying(300),
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    application_id uuid NOT NULL,
    CONSTRAINT sys_page_tab_not_self_check CHECK ((page_id <> target_page_id)),
    CONSTRAINT sys_page_tab_version_check CHECK ((version > 0))
);


--
-- Name: sys_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_permission (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    permission_code character varying(160) NOT NULL,
    permission_name character varying(128) NOT NULL,
    resource_code character varying(128) NOT NULL,
    action_code character varying(64) NOT NULL,
    source public."PermissionSource" DEFAULT 'SYSTEM'::public."PermissionSource" NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL
);


--
-- Name: sys_policy_revision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_policy_revision (
    id uuid NOT NULL,
    policy_id uuid NOT NULL,
    version integer NOT NULL,
    snapshot jsonb NOT NULL,
    summary character varying(500) NOT NULL,
    published_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sys_policy_revision_version_check CHECK ((version > 0))
);


--
-- Name: sys_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role (
    id uuid NOT NULL,
    system_code character varying(64) NOT NULL,
    role_code character varying(64) NOT NULL,
    role_name character varying(128) NOT NULL,
    role_type public."RoleType" NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    description character varying(512),
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    tenant_id uuid,
    application_id uuid,
    role_group_id uuid,
    effective_date_begin timestamp(3) with time zone,
    effective_date_end timestamp(3) with time zone,
    is_enabled boolean DEFAULT true NOT NULL,
    parent_id uuid,
    role_abbr_name character varying(64),
    sort_no integer DEFAULT 0 NOT NULL,
    archived_at timestamp(3) with time zone,
    CONSTRAINT iam_role_code_format_check CHECK (((role_code)::text ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'::text)),
    CONSTRAINT iam_role_system_code_format_check CHECK (((system_code)::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
    CONSTRAINT iam_role_system_shape_check CHECK (((is_system AND (role_type = 'SYSTEM'::public."RoleType")) OR ((NOT is_system) AND (role_type = 'BUSINESS'::public."RoleType")))),
    CONSTRAINT iam_role_version_check CHECK ((version > 0)),
    CONSTRAINT sys_role_effective_period_check CHECK (((effective_date_begin IS NULL) OR (effective_date_end IS NULL) OR (effective_date_begin < effective_date_end))),
    CONSTRAINT sys_role_not_own_parent_check CHECK (((parent_id IS NULL) OR (parent_id <> id)))
);


--
-- Name: sys_role_data_policy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_data_policy (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    role_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    action_code character varying(32) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    published_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_role_data_policy_action_code_check CHECK (((action_code)::text = ANY ((ARRAY['read'::character varying, 'create'::character varying, 'update'::character varying])::text[]))),
    CONSTRAINT sys_role_data_policy_version_check CHECK ((version > 0))
);


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
-- Name: sys_role_list_view; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_list_view (
    role_id uuid NOT NULL,
    view_id uuid NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sys_role_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_permission (
    id uuid NOT NULL,
    role_id uuid NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    permission_id uuid NOT NULL,
    application_id uuid NOT NULL,
    granted_by uuid,
    revoked_by uuid,
    revoked_at timestamp(3) with time zone,
    CONSTRAINT iam_role_permission_version_check CHECK ((version > 0))
);


--
-- Name: sys_role_subject_binding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_subject_binding (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    role_id uuid NOT NULL,
    org_unit_id uuid,
    group_id uuid,
    include_descendants boolean DEFAULT false NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_role_subject_binding_check CHECK (((expires_at IS NULL) OR (expires_at > effective_at))),
    CONSTRAINT sys_role_subject_binding_version_check CHECK ((version > 0)),
    CONSTRAINT sys_role_subject_descendants_check CHECK (((group_id IS NULL) OR (NOT include_descendants))),
    CONSTRAINT sys_role_subject_one_kind CHECK (((((org_unit_id IS NOT NULL))::integer + ((group_id IS NOT NULL))::integer) = 1))
);


--
-- Name: sys_role_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_role_user (
    role_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    granted_by uuid,
    ended_by uuid,
    ended_at timestamp(3) with time zone,
    CONSTRAINT iam_role_user_period_check CHECK (((effective_at IS NULL) OR (expires_at IS NULL) OR (effective_at < expires_at)))
);


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
-- Name: sys_tenant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_tenant (
    id uuid NOT NULL,
    tenant_code character varying(64) NOT NULL,
    tenant_name character varying(128) NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_tenant_version_check CHECK ((version > 0))
);


--
-- Name: sys_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_user (
    id uuid NOT NULL,
    account character varying(128) NOT NULL,
    normalized_account character varying(128) NOT NULL,
    display_name character varying(128) NOT NULL,
    auth_source character varying(32) DEFAULT 'LOCAL'::character varying NOT NULL,
    external_subject character varying(256),
    password_hash character varying(512),
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    user_type public."UserType" DEFAULT 'INTERNAL'::public."UserType" NOT NULL,
    tenant_id uuid,
    employee_id uuid,
    CONSTRAINT iam_user_auth_check CHECK (((((auth_source)::text = 'LOCAL'::text) AND (password_hash IS NOT NULL)) OR (((auth_source)::text <> 'LOCAL'::text) AND (external_subject IS NOT NULL)))),
    CONSTRAINT iam_user_version_check CHECK ((version > 0))
);


--
-- Name: sys_user_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_user_group (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    group_code character varying(64) NOT NULL,
    group_name character varying(128) NOT NULL,
    description character varying(500),
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_user_group_version_check CHECK ((version > 0))
);


--
-- Name: sys_user_group_member; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_user_group_member (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    effective_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) with time zone,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT sys_user_group_member_check CHECK (((expires_at IS NULL) OR (expires_at > effective_at))),
    CONSTRAINT sys_user_group_member_version_check CHECK ((version > 0))
);


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
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: crm_customer_address crm_customer_address_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_customer_address
    ADD CONSTRAINT crm_customer_address_pkey PRIMARY KEY (id);


--
-- Name: crm_customer_contact crm_customer_contact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_customer_contact
    ADD CONSTRAINT crm_customer_contact_pkey PRIMARY KEY (id);


--
-- Name: crm_customer crm_customer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_customer
    ADD CONSTRAINT crm_customer_pkey PRIMARY KEY (id);


--
-- Name: org_employee_assignment org_employee_assignment_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_period_key UNIQUE (employee_id, org_unit_id, position_id, effective_at);


--
-- Name: org_employee_assignment org_employee_assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_pkey PRIMARY KEY (id);


--
-- Name: org_employee org_employee_id_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee
    ADD CONSTRAINT org_employee_id_tenant_key UNIQUE (id, tenant_id);


--
-- Name: org_employee org_employee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee
    ADD CONSTRAINT org_employee_pkey PRIMARY KEY (id);


--
-- Name: org_employment org_employment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employment
    ADD CONSTRAINT org_employment_pkey PRIMARY KEY (id);


--
-- Name: org_employment org_employment_tenant_employee_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employment
    ADD CONSTRAINT org_employment_tenant_employee_no_key UNIQUE (tenant_id, employee_no);


--
-- Name: org_position org_position_id_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_position
    ADD CONSTRAINT org_position_id_tenant_key UNIQUE (id, tenant_id);


--
-- Name: org_position org_position_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_position
    ADD CONSTRAINT org_position_pkey PRIMARY KEY (id);


--
-- Name: org_position org_position_tenant_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_position
    ADD CONSTRAINT org_position_tenant_code_key UNIQUE (tenant_id, position_code);


--
-- Name: org_unit org_unit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_unit
    ADD CONSTRAINT org_unit_pkey PRIMARY KEY (id);


--
-- Name: org_user_assignment org_user_assignment_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_user_assignment
    ADD CONSTRAINT org_user_assignment_period_key UNIQUE (org_unit_id, user_id, effective_at);


--
-- Name: org_user_assignment org_user_assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_user_assignment
    ADD CONSTRAINT org_user_assignment_pkey PRIMARY KEY (id);


--
-- Name: style_scene style_scene_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.style_scene
    ADD CONSTRAINT style_scene_pkey PRIMARY KEY (id);


--
-- Name: sys_application sys_application_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_application
    ADD CONSTRAINT sys_application_pkey PRIMARY KEY (id);


--
-- Name: sys_audit_log sys_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_audit_log
    ADD CONSTRAINT sys_audit_log_pkey PRIMARY KEY (id);


--
-- Name: sys_authorization_field sys_auth_field_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_field
    ADD CONSTRAINT sys_auth_field_code_key UNIQUE (resource_id, field_code);


--
-- Name: sys_authorization_field sys_auth_field_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_field
    ADD CONSTRAINT sys_auth_field_scope_key UNIQUE (id, resource_id);


--
-- Name: sys_authorization_resource sys_auth_resource_binding_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_auth_resource_binding_key UNIQUE (application_id, binding_key);


--
-- Name: sys_authorization_resource sys_auth_resource_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_auth_resource_code_key UNIQUE (application_id, resource_code);


--
-- Name: sys_authorization_resource sys_auth_resource_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_auth_resource_scope_key UNIQUE (id, application_id);


--
-- Name: sys_authorization_field sys_authorization_field_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_field
    ADD CONSTRAINT sys_authorization_field_pkey PRIMARY KEY (id);


--
-- Name: sys_authorization_resource sys_authorization_resource_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_authorization_resource_pkey PRIMARY KEY (id);


--
-- Name: sys_dictionary_item sys_dictionary_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_dictionary_item
    ADD CONSTRAINT sys_dictionary_item_pkey PRIMARY KEY (id);


--
-- Name: sys_dictionary sys_dictionary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_dictionary
    ADD CONSTRAINT sys_dictionary_pkey PRIMARY KEY (id);


--
-- Name: sys_menu_action sys_menu_action_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_menu_action
    ADD CONSTRAINT sys_menu_action_pkey PRIMARY KEY (id);


--
-- Name: sys_menu sys_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_menu
    ADD CONSTRAINT sys_menu_pkey PRIMARY KEY (id);


--
-- Name: sys_page_button sys_page_button_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_button
    ADD CONSTRAINT sys_page_button_pkey PRIMARY KEY (id);


--
-- Name: sys_page_resource sys_page_resource_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_resource
    ADD CONSTRAINT sys_page_resource_pkey PRIMARY KEY (id);


--
-- Name: sys_page_tab sys_page_tab_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_tab
    ADD CONSTRAINT sys_page_tab_pkey PRIMARY KEY (id);


--
-- Name: sys_permission sys_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_permission
    ADD CONSTRAINT sys_permission_pkey PRIMARY KEY (id);


--
-- Name: sys_policy_revision sys_policy_revision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_policy_revision
    ADD CONSTRAINT sys_policy_revision_pkey PRIMARY KEY (id);


--
-- Name: sys_policy_revision sys_policy_revision_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_policy_revision
    ADD CONSTRAINT sys_policy_revision_version_key UNIQUE (policy_id, version);


--
-- Name: sys_role_data_policy sys_role_data_policy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_policy
    ADD CONSTRAINT sys_role_data_policy_pkey PRIMARY KEY (id);


--
-- Name: sys_role_data_policy sys_role_data_policy_resource_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_policy
    ADD CONSTRAINT sys_role_data_policy_resource_key UNIQUE (id, resource_id);


--
-- Name: sys_role_data_policy sys_role_data_policy_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_policy
    ADD CONSTRAINT sys_role_data_policy_scope_key UNIQUE (role_id, resource_id, action_code);


--
-- Name: sys_role_data_rule sys_role_data_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_rule
    ADD CONSTRAINT sys_role_data_rule_pkey PRIMARY KEY (id);


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
-- Name: sys_role_group sys_role_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_group
    ADD CONSTRAINT sys_role_group_pkey PRIMARY KEY (id);


--
-- Name: sys_role sys_role_id_application_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role
    ADD CONSTRAINT sys_role_id_application_tenant_key UNIQUE (id, application_id, tenant_id);


--
-- Name: sys_role_list_view sys_role_list_view_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_list_view
    ADD CONSTRAINT sys_role_list_view_pkey PRIMARY KEY (role_id, view_id);


--
-- Name: sys_role_permission sys_role_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_permission
    ADD CONSTRAINT sys_role_permission_pkey PRIMARY KEY (id);


--
-- Name: sys_role sys_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role
    ADD CONSTRAINT sys_role_pkey PRIMARY KEY (id);


--
-- Name: sys_role_subject_binding sys_role_subject_binding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_binding_pkey PRIMARY KEY (id);


--
-- Name: sys_role_subject_binding sys_role_subject_group_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_group_period_key UNIQUE (role_id, group_id, effective_at);


--
-- Name: sys_role_subject_binding sys_role_subject_org_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_org_period_key UNIQUE (role_id, org_unit_id, effective_at);


--
-- Name: sys_role_user sys_role_user_no_overlap; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_user
    ADD CONSTRAINT sys_role_user_no_overlap EXCLUDE USING gist (role_id WITH =, user_id WITH =, tstzrange(effective_at, expires_at, '[)'::text) WITH &&) WHERE ((status = 'ACTIVE'::public."RecordStatus"));


--
-- Name: sys_role_user sys_role_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_user
    ADD CONSTRAINT sys_role_user_pkey PRIMARY KEY (id);


--
-- Name: sys_system_list_view sys_system_list_view_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_system_list_view
    ADD CONSTRAINT sys_system_list_view_pkey PRIMARY KEY (id);


--
-- Name: sys_tenant sys_tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_tenant
    ADD CONSTRAINT sys_tenant_pkey PRIMARY KEY (id);


--
-- Name: sys_user sys_user_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_employee_id_key UNIQUE (employee_id);


--
-- Name: sys_user sys_user_employee_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_employee_tenant_key UNIQUE (employee_id, tenant_id);


--
-- Name: sys_user_group sys_user_group_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group
    ADD CONSTRAINT sys_user_group_code_key UNIQUE (application_id, group_code);


--
-- Name: sys_user_group_member sys_user_group_member_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group_member
    ADD CONSTRAINT sys_user_group_member_period_key UNIQUE (group_id, user_id, effective_at);


--
-- Name: sys_user_group_member sys_user_group_member_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group_member
    ADD CONSTRAINT sys_user_group_member_pkey PRIMARY KEY (id);


--
-- Name: sys_user_group sys_user_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group
    ADD CONSTRAINT sys_user_group_pkey PRIMARY KEY (id);


--
-- Name: sys_user_group sys_user_group_scope_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group
    ADD CONSTRAINT sys_user_group_scope_key UNIQUE (id, application_id, tenant_id);


--
-- Name: sys_user sys_user_id_tenant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_id_tenant_key UNIQUE (id, tenant_id);


--
-- Name: sys_user_list_view sys_user_list_view_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_list_view
    ADD CONSTRAINT sys_user_list_view_pkey PRIMARY KEY (id);


--
-- Name: sys_user_list_view_preference sys_user_list_view_preference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_list_view_preference
    ADD CONSTRAINT sys_user_list_view_preference_pkey PRIMARY KEY (user_id, system_code, page_code, action_code);


--
-- Name: sys_user sys_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_pkey PRIMARY KEY (id);


--
-- Name: crm_address_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_address_customer_idx ON public.crm_customer_address USING btree (system_code, customer_id);


--
-- Name: crm_contact_customer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_contact_customer_idx ON public.crm_customer_contact USING btree (system_code, customer_id);


--
-- Name: crm_customer_list_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crm_customer_list_idx ON public.crm_customer USING btree (system_code, status_value, category_value, updated_at DESC);


--
-- Name: crm_customer_system_code_customer_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX crm_customer_system_code_customer_code_key ON public.crm_customer USING btree (system_code, customer_code);


--
-- Name: crm_customer_system_code_customer_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX crm_customer_system_code_customer_name_key ON public.crm_customer USING btree (system_code, customer_name);


--
-- Name: iam_role_id_system_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX iam_role_id_system_code_key ON public.sys_role USING btree (id, system_code);


--
-- Name: iam_role_list_view_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX iam_role_list_view_lookup_idx ON public.sys_role_list_view USING btree (view_id, status);


--
-- Name: iam_role_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX iam_role_lookup_idx ON public.sys_role USING btree (system_code, status);


--
-- Name: iam_role_one_system_manager_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX iam_role_one_system_manager_key ON public.sys_role USING btree (system_code) WHERE (is_system = true);


--
-- Name: iam_role_system_code_role_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX iam_role_system_code_role_code_key ON public.sys_role USING btree (system_code, role_code);


--
-- Name: iam_role_user_effective_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX iam_role_user_effective_idx ON public.sys_role_user USING btree (user_id, status, effective_at, expires_at);


--
-- Name: iam_user_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX iam_user_status_idx ON public.sys_user USING btree (status);


--
-- Name: org_employee_assignment_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_employee_assignment_active_idx ON public.org_employee_assignment USING btree (employee_id, status, effective_at, expires_at);


--
-- Name: org_employee_assignment_open_primary_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX org_employee_assignment_open_primary_key ON public.org_employee_assignment USING btree (employee_id) WHERE ((is_primary = true) AND (status = 'ACTIVE'::public."RecordStatus") AND (expires_at IS NULL));


--
-- Name: org_employee_assignment_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_employee_assignment_org_idx ON public.org_employee_assignment USING btree (org_unit_id, status);


--
-- Name: org_employee_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_employee_lookup_idx ON public.org_employee USING btree (tenant_id, status, employee_name);


--
-- Name: org_employment_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_employment_active_idx ON public.org_employment USING btree (employee_id, status, effective_at, expires_at);


--
-- Name: org_position_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_position_lookup_idx ON public.org_position USING btree (tenant_id, status, position_name);


--
-- Name: org_unit_id_tenant_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX org_unit_id_tenant_key ON public.org_unit USING btree (id, tenant_id);


--
-- Name: org_unit_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_unit_status_idx ON public.org_unit USING btree (tenant_id, status);


--
-- Name: org_unit_tenant_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX org_unit_tenant_code_key ON public.org_unit USING btree (tenant_id, unit_code);


--
-- Name: org_unit_tree_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_unit_tree_idx ON public.org_unit USING btree (tenant_id, parent_id, sort_no);


--
-- Name: org_user_assignment_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_user_assignment_active_idx ON public.org_user_assignment USING btree (user_id, status, effective_at, expires_at);


--
-- Name: style_scene_list_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX style_scene_list_idx ON public.style_scene USING btree (system_code, status, category, sort_no);


--
-- Name: sys_application_code_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_application_code_status_idx ON public.sys_application USING btree (application_code, status);


--
-- Name: sys_application_id_tenant_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_application_id_tenant_key ON public.sys_application USING btree (id, tenant_id);


--
-- Name: sys_application_tenant_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_application_tenant_code_key ON public.sys_application USING btree (tenant_id, application_code);


--
-- Name: sys_audit_log_actor_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_audit_log_actor_time_idx ON public.sys_audit_log USING btree (actor_user_id, created_at DESC);


--
-- Name: sys_audit_log_application_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_audit_log_application_time_idx ON public.sys_audit_log USING btree (application_id, created_at DESC);


--
-- Name: sys_dictionary_id_system_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_dictionary_id_system_code_key ON public.sys_dictionary USING btree (id, system_code);


--
-- Name: sys_dictionary_item_dict_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_dictionary_item_dict_code_key ON public.sys_dictionary_item USING btree (dictionary_id, item_code);


--
-- Name: sys_dictionary_item_dict_value_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_dictionary_item_dict_value_key ON public.sys_dictionary_item USING btree (dictionary_id, item_value);


--
-- Name: sys_dictionary_item_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_dictionary_item_lookup_idx ON public.sys_dictionary_item USING btree (dictionary_id, status, sort_no);


--
-- Name: sys_dictionary_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_dictionary_lookup_idx ON public.sys_dictionary USING btree (system_code, status, sort_no);


--
-- Name: sys_dictionary_system_code_dict_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_dictionary_system_code_dict_code_key ON public.sys_dictionary USING btree (system_code, dict_code);


--
-- Name: sys_dictionary_tree_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_dictionary_tree_idx ON public.sys_dictionary USING btree (system_code, parent_id, status, sort_no);


--
-- Name: sys_menu_page_resource_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_menu_page_resource_idx ON public.sys_menu USING btree (page_resource_id);


--
-- Name: sys_page_button_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_page_button_lookup_idx ON public.sys_page_button USING btree (page_id, status, sort_no);


--
-- Name: sys_page_button_page_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_page_button_page_code_key ON public.sys_page_button USING btree (page_id, button_code);


--
-- Name: sys_page_resource_application_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_page_resource_application_code_key ON public.sys_page_resource USING btree (application_id, page_code);


--
-- Name: sys_page_resource_id_application_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_page_resource_id_application_key ON public.sys_page_resource USING btree (id, application_id);


--
-- Name: sys_page_resource_tree_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_page_resource_tree_idx ON public.sys_page_resource USING btree (application_id, parent_id, status, sort_no);


--
-- Name: sys_page_tab_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_page_tab_lookup_idx ON public.sys_page_tab USING btree (page_id, status, sort_no);


--
-- Name: sys_page_tab_page_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_page_tab_page_name_key ON public.sys_page_tab USING btree (page_id, tab_name);


--
-- Name: sys_page_tab_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_page_tab_target_idx ON public.sys_page_tab USING btree (target_page_id);


--
-- Name: sys_permission_application_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_permission_application_code_key ON public.sys_permission USING btree (application_id, permission_code);


--
-- Name: sys_permission_id_application_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_permission_id_application_key ON public.sys_permission USING btree (id, application_id);


--
-- Name: sys_permission_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_permission_lookup_idx ON public.sys_permission USING btree (application_id, resource_code, status);


--
-- Name: sys_role_data_rule_policy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_role_data_rule_policy_idx ON public.sys_role_data_rule USING btree (policy_id, enabled);


--
-- Name: sys_role_group_application_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_role_group_application_code_key ON public.sys_role_group USING btree (application_id, group_code);


--
-- Name: sys_role_id_application_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_role_id_application_key ON public.sys_role USING btree (id, application_id);


--
-- Name: sys_role_permission_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_role_permission_role_idx ON public.sys_role_permission USING btree (role_id, status);


--
-- Name: sys_role_permission_role_permission_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_role_permission_role_permission_key ON public.sys_role_permission USING btree (role_id, permission_id);


--
-- Name: sys_role_subject_binding_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_role_subject_binding_active_idx ON public.sys_role_subject_binding USING btree (application_id, status, effective_at, expires_at);


--
-- Name: sys_role_tree_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_role_tree_idx ON public.sys_role USING btree (parent_id, sort_no);


--
-- Name: sys_role_user_period_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_role_user_period_key ON public.sys_role_user USING btree (role_id, user_id, effective_at);


--
-- Name: sys_tenant_tenant_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_tenant_tenant_code_key ON public.sys_tenant USING btree (tenant_code);


--
-- Name: sys_user_group_member_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sys_user_group_member_active_idx ON public.sys_user_group_member USING btree (user_id, application_id, status);


--
-- Name: sys_user_tenant_normalized_account_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_user_tenant_normalized_account_key ON public.sys_user USING btree (tenant_id, normalized_account);


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
-- Name: crm_customer_address crm_customer_address_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_customer_address
    ADD CONSTRAINT crm_customer_address_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.crm_customer(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: crm_customer_contact crm_customer_contact_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_customer_contact
    ADD CONSTRAINT crm_customer_contact_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.crm_customer(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: org_employee_assignment org_employee_assignment_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_employee_assignment org_employee_assignment_employee_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_employee_fk FOREIGN KEY (employee_id, tenant_id) REFERENCES public.org_employee(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_employee_assignment org_employee_assignment_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_org_fk FOREIGN KEY (org_unit_id, tenant_id) REFERENCES public.org_unit(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_employee_assignment org_employee_assignment_position_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_position_fk FOREIGN KEY (position_id, tenant_id) REFERENCES public.org_position(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_employee_assignment org_employee_assignment_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee_assignment
    ADD CONSTRAINT org_employee_assignment_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_employee org_employee_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee
    ADD CONSTRAINT org_employee_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_employee org_employee_tenant_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee
    ADD CONSTRAINT org_employee_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_employee org_employee_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employee
    ADD CONSTRAINT org_employee_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_employment org_employment_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employment
    ADD CONSTRAINT org_employment_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_employment org_employment_employee_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employment
    ADD CONSTRAINT org_employment_employee_fk FOREIGN KEY (employee_id, tenant_id) REFERENCES public.org_employee(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_employment org_employment_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_employment
    ADD CONSTRAINT org_employment_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_position org_position_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_position
    ADD CONSTRAINT org_position_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_position org_position_tenant_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_position
    ADD CONSTRAINT org_position_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_position org_position_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_position
    ADD CONSTRAINT org_position_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_unit org_unit_parent_id_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_unit
    ADD CONSTRAINT org_unit_parent_id_tenant_id_fkey FOREIGN KEY (parent_id, tenant_id) REFERENCES public.org_unit(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_unit org_unit_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_unit
    ADD CONSTRAINT org_unit_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_user_assignment org_user_assignment_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_user_assignment
    ADD CONSTRAINT org_user_assignment_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_user_assignment org_user_assignment_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_user_assignment
    ADD CONSTRAINT org_user_assignment_org_fk FOREIGN KEY (org_unit_id, tenant_id) REFERENCES public.org_unit(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_user_assignment org_user_assignment_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_user_assignment
    ADD CONSTRAINT org_user_assignment_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: org_user_assignment org_user_assignment_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_user_assignment
    ADD CONSTRAINT org_user_assignment_user_fk FOREIGN KEY (user_id, tenant_id) REFERENCES public.sys_user(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_application sys_application_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_application
    ADD CONSTRAINT sys_application_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_authorization_field sys_auth_field_resource_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_field
    ADD CONSTRAINT sys_auth_field_resource_fk FOREIGN KEY (resource_id) REFERENCES public.sys_authorization_resource(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_authorization_resource sys_auth_resource_app_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_auth_resource_app_fk FOREIGN KEY (application_id) REFERENCES public.sys_application(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_authorization_resource sys_authorization_resource_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_authorization_resource_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_authorization_resource sys_authorization_resource_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_authorization_resource
    ADD CONSTRAINT sys_authorization_resource_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_dictionary_item sys_dictionary_item_dictionary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_dictionary_item
    ADD CONSTRAINT sys_dictionary_item_dictionary_id_fkey FOREIGN KEY (dictionary_id) REFERENCES public.sys_dictionary(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_dictionary sys_dictionary_parent_id_system_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_dictionary
    ADD CONSTRAINT sys_dictionary_parent_id_system_code_fkey FOREIGN KEY (parent_id, system_code) REFERENCES public.sys_dictionary(id, system_code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_menu_action sys_menu_action_menu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_menu_action
    ADD CONSTRAINT sys_menu_action_menu_id_fkey FOREIGN KEY (menu_id) REFERENCES public.sys_menu(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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


--
-- Name: sys_page_button sys_page_button_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_button
    ADD CONSTRAINT sys_page_button_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.sys_page_resource(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_page_resource sys_page_resource_application_id_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_resource
    ADD CONSTRAINT sys_page_resource_application_id_tenant_id_fkey FOREIGN KEY (application_id, tenant_id) REFERENCES public.sys_application(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_page_resource sys_page_resource_parent_id_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_resource
    ADD CONSTRAINT sys_page_resource_parent_id_application_id_fkey FOREIGN KEY (parent_id, application_id) REFERENCES public.sys_page_resource(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_page_tab sys_page_tab_page_application_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_tab
    ADD CONSTRAINT sys_page_tab_page_application_fkey FOREIGN KEY (page_id, application_id) REFERENCES public.sys_page_resource(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_page_tab sys_page_tab_target_application_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_page_tab
    ADD CONSTRAINT sys_page_tab_target_application_fkey FOREIGN KEY (target_page_id, application_id) REFERENCES public.sys_page_resource(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_permission sys_permission_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_permission
    ADD CONSTRAINT sys_permission_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.sys_application(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_policy_revision sys_policy_revision_policy_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_policy_revision
    ADD CONSTRAINT sys_policy_revision_policy_fk FOREIGN KEY (policy_id) REFERENCES public.sys_role_data_policy(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_policy_revision sys_policy_revision_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_policy_revision
    ADD CONSTRAINT sys_policy_revision_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_role_data_policy sys_role_data_policy_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_policy
    ADD CONSTRAINT sys_role_data_policy_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_role_data_policy sys_role_data_policy_resource_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_policy
    ADD CONSTRAINT sys_role_data_policy_resource_fk FOREIGN KEY (resource_id, application_id) REFERENCES public.sys_authorization_resource(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_data_policy sys_role_data_policy_role_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_policy
    ADD CONSTRAINT sys_role_data_policy_role_fk FOREIGN KEY (role_id, application_id) REFERENCES public.sys_role(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_data_rule sys_role_data_rule_policy_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_data_rule
    ADD CONSTRAINT sys_role_data_rule_policy_fk FOREIGN KEY (policy_id) REFERENCES public.sys_role_data_policy(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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


--
-- Name: sys_role_group sys_role_group_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_group
    ADD CONSTRAINT sys_role_group_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.sys_application(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_list_view sys_role_list_view_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_list_view
    ADD CONSTRAINT sys_role_list_view_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.sys_role(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_list_view sys_role_list_view_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_list_view
    ADD CONSTRAINT sys_role_list_view_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.sys_system_list_view(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role sys_role_parent_application_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role
    ADD CONSTRAINT sys_role_parent_application_fkey FOREIGN KEY (parent_id, application_id) REFERENCES public.sys_role(id, application_id) ON DELETE RESTRICT;


--
-- Name: sys_role sys_role_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role
    ADD CONSTRAINT sys_role_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.sys_role(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_permission sys_role_permission_permission_id_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_permission
    ADD CONSTRAINT sys_role_permission_permission_id_application_id_fkey FOREIGN KEY (permission_id, application_id) REFERENCES public.sys_permission(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_permission sys_role_permission_role_id_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_permission
    ADD CONSTRAINT sys_role_permission_role_id_application_id_fkey FOREIGN KEY (role_id, application_id) REFERENCES public.sys_role(id, application_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_subject_binding sys_role_subject_binding_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_binding_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_role_subject_binding sys_role_subject_binding_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_binding_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_role_subject_binding sys_role_subject_group_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_group_fk FOREIGN KEY (group_id, application_id, tenant_id) REFERENCES public.sys_user_group(id, application_id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_subject_binding sys_role_subject_org_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_org_fk FOREIGN KEY (org_unit_id, tenant_id) REFERENCES public.org_unit(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_subject_binding sys_role_subject_role_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_subject_binding
    ADD CONSTRAINT sys_role_subject_role_fk FOREIGN KEY (role_id, application_id, tenant_id) REFERENCES public.sys_role(id, application_id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_user sys_role_user_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_user
    ADD CONSTRAINT sys_role_user_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.sys_role(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_role_user sys_role_user_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_role_user
    ADD CONSTRAINT sys_role_user_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.sys_user(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_user sys_user_employee_scope_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_employee_scope_fk FOREIGN KEY (employee_id, tenant_id) REFERENCES public.org_employee(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_user_group sys_user_group_app_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group
    ADD CONSTRAINT sys_user_group_app_fk FOREIGN KEY (application_id, tenant_id) REFERENCES public.sys_application(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_user_group sys_user_group_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group
    ADD CONSTRAINT sys_user_group_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_user_group_member sys_user_group_member_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group_member
    ADD CONSTRAINT sys_user_group_member_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_user_group_member sys_user_group_member_group_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group_member
    ADD CONSTRAINT sys_user_group_member_group_fk FOREIGN KEY (group_id, application_id, tenant_id) REFERENCES public.sys_user_group(id, application_id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_user_group_member sys_user_group_member_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group_member
    ADD CONSTRAINT sys_user_group_member_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_user_group_member sys_user_group_member_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group_member
    ADD CONSTRAINT sys_user_group_member_user_fk FOREIGN KEY (user_id, tenant_id) REFERENCES public.sys_user(id, tenant_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_user_group sys_user_group_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_group
    ADD CONSTRAINT sys_user_group_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE RESTRICT;


--
-- Name: sys_user_list_view sys_user_list_view_base_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_list_view
    ADD CONSTRAINT sys_user_list_view_base_view_id_fkey FOREIGN KEY (base_view_id) REFERENCES public.sys_system_list_view(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_user_list_view_preference sys_user_list_view_preference_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_list_view_preference
    ADD CONSTRAINT sys_user_list_view_preference_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.sys_user(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_user_list_view sys_user_list_view_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_user_list_view
    ADD CONSTRAINT sys_user_list_view_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.sys_user(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict scuinaEepNTIlNiwPUvstDzgLS3NzJyJ3TqnphDtaxnL9hfvO6vRTVAHI5R5Eul

