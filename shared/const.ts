export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const SESSION_EXPIRY_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias (produção)
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/**
 * Papéis do vínculo `usuario_condominios`.
 * `chefe` responde por todas as unidades do cliente; `gestor`, só pelas suas.
 */
export const PAPEIS_UNIDADE = ['chefe', 'gestor'] as const;
export type PapelUnidade = (typeof PAPEIS_UNIDADE)[number];

/**
 * Marcador devolvido quando a conta ainda usa a senha padrão de implantação.
 * O client reconhece este código para abrir a troca obrigatória de senha.
 */
export const SENHA_PROVISORIA_ERR_MSG = 'SENHA_PROVISORIA';

/**
 * Senha do sistema: exatamente 6 dígitos numéricos.
 * Escolha de produto — o público digita no celular, e o teclado numérico com
 * tamanho fixo é mais rápido que uma senha livre. Vale para servidor e tela.
 */
export const SENHA_DIGITOS = 6;
export const SENHA_REGEX = /^\d{6}$/;
export const SENHA_ERR_MSG = 'A senha deve ter exatamente 6 dígitos numéricos';
