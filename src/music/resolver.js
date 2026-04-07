const play = require('play-dl');

const MAX_PLAYLIST_SIZE = 25;

function isUrl(value) {
  return /^https?:\/\//i.test(value);
}

function ensurePlayableVideo(video) {
  if (!video) {
    throw new Error('Không lấy được thông tin video từ YouTube.');
  }

  if (video.private) {
    throw new Error('Video YouTube này đang ở trạng thái private.');
  }

  if (video.live) {
    throw new Error('Bot hiện chưa hỗ trợ phát livestream YouTube.');
  }

  if (video.upcoming) {
    throw new Error('Video YouTube này chưa được phát hành.');
  }
}

function toTrack(video, requestedBy) {
  ensurePlayableVideo(video);

  return {
    title: video.title ?? 'Không rõ tiêu đề',
    url: video.url,
    durationInSec: Number(video.durationInSec ?? 0),
    durationRaw: video.durationRaw ?? 'Không rõ thời lượng',
    requestedBy
  };
}

async function resolveTracks(query, requestedBy) {
  const validation = await play.validate(query);

  if (validation === 'yt_video') {
    const info = await play.video_basic_info(query);

    return {
      kind: 'video',
      tracks: [toTrack(info.video_details, requestedBy)]
    };
  }

  if (validation === 'yt_playlist') {
    const playlist = await play.playlist_info(query);
    const videos = await playlist.all_videos();
    const tracks = videos
      .filter((video) => !video.private && !video.live && !video.upcoming)
      .slice(0, MAX_PLAYLIST_SIZE)
      .map((video) => toTrack(video, requestedBy));

    if (tracks.length === 0) {
      throw new Error('Playlist không có video hợp lệ để phát.');
    }

    return {
      kind: 'playlist',
      title: playlist.title ?? 'Playlist YouTube',
      totalFound: videos.length,
      truncated: videos.length > MAX_PLAYLIST_SIZE,
      tracks
    };
  }

  if (validation && validation !== 'search') {
    throw new Error('Bot chỉ hỗ trợ nguồn phát từ YouTube.');
  }

  if (isUrl(query)) {
    throw new Error('Bot chỉ hỗ trợ link video hoặc playlist YouTube.');
  }

  const results = await play.search(query, {
    limit: 1,
    source: {
      youtube: 'video'
    }
  });

  if (!results.length) {
    throw new Error('Không tìm thấy video phù hợp trên YouTube.');
  }

  return {
    kind: 'search',
    tracks: [toTrack(results[0], requestedBy)]
  };
}

module.exports = {
  MAX_PLAYLIST_SIZE,
  resolveTracks
};
