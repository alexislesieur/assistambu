export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  statut: "ade" | "aux" | "etudiant";
  is_premium: boolean;
  is_admin: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}