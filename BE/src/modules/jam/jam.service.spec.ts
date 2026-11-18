import { describe, it, expect, beforeEach } from 'vitest';
import { JamService } from './jam.service.js';

describe('JamService', () => {
  let service: JamService;

  beforeEach(() => {
    service = new JamService();
  });

  it('creates a room with a valid code and host', () => {
    const room = service.createRoom('Nguyễn Tuấn Đạt', 'user-123', {
      id: 'vpop-1',
      title: 'Đừng Làm Trái Tim Anh Đau',
      artist: 'Sơn Tùng M-TP',
      coverUrl: 'https://example.com/cover.jpg',
      duration: 278,
    });

    expect(room.id).toBeDefined();
    expect(room.code).toMatch(/^DMPT-[A-Z0-9]{4}$/);
    expect(room.hostName).toBe('Nguyễn Tuấn Đạt');
    expect(room.members.length).toBe(1);
    expect(room.members[0].isHost).toBe(true);
    expect(room.currentSong?.id).toBe('vpop-1');
  });

  it('allows members to join, handle actions, add reactions and leave', () => {
    const room = service.createRoom('Host', 'h-1');
    const joined = service.joinRoom(room.code, 'Bạn Lan', 'g-1');
    expect(joined).not.toBeNull();
    expect(joined?.members.length).toBe(2);

    // Member adds a reaction
    service.handleAction(room.code, {
      type: 'REACTION',
      emoji: '🔥',
      senderName: 'Bạn Lan',
    });

    const roomAfterRx = service.getRoom(room.code);
    expect(roomAfterRx?.reactions.length).toBe(1);
    expect(roomAfterRx?.reactions[0].emoji).toBe('🔥');

    // Host pauses
    service.handleAction(room.code, {
      type: 'PAUSE',
      time: 42.5,
    });

    const roomAfterPause = service.getRoom(room.code);
    expect(roomAfterPause?.isPlaying).toBe(false);
    expect(roomAfterPause?.currentTime).toBe(42.5);

    // Member leaves
    service.leaveRoom(room.code, 'g-1');
    const roomAfterLeave = service.getRoom(room.code);
    expect(roomAfterLeave?.members.length).toBe(1);
  });
});
