# Discord Music Bot (Node.js)

Bot Discord nay phat nhac tu YouTube vao voice channel bang Node.js.

## Tinh nang

- Phat nhac tu link video YouTube
- Tim bai bang tu khoa YouTube
- Ho tro playlist YouTube, tu dong them toi da 25 bai dau tien
- Hang doi rieng cho tung server
- Lenh co san: `play`, `skip`, `stop`, `leave`, `queue`, `pause`, `resume`

## Yeu cau

- Node.js `22.12.0` tro len
- Mot Discord bot token hop le
- Bat `Message Content Intent` trong Discord Developer Portal

## Cai dat

1. Cai dependency:

```bash
npm install
```

2. Tao file `.env` tu mau:

```bash
cp .env.example .env
```

3. Dien token bot vao `.env`:

```env
DISCORD_TOKEN=token_cua_ban
COMMAND_PREFIX=!
DISCONNECT_TIMEOUT_MS=180000
```

4. Chay bot:

```bash
npm start
```

## Quyen bot can co

Khi moi bot vao server, dam bao bot co cac quyen sau:

- `View Channels`
- `Send Messages`
- `Read Message History`
- `Connect`
- `Speak`

Neu muon bot doc lenh dang van ban, hay bat them `Message Content Intent` trong trang cai dat bot.

## Cach dung

- `!play <ten bai hat>`: tim va phat bai dau tien phu hop tren YouTube
- `!play <link YouTube>`: phat video hoac them playlist vao hang doi
- `!skip`: bo qua bai hien tai
- `!pause`: tam dung
- `!resume`: tiep tuc
- `!queue`: xem hang doi
- `!stop`: dung phat va xoa hang doi
- `!leave`: roi voice channel
- `!help`: xem danh sach lenh

## Luu y

- Bot chi lay nguon nhac tu YouTube.
- Livestream, video private va video chua phat hanh khong duoc ho tro.
- Playlist YouTube duoc gioi han 25 bai dau tien de tranh queue qua dai.
