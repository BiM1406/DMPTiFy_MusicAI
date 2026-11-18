import { Injectable, MessageEvent } from '@nestjs/common';
import { Subject, Observable, merge, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  JamRoom,
  JamMember,
  JamActionPayload,
  JamSongPayload,
  JamReaction,
} from './jam.types.js';

@Injectable()
export class JamService {
  private readonly rooms = new Map<string, JamRoom>();
  private readonly roomSubjects = new Map<string, Subject<JamRoom>>();

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'DMPT-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private getOrCreateSubject(roomId: string): Subject<JamRoom> {
    let subject = this.roomSubjects.get(roomId);
    if (!subject) {
      subject = new Subject<JamRoom>();
      this.roomSubjects.set(roomId, subject);
    }
    return subject;
  }

  public createRoom(
    hostName: string,
    hostId = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    initialSong: JamSongPayload | null = null,
    isPlaying = false,
    currentTime = 0,
  ): JamRoom {
    const code = this.generateRoomCode();
    const id = `room-${Date.now()}`;

    const hostMember: JamMember = {
      id: hostId,
      name: hostName || 'Nguyễn Tuấn Đạt',
      isHost: true,
      joinedAt: Date.now(),
    };

    const room: JamRoom = {
      id,
      code,
      hostId,
      hostName: hostMember.name,
      currentSong: initialSong,
      currentTime,
      isPlaying,
      lastUpdated: Date.now(),
      members: [hostMember],
      queue: initialSong ? [initialSong] : [],
      reactions: [],
    };

    this.rooms.set(id, room);
    this.rooms.set(code, room);
    return room;
  }

  public getRoom(codeOrId: string): JamRoom | null {
    const upper = codeOrId.trim().toUpperCase();
    return this.rooms.get(upper) ?? this.rooms.get(codeOrId) ?? null;
  }

  public joinRoom(
    codeOrId: string,
    memberName: string,
    memberId = `guest-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  ): JamRoom | null {
    const room = this.getRoom(codeOrId);
    if (!room) return null;

    const existingIndex = room.members.findIndex((m) => m.id === memberId);
    if (existingIndex >= 0) {
      room.members[existingIndex].name = memberName || room.members[existingIndex].name;
    } else {
      room.members.push({
        id: memberId,
        name: memberName || `Bạn ${room.members.length}`,
        isHost: false,
        joinedAt: Date.now(),
      });
    }

    room.lastUpdated = Date.now();
    this.notifyRoom(room);
    return room;
  }

  public leaveRoom(codeOrId: string, memberId: string): JamRoom | null {
    const room = this.getRoom(codeOrId);
    if (!room) return null;

    room.members = room.members.filter((m) => m.id !== memberId);
    room.lastUpdated = Date.now();
    this.notifyRoom(room);
    return room;
  }

  public handleAction(
    codeOrId: string,
    action: JamActionPayload,
    _senderId?: string,
  ): JamRoom | null {
    const room = this.getRoom(codeOrId);
    if (!room) return null;

    const now = Date.now();
    switch (action.type) {
      case 'PLAY':
        room.isPlaying = true;
        if (typeof action.time === 'number') room.currentTime = action.time;
        break;
      case 'PAUSE':
        room.isPlaying = false;
        if (typeof action.time === 'number') room.currentTime = action.time;
        break;
      case 'SEEK':
        if (typeof action.time === 'number') room.currentTime = action.time;
        break;
      case 'TRACK_CHANGE':
        if (action.song) {
          room.currentSong = action.song;
          room.currentTime = 0;
          room.isPlaying = true;
          if (!room.queue.some((s) => s.id === action.song?.id)) {
            room.queue.push(action.song);
          }
        }
        break;
      case 'QUEUE_ADD':
        if (action.song && !room.queue.some((s) => s.id === action.song?.id)) {
          room.queue.push(action.song);
        }
        break;
      case 'REACTION':
        if (action.emoji) {
          const reaction: JamReaction = {
            id: `rx-${now}-${Math.random().toString(36).substring(2, 6)}`,
            emoji: action.emoji,
            sender: action.senderName || 'Bạn bè',
            timestamp: now,
          };
          room.reactions.push(reaction);
          if (room.reactions.length > 20) {
            room.reactions = room.reactions.slice(-20);
          }
        }
        break;
    }

    room.lastUpdated = now;
    this.notifyRoom(room);
    return room;
  }

  public getRoomStream(codeOrId: string): Observable<MessageEvent> {
    const room = this.getRoom(codeOrId);
    if (!room) {
      return of({
        data: JSON.stringify({ error: 'ROOM_NOT_FOUND' }),
      } as MessageEvent);
    }

    const subject = this.getOrCreateSubject(room.id);
    const initial$ = of(room);

    return merge(initial$, subject).pipe(
      map(
        (updatedRoom) =>
          ({
            data: JSON.stringify(updatedRoom),
          }) as MessageEvent,
      ),
    );
  }

  private notifyRoom(room: JamRoom): void {
    const subject = this.roomSubjects.get(room.id);
    if (subject) {
      subject.next({ ...room, members: [...room.members], queue: [...room.queue] });
    }
  }
}
