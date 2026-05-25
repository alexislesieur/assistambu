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

export interface Intervention {
  id: number;
  motif: string;
  categorie: "respi" | "cardio" | "trauma" | "neuro" | "pediatrie" | "psychiatrie" | "autre";
  patient_sexe: "m" | "f" | "inconnu";
  patient_age_range: "pedia" | "adult" | "senior" | "elderly" | null;
  adresse_depart: string | null;
  destination: string | null;
  heure_alerte: string | null;
  heure_depart: string | null;
  heure_arrivee: string | null;
  gestes: string[];
  constantes: {
    spo2: number | null;
    fc: number | null;
    pas: number | null;
    pad: number | null;
    temperature: number | null;
    temperature_display: string | null;
    dextro: number | null;
  };
  materiel_consomme: {
    sac_item_id: number;
    name: string;
    qty_used: number;
  }[];
  notes: string | null;
  is_locked: boolean;
  garde_id: number | null;
  type_mission: "commercial" | "samu" | null;
  garde: {
    id: number;
    date: string;
    type: "commercial" | "garde_dep";
    heure_debut: string;
    heure_fin: string;
  } | null;
  created_at: string;
}

export interface SacItem {
  id: number;
  name: string;
  slug: string | null;
  categorie: "oxygenotherapie" | "pansements" | "immobilisation" | "medicaments" | "monitoring" | "autre";
  qty_current: number;
  qty_max: number;
  qty_pct: number;
  dlc: string | null;
  status: "ok" | "warning" | "danger";
  note: string | null;
}

export interface Garde {
  id: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  duree_minutes: number;
  duree_heures: number;
  type: "commercial" | "garde_dep";
  binome: string | null;
  is_cloturee: boolean;
  is_running: boolean;
  cloturee_at: string | null;
  notes_recap: string | null;
  pauses: { debut: string; fin: string }[] | null;
  interventions_count: number | null;
  recurrence_id: number | null;
  created_at: string;
}

export type RecurrenceFrequence = "quotidien" | "hebdomadaire" | "bihebdomadaire" | "mensuel";

export interface Hopital {
  id: number;
  name: string;
  ville: string;
  departement: string;
  adresse: string | null;
  telephone: string | null;
  service_urgences: string | null;
}

export interface Protocole {
  id: number;
  slug: string;
  titre: string;
  categorie: "bilan" | "gestes" | "pathologies" | "lexique" | "reglementaire";
  contenu: string;
  tags: string[];
  is_premium: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}