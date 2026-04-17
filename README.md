# Discord Music Bot (Node.js + Lavalink)

Bot Discord nay phat nhac YouTube vao voice channel bang `discord.js`, `Shoukaku` va `Lavalink`.

Ban nay duoc chinh lai de phat nhac qua Lavalink thay vi stream truc tiep tu Node.js. Cach nay on dinh hon ro ret cho bot rieng, giam loi `Invalid URL`, `Failed to find any playable formats` va cac loi phat YouTube truc tiep.

## Tinh nang

- Slash commands, khong can `Message Content Intent`
- `/play <ten bai hat | link YouTube>`
- `/skip`
- `/stop`
- `/leave`
- `/queue`
- `/pause`
- `/resume`
- Tim nhac YouTube theo tu khoa
- Ho tro playlist YouTube, gioi han 25 bai dau tien
- Queue rieng cho tung server
- Tu dong roi voice channel khi hang doi trong lau

## Kien truc

- Bot Node.js chi xu ly Discord commands, queue va trang thai player
- Lavalink xu ly voice + load track
- Plugin `youtube-source` cua Lavalink xu ly YouTube

## Yeu cau

- Node.js `22.12.0` tro len
- Docker + Docker Compose de chay Lavalink
- Discord bot token hop le
- `DISCORD_CLIENT_ID` de deploy slash commands

## Cai dat

1. Cai dependency:

```bash
npm install
```

2. Tao file `.env`:

```bash
cp .env.example .env
```

3. Dien thong tin vao `.env`:

```env
DISCORD_TOKEN=token_cua_ban
DISCORD_CLIENT_ID=application_id_cua_bot
DISCORD_GUILD_ID=id_server_de_test
DISCORD_GUILD_IDS=id_server_1,id_server_2
DISCONNECT_TIMEOUT_MS=180000
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
LAVALINK_NODE_NAME=local
```

`DISCORD_GUILD_ID` la tuy chon neu chi dang ky cho 1 server test.
`DISCORD_GUILD_IDS` la tuy chon neu muon dang ky nhanh cho nhieu server test, cach nhau bang dau phay.
Neu dat ca hai bien, script se lay tat ca guild IDs khong trung nhau.

4. Khoi dong Lavalink:

```bash
docker compose up -d
```

Neu may cua ban dung Docker Compose kieu cu va khong ho tro `docker compose`, dung:

```bash
docker-compose up -d
```

Neu muon xem log Lavalink:

```bash
docker compose logs -f lavalink
```

Hoac voi Docker Compose cu:

```bash
docker-compose logs -f lavalink
```

5. Dang ky slash commands:

```bash
npm run deploy
```

6. Chay bot:

```bash
npm start
```

## Quyen bot can co

- `View Channels`
- `Send Messages`
- `Read Message History`
- `Connect`
- `Speak`

Neu voice channel co `user limit`, bot co the can them `Move Members`.

## Cach dung

- `/play <ten bai hat>`: tim tren YouTube va phat bai dau tien
- `/play <link YouTube>`: phat video hoac them playlist vao queue
- `/skip`: bo qua bai dang phat
- `/pause`: tam dung
- `/resume`: tiep tuc
- `/queue`: xem hang doi
- `/stop`: dung phat va xoa queue
- `/leave`: roi voice channel

## File quan trong

- `src/index.js`: khoi dong Discord client va Lavalink connector
- `src/music/lavalink.js`: cau hinh Shoukaku/Lavalink
- `src/music/player-manager.js`: quan ly player theo guild
- `src/music/subscription.js`: queue, playback flow va auto-leave
- `src/music/resolver.js`: resolve query YouTube qua Lavalink
- `docker-compose.yml`: chay Lavalink bang Docker
- `lavalink/application.yml`: cau hinh Lavalink + youtube plugin

## Ghi chu van hanh

- Bot chi ho tro YouTube va tim kiem YouTube.
- Livestream YouTube khong duoc ho tro.
- Playlist YouTube chi nap 25 bai dau tien de tranh queue qua dai.
- Neu `/play` bao Lavalink chua san sang, hay kiem tra `docker compose ps` va log Lavalink.
- Neu bot dang chay tren may khac voi Lavalink, doi `LAVALINK_HOST`, `LAVALINK_PORT`, `LAVALINK_PASSWORD` cho dung.
- Ban compose hien tai khong mount `plugins` va `logs` ra ngoai nua. Cach nay tranh loi quyen ghi cua image Lavalink tren may ca nhan. Plugin YouTube se duoc container tu tai ve khi khoi dong.
