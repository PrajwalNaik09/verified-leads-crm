export type KanbanStage = 'new' | 'contacted' | 'visit_scheduled' | 'closed';

export type PriorityTier = 'HOT' | 'WARM' | 'COOL';

export interface VerifiedLead {
  id: string;
  name: string;
  phone: string;
  propertyType: string;
  email: string;
  preferredLocation: string;
  callSummary: string;
  sentiment: string;
  timeline: string;
  budget: string;
  budgetNum: number; // parsed number
  furniturePref: string;
  propertyMatch: string;
  openToNearby: string;
  priorityScore: number;
  priorityTier: PriorityTier;
  stage: KanbanStage;
  notes: string;
  rawId: string;
  callDate: Date | null; // parsed from Date column in sheet
}

export interface StoredLeadOverride {
  stage: KanbanStage;
  notes: string;
}
