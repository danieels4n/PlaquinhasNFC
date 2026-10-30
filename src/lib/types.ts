export type PlateStatus = "unclaimed" | "pending" | "active" | "disabled";
export type DestinationType = "google_review" | "whatsapp" | "instagram" | "website" | "menu" | "other";

export type Plate = {
  id: string;
  token: string;
  code: string;
  product_label: string;
  owner_id: string | null;
  customer_id: string | null;
  status: PlateStatus;
  destination_type: DestinationType;
  destination_url: string | null;
  nickname: string;
  notes: string;
  sale_value: number | null;
  scans: number;
  claimed_at: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  name: string;
  segment: string;
  phone: string;
  notes: string;
  archived: boolean;
  created_at: string;
  stage: "lead" | "client";
  google_place_id: string | null;
  google_name: string;
  google_address: string;
  google_maps_url: string;
  google_phone: string;
  google_rating: number | null;
  google_reviews: number | null;
  google_checked_at: string | null;
  google_baseline_rating: number | null;
  google_baseline_reviews: number | null;
  google_baseline_at: string | null;
};

export type ActionState = { error?: string; ok?: string } | null;

export const STATUS_LABEL: Record<PlateStatus, string> = {
  unclaimed: "Sem dono",
  pending: "Aguardando configuração",
  active: "Ativa",
  disabled: "Desativada",
};

export const DESTINATION_LABEL: Record<DestinationType, string> = {
  google_review: "Avaliação no Google",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  website: "Site",
  menu: "Cardápio",
  other: "Outro link",
};
