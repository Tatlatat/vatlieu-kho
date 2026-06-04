--
-- PostgreSQL database dump
--


-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14




--
-- Name: Document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Document" (
    id text NOT NULL,
    code text NOT NULL,
    type public."DocType" NOT NULL,
    status public."DocStatus" DEFAULT 'DRAFT'::public."DocStatus" NOT NULL,
    "docDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reason text,
    "warehouseId" text,
    "fromWarehouseId" text,
    "toWarehouseId" text,
    "supplierId" text,
    note text,
    "createdById" text NOT NULL,
    "approvedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "postedAt" timestamp(3) without time zone,
    "voidedAt" timestamp(3) without time zone,
    "voidedById" text
);


--
-- Name: DocumentLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DocumentLine" (
    id text NOT NULL,
    "documentId" text NOT NULL,
    "materialId" text NOT NULL,
    quantity double precision NOT NULL,
    note text
);


--
-- Name: Equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Equipment" (
    id text NOT NULL,
    name text NOT NULL,
    type text,
    "plateNo" text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: EquipmentLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EquipmentLog" (
    id text NOT NULL,
    "equipmentId" text NOT NULL,
    "logDate" timestamp(3) without time zone NOT NULL,
    hours double precision NOT NULL,
    note text,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Supplier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Supplier" (
    id text NOT NULL,
    name text NOT NULL,
    contact text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DocumentLine DocumentLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DocumentLine"
    ADD CONSTRAINT "DocumentLine_pkey" PRIMARY KEY (id);


--
-- Name: Document Document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY (id);


--
-- Name: EquipmentLog EquipmentLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EquipmentLog"
    ADD CONSTRAINT "EquipmentLog_pkey" PRIMARY KEY (id);


--
-- Name: Equipment Equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Equipment"
    ADD CONSTRAINT "Equipment_pkey" PRIMARY KEY (id);


--
-- Name: Supplier Supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY (id);


--
-- Name: DocumentLine_documentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DocumentLine_documentId_idx" ON public."DocumentLine" USING btree ("documentId");


--
-- Name: Document_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Document_code_key" ON public."Document" USING btree (code);


--
-- Name: Document_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Document_createdAt_idx" ON public."Document" USING btree ("createdAt");


--
-- Name: Document_type_status_docDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Document_type_status_docDate_idx" ON public."Document" USING btree (type, status, "docDate");


--
-- Name: EquipmentLog_equipmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EquipmentLog_equipmentId_idx" ON public."EquipmentLog" USING btree ("equipmentId");


--
-- Name: EquipmentLog_logDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EquipmentLog_logDate_idx" ON public."EquipmentLog" USING btree ("logDate");


--
-- Name: DocumentLine DocumentLine_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DocumentLine"
    ADD CONSTRAINT "DocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DocumentLine DocumentLine_materialId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DocumentLine"
    ADD CONSTRAINT "DocumentLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES public."Material"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Document Document_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Document Document_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Document Document_voidedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EquipmentLog EquipmentLog_equipmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EquipmentLog"
    ADD CONSTRAINT "EquipmentLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES public."Equipment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


