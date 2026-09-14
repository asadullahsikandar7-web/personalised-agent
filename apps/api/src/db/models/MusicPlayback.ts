import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { MUSIC_PROVIDERS, PLAYBACK_STATES } from '@personal-agent/shared';

const trackSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    album: { type: String },
    durationSeconds: { type: Number },
    artworkUrl: { type: String },
  },
  { _id: false },
);

const musicPlaybackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    provider: { type: String, enum: MUSIC_PROVIDERS, default: 'mock' },
    state: { type: String, enum: PLAYBACK_STATES, default: 'idle' },
    currentTrack: { type: trackSchema, default: null },
    positionSeconds: { type: Number, default: 0 },
    volume: { type: Number, default: 0.8, min: 0, max: 1 },
    history: { type: [trackSchema], default: [] },
  },
  { timestamps: true },
);

export type MusicPlaybackDoc = HydratedDocument<InferSchemaType<typeof musicPlaybackSchema>>;
export const MusicPlaybackModel = model('MusicPlayback', musicPlaybackSchema);
