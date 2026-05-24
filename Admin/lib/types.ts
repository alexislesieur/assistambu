export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_premium: boolean;
  is_admin: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface AdminUser extends User {
  is_locked: boolean;
  lock_reason: string | null;
  premium_expires_at: string | null;
  deleted_at: string | null;
  interventions_count: number;
  gardes_count: number;
}

export interface AdminStats {
  utilisateurs: {
    total: number;
    premium: number;
    actifs_7j: number;
    nouveaux_30j: number;
    bloques: number;
  };
  interventions: {
    total: number;
    aujourd_hui: number;
    ce_mois: number;
    par_categorie: Record<string, number>;
  };
  gardes: {
    total: number;
    ce_mois: number;
  };
}

export interface ServiceStatus {
  id: number;
  service: string;
  is_maintenance: boolean;
  message: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
