export interface OpenApiSpec {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string; description: string }>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
  };
  paths: Record<string, Record<string, unknown>>;
}

export function buildOpenApiDocument(): OpenApiSpec {
  return {
    openapi: '3.1.0',
    info: {
      title: 'DMPTiFy Music AI API',
      version: '1.0.0',
      description:
        'NestJS 12 + MySQL 8 (Prisma 3NF) Backend API cho nền tảng nghe nhạc theo cảm xúc DMPTiFy (CS445). Phân hệ thanh toán VNPay được tạm hoãn theo phạm vi hiện tại.',
    },
    servers: [{ url: '/', description: 'DMPTiFy Local / Active Origin' }],
    tags: [
      { name: 'Health', description: 'Kiểm tra trạng thái dịch vụ và kết nối MySQL' },
      { name: 'Catalog', description: 'Kho bài hát, Bảng xếp hạng, Karaoke LRC & Playlists' },
      { name: 'Auth & Users', description: 'Đăng ký, Đăng nhập JWT & Google OAuth 2.0' },
      { name: 'AI Mood', description: 'Trợ lý phân tích cảm xúc Gemini 2.5 Flash & Gợi ý BPM' },
      { name: 'Media', description: 'Quản trị upload audio/cover/lyrics Cloudinary (ADMIN)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Bearer JWT trả về từ /api/v1/auth/login, /register hoặc /google',
        },
      },
      schemas: {
        SongDto: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'song-1' },
            title: { type: 'string', example: 'Chuyện Đôi Ta' },
            artist: { type: 'string', example: 'Emcee L ft. Muộii' },
            album: { type: 'string', example: 'Acoustic Healing' },
            duration: { type: 'integer', example: 30 },
            mood: {
              type: 'string',
              enum: ['chill', 'sad', 'energetic', 'focus', 'acoustic'],
            },
            moodLabel: { type: 'string', example: 'Thư giãn & Chill' },
            bpm: { type: 'integer', example: 78 },
            liked: { type: 'boolean', example: true },
            playCount: { type: 'integer', example: 1280 },
            youtubeVideoId: { type: 'string', example: 'dQw4w9WgXcQ' },
          },
        },
        PlaylistDto: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'pl-1' },
            title: { type: 'string', example: 'Vỗ Về Ngày Mưa' },
            description: { type: 'string' },
            songIds: { type: 'array', items: { type: 'string' } },
            songsCount: { type: 'integer' },
            mood: { type: 'string' },
            isAiGenerated: { type: 'boolean' },
          },
        },
        AuthenticatedUser: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'user-dat-01' },
            email: { type: 'string', example: 'dat.nguyen@dtu.edu.vn' },
            fullName: { type: 'string', example: 'Nguyễn Tuấn Đạt' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            planTier: { type: 'string', enum: ['FREE', 'VIP'] },
          },
        },
      },
    },
    paths: {
      '/api/v1/health': {
        get: {
          tags: ['Health'],
          summary: 'Kiểm tra sức khỏe BE & kết nối MySQL',
          responses: { '200': { description: 'Trạng thái dịch vụ và DB driver' } },
        },
      },
      '/api/v1/songs': {
        get: {
          tags: ['Catalog'],
          summary: 'Danh sách bài hát (hỗ trợ lọc mood, từ khóa q, view và phân trang)',
          parameters: [
            { name: 'mood', in: 'query', schema: { type: 'string' }, description: 'all | chill | sad | energetic | focus | acoustic | liked' },
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Từ khóa tìm theo tên bài hát, nghệ sĩ, tâm trạng' },
            { name: 'view', in: 'query', schema: { type: 'string' }, description: 'discover | charts | library' },
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 }, description: 'Trang hiện tại (tùy chọn)' },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 }, description: 'Số bài mỗi trang (tùy chọn)' },
          ],
          responses: { '200': { description: 'Danh sách bài hát chuẩn ApiResponse<SongDto[]>' } },
        },
      },
      '/api/v1/songs/charts': {
        get: {
          tags: ['Catalog'],
          summary: 'Bảng xếp hạng sắp xếp theo playCount giảm dần',
          responses: { '200': { description: 'Top bài hát nghe nhiều' } },
        },
      },
      '/api/v1/songs/youtube-search': {
        get: {
          tags: ['Catalog'],
          summary: 'Tìm kiếm và cache bài hát V-Pop / YouTube Music kèm ảnh bìa vuông 600x600',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string', default: 'Bước Qua Nhau Vũ' },
              description: 'Tên bài hát hoặc nghệ sĩ cần tìm trên YouTube Music',
            },
          ],
          responses: {
            '200': { description: 'Danh sách bài hát đã cache chuẩn ApiResponse<SongDto[]>' },
          },
        },
      },
      '/api/v1/songs/{id}': {
        get: {
          tags: ['Catalog'],
          summary: 'Chi tiết một bài hát',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', default: 'song-1' } }],
          responses: { '200': { description: 'Thông tin bài hát' }, '404': { description: 'Không tìm thấy bài hát' } },
        },
      },
      '/api/v1/songs/{id}/lyrics': {
        get: {
          tags: ['Catalog'],
          summary: 'Lời bài hát 2 tầng (Karaoke LRC đồng bộ hoặc lời văn bản từ LRCLIB)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', default: 'song-1' } }],
          responses: { '200': { description: 'Nội dung isSynced, rawLrc, plainLyrics và mảng lines [{ time, text }]' } },
        },
      },
      '/api/v1/songs/{id}/resolve-embeddable': {
        post: {
          tags: ['Catalog'],
          summary: 'Tìm video YouTube embeddable thay thế khi video hiện tại bị chặn nhúng (error 101/150)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', default: 'vpop-6' } }],
          responses: {
            '200': { description: 'SongDto sau khi cập nhật youtubeVideoId & audioUrl mới' },
            '404': { description: 'Không tìm thấy bài hát' },
          },
        },
      },
      '/api/v1/songs/{id}/play': {
        post: {
          tags: ['Catalog'],
          summary: 'Ghi nhận lượt nghe để cập nhật Bảng xếp hạng',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', default: 'song-1' } }],
          responses: { '200': { description: 'Bài hát sau khi tăng playCount' } },
        },
      },
      '/api/v1/songs/{id}/like': {
        post: {
          tags: ['Catalog'],
          summary: 'Thích / bỏ thích bài hát',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', default: 'song-1' } }],
          responses: { '200': { description: 'Trạng thái liked mới' } },
        },
      },
      '/api/v1/playlists': {
        get: {
          tags: ['Catalog'],
          summary: 'Danh sách playlist đề xuất và playlist của người dùng',
          responses: { '200': { description: 'Mảng PlaylistDto' } },
        },
        post: {
          tags: ['Catalog'],
          summary: 'Tạo playlist mới',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            example: { title: 'Nhạc Chill Đêm Khuya', mood: 'chill', songIds: ['song-1', 'song-3'] },
          },
          responses: { '201': { description: 'Playlist mới được tạo' } },
        },
      },
      '/api/v1/playlists/{id}/songs': {
        patch: {
          tags: ['Catalog'],
          summary: 'Cập nhật danh sách bài hát trong playlist',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', default: 'pl-1' } }],
          requestBody: { required: true, example: { songIds: ['song-1', 'song-2'] } },
          responses: { '200': { description: 'Playlist sau khi cập nhật' } },
        },
      },
      '/api/v1/auth/register': {
        post: {
          tags: ['Auth & Users'],
          summary: 'Đăng ký tài khoản mới',
          requestBody: {
            required: true,
            example: {
              fullName: 'Nguyễn Văn A',
              email: 'nguyenvana@dtu.edu.vn',
              password: 'password123',
            },
          },
          responses: { '201': { description: 'Trả accessToken JWT và hồ sơ người dùng' } },
        },
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['Auth & Users'],
          summary: 'Đăng nhập bằng email và mật khẩu',
          requestBody: {
            required: true,
            example: {
              email: 'nguyenvana@dtu.edu.vn',
              password: 'password123',
            },
          },
          responses: { '200': { description: 'Trả accessToken JWT và hồ sơ người dùng' } },
        },
      },
      '/api/v1/auth/google': {
        post: {
          tags: ['Auth & Users'],
          summary: 'Đăng nhập bằng Google ID Token (hỗ trợ mock-google sandbox)',
          requestBody: {
            required: true,
            example: { idToken: 'mock-google:dat.nguyen@dtu.edu.vn:Nguyễn Tuấn Đạt' },
          },
          responses: { '200': { description: 'Trả accessToken JWT và hồ sơ người dùng' } },
        },
      },
      '/api/v1/auth/me': {
        get: {
          tags: ['Auth & Users'],
          summary: 'Lấy thông tin tài khoản hiện tại từ Bearer JWT',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Hồ sơ AuthenticatedUser' }, '401': { description: 'Thiếu hoặc sai Bearer token' } },
        },
      },
      '/api/v1/users/me': {
        get: {
          tags: ['Auth & Users'],
          summary: 'Hồ sơ chi tiết người dùng hiện tại',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Hồ sơ người dùng' }, '401': { description: 'Chưa xác thực' } },
        },
      },
      '/api/v1/ai/chat': {
        post: {
          tags: ['AI Mood'],
          summary: 'Phân tích tâm trạng và đề xuất bài hát theo BPM (Gemini 2.5 Flash / Fallback)',
          requestBody: {
            required: true,
            example: { message: 'Hôm nay mưa buồn, áp lực thi cử mệt mỏi quá', createPlaylist: false },
          },
          responses: { '201': { description: 'Kết quả phân tích tâm trạng, BPM mục tiêu và danh sách bài hát gợi ý' } },
        },
      },
      '/api/v1/ai/history': {
        get: {
          tags: ['AI Mood'],
          summary: 'Lịch sử trò chuyện cảm xúc gần đây',
          responses: { '200': { description: 'Danh sách AiChatLogRecord' } },
        },
      },
      '/api/v1/media/upload': {
        post: {
          tags: ['Media'],
          summary: 'Upload tệp audio/cover/lyrics lên Cloudinary (yêu cầu quyền ADMIN)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            example: { fileName: 'demo-track.mp3', resourceType: 'video', folder: 'dmptify/tracks' },
          },
          responses: { '201': { description: 'Thông tin asset Cloudinary / Sandbox' }, '403': { description: 'Chỉ ADMIN được phép gọi' } },
        },
      },
    },
  };
}

export function renderSwaggerExplorerHtml(): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DMPTiFy API Docs · OpenAPI 3.1</title>
  <style>
    :root {
      --bg: #0b0f17;
      --panel: #121826;
      --raised: #182133;
      --border: rgba(255, 255, 255, 0.1);
      --text: #f1f5f9;
      --muted: #94a3b8;
      --accent: #10b981;
      --get: #0ea5e9;
      --post: #10b981;
      --patch: #f59e0b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 24px 16px 64px; }
    header {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 20px;
    }
    h1 { margin: 0 0 6px; font-size: 22px; font-weight: 600; }
    .sub { margin: 0; color: var(--muted); font-size: 14px; }
    .auth-bar {
      margin-top: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    input, textarea {
      background: var(--raised);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
    }
    .auth-bar input { flex: 1; min-width: 240px; }
    button {
      cursor: pointer;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 14px;
      font-size: 13px;
      font-weight: 600;
      background: var(--raised);
      color: var(--text);
    }
    button.primary { background: #047857; border-color: #10b981; color: #fff; }
    button.primary:hover { background: #059669; }
    .tag-group { margin-top: 22px; }
    .tag-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--accent);
      margin: 0 0 10px;
    }
    .op-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .op-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      cursor: pointer;
    }
    .method {
      min-width: 62px;
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      color: #090d16;
    }
    .m-get { background: var(--get); }
    .m-post { background: var(--post); }
    .m-patch { background: var(--patch); }
    .path { font-family: ui-monospace, monospace; font-size: 13px; font-weight: 600; }
    .summary { color: var(--muted); font-size: 13px; margin-left: auto; }
    .op-body {
      display: none;
      border-top: 1px solid var(--border);
      padding: 14px;
      background: rgba(255, 255, 255, 0.01);
    }
    .op-card.open .op-body { display: block; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; align-items: center; }
    .row label { font-size: 12px; color: var(--muted); min-width: 100px; }
    textarea { width: 100%; min-height: 92px; margin-bottom: 10px; }
    pre {
      margin: 10px 0 0;
      padding: 12px;
      border-radius: 8px;
      background: #060911;
      border: 1px solid var(--border);
      overflow-x: auto;
      font-size: 12px;
      color: #cbd5e1;
    }
    .status-line { font-size: 12px; color: var(--muted); margin-top: 8px; }
    a { color: #34d399; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1 id="api-title">DMPTiFy Music AI · API Docs</h1>
      <p class="sub" id="api-desc">Đang tải OpenAPI 3.1 specification…</p>
      <div class="auth-bar">
        <input id="jwt-input" type="text" placeholder="Dán Bearer JWT Token tại đây hoặc bấm nút Đăng nhập nhanh…" aria-label="Bearer JWT Token" />
        <button type="button" class="primary" id="quick-google-btn">Đăng nhập nhanh Google Sandbox (Nguyễn Tuấn Đạt)</button>
        <a href="/api/docs/openapi.json" target="_blank" rel="noreferrer">Tải OpenAPI JSON</a>
      </div>
      <div class="status-line" id="auth-status"></div>
    </header>
    <main id="ops-root"></main>
  </div>
  <script>
    (function () {
      const jwtInput = document.getElementById('jwt-input');
      const authStatus = document.getElementById('auth-status');
      const root = document.getElementById('ops-root');

      document.getElementById('quick-google-btn').addEventListener('click', async () => {
        authStatus.textContent = 'Đang xác thực Google Sandbox…';
        try {
          const res = await fetch('/api/v1/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: 'mock-google:dat.nguyen@dtu.edu.vn:Nguyễn Tuấn Đạt' })
          });
          const data = await res.json();
          if (data && data.data && data.data.accessToken) {
            jwtInput.value = data.data.accessToken;
            authStatus.textContent = 'Đã gán Bearer JWT cho ' + data.data.user.fullName + ' (' + data.data.user.email + ').';
          } else {
            authStatus.textContent = 'Không lấy được token: ' + JSON.stringify(data);
          }
        } catch (err) {
          authStatus.textContent = 'Lỗi kết nối: ' + String(err);
        }
      });

      fetch('/api/docs/openapi.json')
        .then((r) => r.json())
        .then((spec) => {
          document.getElementById('api-title').textContent = spec.info.title + ' · v' + spec.info.version;
          document.getElementById('api-desc').textContent = spec.info.description;

          const groups = {};
          Object.entries(spec.paths || {}).forEach(([path, methods]) => {
            Object.entries(methods).forEach(([method, op]) => {
              const tag = (op.tags && op.tags[0]) || 'General';
              if (!groups[tag]) groups[tag] = [];
              groups[tag].push({ path, method, op });
            });
          });

          Object.entries(groups).forEach(([tag, items]) => {
            const sec = document.createElement('section');
            sec.className = 'tag-group';
            const h2 = document.createElement('h2');
            h2.className = 'tag-title';
            h2.textContent = tag;
            sec.appendChild(h2);

            items.forEach(({ path, method, op }) => {
              const card = document.createElement('div');
              card.className = 'op-card';

              const head = document.createElement('div');
              head.className = 'op-head';
              head.innerHTML =
                '<span class="method m-' + method + '">' + method.toUpperCase() + '</span>' +
                '<span class="path"></span>' +
                '<span class="summary"></span>';
              head.querySelector('.path').textContent = path;
              head.querySelector('.summary').textContent = op.summary || '';
              head.addEventListener('click', () => card.classList.toggle('open'));

              const body = document.createElement('div');
              body.className = 'op-body';

              const inputs = [];
              (op.parameters || []).forEach((param) => {
                const row = document.createElement('div');
                row.className = 'row';
                const lbl = document.createElement('label');
                lbl.textContent = param.name + ' (' + param.in + ')';
                const inp = document.createElement('input');
                inp.placeholder = param.description || '';
                inp.value = param.schema && param.schema.default ? String(param.schema.default) : '';
                inputs.push({ param, inp });
                row.appendChild(lbl);
                row.appendChild(inp);
                body.appendChild(row);
              });

              let bodyArea = null;
              if (op.requestBody) {
                bodyArea = document.createElement('textarea');
                bodyArea.value = JSON.stringify(op.requestBody.example || {}, null, 2);
                body.appendChild(bodyArea);
              }

              const execBtn = document.createElement('button');
              execBtn.type = 'button';
              execBtn.className = 'primary';
              execBtn.textContent = 'Thực thi (' + method.toUpperCase() + ')';
              const pre = document.createElement('pre');
              pre.textContent = 'Bấm Thực thi để gọi API thật…';

              execBtn.addEventListener('click', async () => {
                let targetPath = path;
                const query = new URLSearchParams();
                inputs.forEach(({ param, inp }) => {
                  const val = inp.value.trim();
                  if (param.in === 'path') {
                    targetPath = targetPath.replace('{' + param.name + '}', encodeURIComponent(val || 'song-1'));
                  } else if (param.in === 'query' && val) {
                    query.set(param.name, val);
                  }
                });
                const qs = query.toString();
                const url = qs ? targetPath + '?' + qs : targetPath;
                const headers = {};
                const token = jwtInput.value.trim();
                if (token) headers['Authorization'] = 'Bearer ' + token;
                const init = { method: method.toUpperCase(), headers };
                if (bodyArea) {
                  headers['Content-Type'] = 'application/json';
                  init.body = bodyArea.value;
                }
                try {
                  const res = await fetch(url, init);
                  const txt = await res.text();
                  try {
                    pre.textContent = 'HTTP ' + res.status + '\\n' + JSON.stringify(JSON.parse(txt), null, 2);
                  } catch {
                    pre.textContent = 'HTTP ' + res.status + '\\n' + txt;
                  }
                } catch (err) {
                  pre.textContent = 'Request error: ' + String(err);
                }
              });

              body.appendChild(execBtn);
              body.appendChild(pre);
              card.appendChild(head);
              card.appendChild(body);
              sec.appendChild(card);
            });

            root.appendChild(sec);
          });
        })
        .catch((err) => {
          document.getElementById('api-desc').textContent = 'Lỗi tải OpenAPI JSON: ' + String(err);
        });
    })();
  </script>
</body>
</html>`;
}
