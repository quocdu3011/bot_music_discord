const YouTube = require('youtube-sr').default;
const { LoadType } = require('shoukaku');

const MAX_PLAYLIST_SIZE = 25;
const YOUTUBE_URL_PATTERN =
  /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//i;

function isYouTubeUrl(value) {
  return YOUTUBE_URL_PATTERN.test(value);
}

function isPlaylistUrl(value) {
  return /[?&]list=/i.test(value);
}

function truncate(value, maxLength) {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function formatDuration(durationInMs) {
  if (!Number.isFinite(durationInMs) || durationInMs <= 0) {
    return 'LIVE';
  }

  const totalSeconds = Math.floor(durationInMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function ensurePlayableTrack(track) {
  if (!track?.encoded || !track.info) {
    throw new Error('Khong lay duoc du lieu bai hat tu Lavalink.');
  }

  if (track.info.sourceName !== 'youtube') {
    throw new Error('Bot chi ho tro nguon nhac tu YouTube.');
  }

  if (track.info.isStream) {
    throw new Error('Bot hien chua ho tro phat livestream YouTube.');
  }
}

function toTrack(track, requestedBy) {
  ensurePlayableTrack(track);

  return {
    encoded: track.encoded,
    title: track.info.title ?? 'Khong ro tieu de',
    url:
      track.info.uri ??
      `https://www.youtube.com/watch?v=${encodeURIComponent(track.info.identifier ?? '')}`,
    durationInMs: Number(track.info.length ?? 0),
    durationRaw: formatDuration(Number(track.info.length ?? 0)),
    thumbnail: track.info.artworkUrl ?? null,
    author: track.info.author ?? 'Khong ro tac gia',
    requestedBy
  };
}

function resolveIdentifier(query) {
  if (isYouTubeUrl(query)) {
    return query;
  }

  return `ytsearch:${query}`;
}

async function resolveTracks(node, query, requestedBy) {
  const trimmed = query.trim();

  if (!trimmed) {
    throw new Error('Ban can nhap ten bai hat hoac link YouTube.');
  }

  if (!node) {
    throw new Error('Lavalink chua san sang de tim nhac.');
  }

  if (/^https?:\/\//i.test(trimmed) && !isYouTubeUrl(trimmed)) {
    throw new Error('Bot chi ho tro link YouTube hoac tu khoa tim kiem.');
  }

  const result = await node.rest.resolve(resolveIdentifier(trimmed));

  if (!result) {
    throw new Error('Lavalink khong tra ve ket qua nao.');
  }

  if (result.loadType === LoadType.ERROR) {
    throw new Error(result.data?.message || 'Lavalink gap loi khi tai bai hat.');
  }

  if (result.loadType === LoadType.EMPTY) {
    throw new Error('Khong tim thay video phu hop tren YouTube.');
  }

  if (result.loadType === LoadType.TRACK) {
    return {
      kind: isPlaylistUrl(trimmed) ? 'playlist' : 'video',
      tracks: [toTrack(result.data, requestedBy)]
    };
  }

  if (result.loadType === LoadType.SEARCH) {
    const firstPlayable = result.data.find((track) => {
      try {
        ensurePlayableTrack(track);
        return true;
      } catch {
        return false;
      }
    });

    if (!firstPlayable) {
      throw new Error('Khong tim thay video YouTube co the phat duoc.');
    }

    return {
      kind: 'search',
      tracks: [toTrack(firstPlayable, requestedBy)]
    };
  }

  if (result.loadType === LoadType.PLAYLIST) {
    const converted = result.data.tracks
      .map((track) => {
        try {
          return toTrack(track, requestedBy);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const tracks = converted.slice(0, MAX_PLAYLIST_SIZE);

    if (tracks.length === 0) {
      throw new Error('Playlist khong co video hop le de phat.');
    }

    return {
      kind: 'playlist',
      title: result.data.info?.name ?? 'Playlist YouTube',
      truncated: converted.length > MAX_PLAYLIST_SIZE,
      tracks
    };
  }

  throw new Error('Lavalink tra ve kieu du lieu khong ho tro.');
}

async function autocompleteQuery(query) {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  if (isYouTubeUrl(trimmed)) {
    return [];
  }

  const results = await YouTube.search(trimmed, {
    limit: 10,
    type: 'video',
    safeSearch: false
  });

  return results
    .filter((video) => video.url && !video.private)
    .slice(0, 10)
    .map((video) => ({
      name: truncate(
        `${video.title ?? 'Khong ro tieu de'} (${video.durationFormatted ?? formatDuration((video.duration ?? 0) * 1000)})`,
        100
      ),
      value: video.url
    }));
}

module.exports = {
  MAX_PLAYLIST_SIZE,
  autocompleteQuery,
  resolveTracks
};
