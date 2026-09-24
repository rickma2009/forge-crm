-- GENERATED REVIEW SNAPSHOT. DO NOT EDIT OR APPLY AS A MIGRATION.
-- See README.md; shared types/functions and referenced tables are required.

--
-- PostgreSQL database dump
--

\restrict 0aOLBA91JhWbtlsrJjkGVXZDniS493g3oicbeCnaUSoudMs2RY5Hn2aKB9rwJgH

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
-- Name: sd_quote_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sd_quote_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


