export type SourceTag = "linkedin" | "instagram" | "both";

export interface EvidenceItem {
  source: SourceTag;
  quote: string;
  inference: string;
}

export interface Analysis {
  summary: string;
  needs: string[];
  hobbies: string[];
  interests: string[];
  values: string[];
  personality: string[];
  dealbreakers: string[];
  datingStyle: string;
  idealPartner: string;
  conversationStarters: string[];
  evidence: EvidenceItem[];
  agentPersona: string; // how the agent should speak/behave on this person's behalf
}

export interface LinkedInData {
  url: string;
  username: string;
  fullName?: string;
  headline?: string;
  summary?: string;
  location?: string;
  photo?: string;
  experiences: { title?: string; company?: string; description?: string; duration?: string }[];
  educations: { school?: string; degree?: string; field?: string }[];
  skills: string[];
  languages: string[];
  certifications: string[];
}

export interface InstagramData {
  url: string;
  username: string;
  fullName?: string;
  biography?: string;
  followers?: number;
  following?: number;
  postsCount?: number;
  isPrivate?: boolean;
  isVerified?: boolean;
  externalUrl?: string;
  photo?: string;
  posts: { caption: string; likes?: number; comments?: number; type?: string; url?: string; hashtags?: string[] }[];
}

export interface Person {
  id: string;
  name: string;
  headline: string;
  location?: string;
  photo?: string;
  links: { linkedin: string; instagram: string };
  linkedin: LinkedInData;
  instagram: InstagramData;
  analysis: Analysis;
  createdAt: string;
}

export interface Turn {
  speakerId: string;
  speakerName: string;
  text: string;
  round: number;
}

export interface Debrief {
  score: number; // 1-10
  wouldSeeAgain: boolean;
  highlights: string[];
  concerns: string[];
  verdict: string;
}

export interface DateRecord {
  id: string;
  aId: string;
  bId: string;
  venue: string;
  transcript: Turn[];
  debriefA: Debrief;
  debriefB: Debrief;
  mutualScore: number; // 0-100
  createdAt: string;
}

export interface PreScore {
  aId: string;
  bId: string;
  score: number; // 0-100
  reasons: string[];
  createdAt: string;
}

export interface RankingEntry {
  personId: string;
  name: string;
  photo?: string;
  headline: string;
  score: number; // 0-100
  basis: "date" | "prescore";
  dateId?: string;
  reasons: string[];
}
