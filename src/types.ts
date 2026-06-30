export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  locality: string;
  reputation: number;
  reportsCount: number;
  votesGiven: number;
  badge: string;
  role: "member" | "coordinator" | "admin";
  createdAt: string;
}

export interface Issue {
  id: string;
  title: string;
  desc: string;
  loc: string;
  locality: string;
  lat?: number;
  lng?: number;
  cat: "Road Damage" | "Water Leakage" | "Streetlight" | "Waste Management" | "Infrastructure" | "Public Safety" | "Electricity" | "Disaster Management" | "Other";
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in-progress" | "resolved";
  reporterName: string;
  reporterUid: string;
  votes: number;
  upvoters: string[];
  time: number;
  aiAnalysis?: string;
  authority?: string;
  imageUrl?: string;
  videoUrl?: string;
  isVerified?: boolean;
  verifiers?: string[];
  priorityJustification?: string;
  immediateCitizenSafetyAction?: string;
  logs?: { text: string; by: string; time: string; timestamp: number }[];
}

export interface CommunityMessage {
  id: string;
  locality: string;
  name: string;
  uid: string;
  text: string;
  timeString: string;
  timestamp: number;
  likes: number;
  likers: string[];
  official?: boolean;
}

export interface ActivityItem {
  id: string;
  text: string;
  color: string;
  time: string;
  timestamp: number;
}
