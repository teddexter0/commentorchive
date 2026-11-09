const COMMENT_ID = /^[\w.-]{10,160}$/;
const VIDEO_ID = /^[\w-]{11}$/;

async function list(resource, params, key) {
  const url = new URL('https://www.googleapis.com/youtube/v3/' + resource);
  url.search = new URLSearchParams({ part: 'snippet', ...params, key });
  const response = await fetch(url, { signal: AbortSignal.timeout(6500) });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('YouTube lookup failed');
  return (await response.json()).items || [];
}

function commentDetails(snippet) {
  if (!snippet?.textDisplay?.trim()) return null;
  return { text: snippet.textDisplay, author: snippet.authorDisplayName || '', publishedAt: snippet.publishedAt || '' };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method' });
  }

  const { commentId, videoId } = req.query;
  if (typeof commentId !== 'string' || typeof videoId !== 'string' || !COMMENT_ID.test(commentId) || !VIDEO_ID.test(videoId)) {
    return res.status(400).json({ error: 'invalid-link' });
  }
  const key = process.env.YOUTUBE_DATA_API_KEY;
  if (!key) return res.status(503).json({ error: 'not-configured' });

  try {
    const comments = await list('comments', { id: commentId, textFormat: 'plainText' }, key);
    const snippet = comments.find(item => item.id === commentId)?.snippet;
    const comment = commentDetails(snippet);
    if (!comment || (snippet.videoId && snippet.videoId !== videoId)) {
      return res.status(404).json({ error: 'comment-unavailable' });
    }

    const [videos, parents] = await Promise.all([
      list('videos', { id: videoId, fields: 'items(id,snippet(title,channelTitle,description))' }, key).catch(() => []),
      COMMENT_ID.test(snippet.parentId || '') ? list('comments', { id: snippet.parentId, textFormat: 'plainText' }, key).catch(() => []) : []
    ]);
    const video = videos.find(item => item.id === videoId)?.snippet;
    const parent = commentDetails(parents.find(item => item.id === snippet.parentId)?.snippet);
    return res.status(200).json({
      comment, parent,
      video: video ? { title: video.title || '', channel: video.channelTitle || '', description: video.description || '' } : null
    });
  } catch {
    return res.status(502).json({ error: 'lookup-unavailable' });
  }
};
