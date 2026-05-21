// Sistema de permissões por módulo
export type UserRole = 'admin_master' | 'admin' | 'responsavel' | 'funcionario';

// Hierarquia: admin_master > admin > responsavel > funcionario
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin_master: 4,
  admin: 3,
  responsavel: 2,
  funcionario: 1,
};

export function hasRoleAtLeast(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export type ModuleId =
  | 'funcionarios'
  | 'equipe'
  | 'manutencao'
  | 'qrcode'
  | 'documentos'
  | 'agenda'
  | 'localizacao'
  | 'vistoria'
  | 'timeline';

export interface ModulePermission {
  moduleId: ModuleId;
  enabled: boolean;
}

export interface UserPermissions {
  userId: number;
  role: UserRole;
  modules: Record<ModuleId, boolean>;
}

// Módulos padrão: quais cada papel vê por default (antes do admin customizar)
export const DEFAULT_PERMISSIONS: Record<UserRole, Record<ModuleId, boolean>> = {
  admin_master: {
    funcionarios: true,
    equipe: true,
    manutencao: true,
    qrcode: true,
    documentos: true,
    agenda: true,
    localizacao: true,
    vistoria: true,
    timeline: true,
  },
  admin: {
    funcionarios: true,
    equipe: true,
    manutencao: true,
    qrcode: true,
    documentos: true,
    agenda: true,
    localizacao: true,
    vistoria: true,
    timeline: true,
  },
  responsavel: {
    funcionarios: true,
    equipe: true,
    manutencao: true,
    qrcode: true,
    documentos: true,
    agenda: true,
    localizacao: false,
    vistoria: true,
    timeline: false,
  },
  funcionario: {
    funcionarios: false,
    equipe: true,
    manutencao: true,
    qrcode: true,
    documentos: true,
    agenda: true,
    localizacao: false,
    vistoria: true,
    timeline: false,
  },
};

// Todos os módulos na ordem do menu
export const ALL_MODULES: ModuleId[] = [
  'funcionarios',
  'equipe',
  'manutencao',
  'qrcode',
  'documentos',
  'agenda',
  'localizacao',
  'vistoria',
  'timeline',
];
