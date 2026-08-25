-- O gestor decide quais campos da O.S. o cliente dele enxerga.
--
-- Cada cliente usa um pedaço diferente da ordem: um não quer "quem pediu",
-- outro não usa setor, outro acha responsáveis redundante porque já designa a
-- equipe. Atender pedido a pedido apagando campo no código deixa o produto
-- refém do último a reclamar — e o campo que sumiu para um some para todos.
--
-- Aqui a escolha é dado, não código: a lista guarda os identificadores dos
-- blocos escondidos, e o formulário monta o que sobrou. Vazio (o padrão) é a
-- ordem completa, como sempre foi.
--
-- Título, unidade e prazo não entram na lista: sem eles o servidor recusa a
-- ordem, e permitir escondê-los seria oferecer um caminho para travar a tela.

ALTER TABLE "os_configuracoes" ADD COLUMN IF NOT EXISTS "camposOcultos" json;
