-- WhatsApp do funcionário, separado do telefone de recado: é por ele que os
-- links das funções são enviados pelo wa.me.
ALTER TABLE "funcionarios"
  ADD COLUMN IF NOT EXISTS "whatsapp" varchar(20);
