import { Injectable } from '@nestjs/common';
import type { MoodType } from '../../common/types/domain.types.js';

export interface MoodAnalysisResult {
  mood: MoodType;
  targetBpm: number;
  moodLabel: string;
  empathyReply: string;
  playlistTitle: string;
}

interface FallbackRule {
  keywords: string[];
  result: MoodAnalysisResult;
}

const FALLBACK_RULES: FallbackRule[] = [
  {
    keywords: ['buồn', 'mưa', 'áp lực', 'mệt'],
    result: {
      mood: 'sad',
      targetBpm: 68,
      moodLabel: 'U Buồn & Hoài Niệm (Sad / Healing)',
      empathyReply:
        'Nghe anh chia sẻ em hiểu anh đang phải trải qua một ngày nhiều áp lực. Đừng quá khắt khe với bản thân nhé, em đã chọn cho anh một liều thuốc âm nhạc dịu êm dưới đây:',
      playlistTitle: 'Vỗ Về Ngày Mưa (AI Mix)',
    },
  },
  {
    keywords: ['ăn mừng', 'quẩy', 'vui', 'năng lượng'],
    result: {
      mood: 'energetic',
      targetBpm: 115,
      moodLabel: 'Năng Động & Phấn Khởi (Energetic)',
      empathyReply:
        'Tuyệt vời quá anh ơi! Chúc mừng anh với nguồn năng lượng tích cực hôm nay. Cùng bật nhạc sôi động lên để sạc đầy hứng khởi nào!',
      playlistTitle: 'Sạc Đầy Năng Lượng (AI Mix)',
    },
  },
  {
    keywords: ['tập trung', 'code', 'học'],
    result: {
      mood: 'focus',
      targetBpm: 72,
      moodLabel: 'Tập Trung Cao Độ (Alpha Waves - Focus)',
      empathyReply:
        'Em đã lọc ra các bản nhạc nhịp điệu 72 BPM chuẩn sóng não Alpha, giúp anh tập trung tối đa mà không bị xao nhãng:',
      playlistTitle: 'Deep Focus Coding (AI Mix)',
    },
  },
  {
    keywords: ['mộc', 'acoustic', 'ngủ'],
    result: {
      mood: 'acoustic',
      targetBpm: 82,
      moodLabel: 'Mộc Mạc & Thư Thái (Acoustic)',
      empathyReply:
        'Những giai điệu Acoustic mộc mạc, nhẹ nhàng sẽ giúp anh thả lỏng tâm trí và nghỉ ngơi thật êm ái:',
      playlistTitle: 'Acoustic Dịu Êm (AI Mix)',
    },
  },
];

const DEFAULT_CHILL_RESULT: MoodAnalysisResult = {
  mood: 'chill',
  targetBpm: 78,
  moodLabel: 'Thư Giãn & Chill (Chill)',
  empathyReply:
    'Em đã lắng nghe câu chuyện của anh. Hãy để những giai điệu thư giãn này xoa dịu tâm trí anh nhé!',
  playlistTitle: 'Chill Thư Giãn (AI Mix)',
};

@Injectable()
export class MoodFallbackEngine {
  analyze(message: string): MoodAnalysisResult {
    const lower = message.toLowerCase();
    for (const rule of FALLBACK_RULES) {
      if (rule.keywords.some((kw) => lower.includes(kw))) {
        return { ...rule.result };
      }
    }
    return { ...DEFAULT_CHILL_RESULT };
  }
}
