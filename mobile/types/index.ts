export type ArtistState =
  | "working"
  | "thinking"
  | "stuck"
  | "experimenting"
  | "exploring"
  | "refining"
  | "destroying"
  | "restarting";

export type ArtistMedium =
  | "painting"
  | "drawing"
  | "sculpture"
  | "writing"
  | "photography"
  | "mixed media";

export type ReactionType = "fire" | "mind_blown" | "eyes" | "brain";

export interface ArtistMoment {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatar?: string;
  imageUri: string;
  note?: string;
  state: ArtistState;
  medium: ArtistMedium;
  createdAt: string;
  reactions?: Record<ReactionType, number>;
  myReaction?: ReactionType | null;
}

export interface ArtistProfile {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  ritualPosts: number;
  streak: number;
  exhibitions: number;
  activityLogs: number;
}
