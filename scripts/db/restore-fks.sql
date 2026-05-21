-- Restore FK constraints dropped by CASCADE during drizzle-kit push
-- These belong to App Obras tables sharing the same database

ALTER TABLE "condominios" ADD CONSTRAINT "condominios_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "funcionarios"("id");
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "funcionarios"("id");
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "funcionarios"("id");
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "funcionarios"("id");
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "funcionarios"("id");
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "funcionarios"("id");
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "funcionarios"("id");
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "funcionarios"("id");
ALTER TABLE "comunicados" ADD CONSTRAINT "comunicados_enviado_por_fkey" FOREIGN KEY ("enviado_por") REFERENCES "funcionarios"("id");
