-- Insert test funcionário for login testing
INSERT INTO funcionarios (
  "condominioId", nome, cargo, email, ativo,
  "tipoFuncionario", "loginEmail", "loginUsuario",
  senha, "loginAtivo", "createdAt", "updatedAt"
) VALUES (
  1, 'Funcionário Teste', 'Zelador', 'teste@teste.com', true,
  'zelador', 'teste@teste.com', 'testefunc',
  '$2b$10$eeD9SRu8Ol1rG530OhGe9ukfoIsaVtd.J0JgA8M6xGI02RiBXLkYO', true,
  NOW(), NOW()
)
ON CONFLICT DO NOTHING
RETURNING id, nome, "loginEmail", "loginUsuario";
