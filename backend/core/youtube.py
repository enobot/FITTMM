"""Tutorial video search through the YouTube Data API v3.

Search costs 100 quota units (the free daily quota is 10,000), so results are
cached per query and each user gets a daily cap on uncached searches.
"""
import html
import logging
import re
import threading
from datetime import date, datetime, timedelta, timezone
from urllib.parse import quote_plus

import httpx
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from config import settings
from core.database import VideoCache

logger = logging.getLogger(__name__)

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
MAX_RESULTS = 8
DAILY_UNCACHED_SEARCHES_PER_USER = 30

_usage_lock = threading.Lock()
_usage: dict[tuple[int, date], int] = {}


class VideoSearchError(Exception):
    pass


def _utcnow() -> datetime:
    # Naive UTC, matching how DateTime columns are stored
    return datetime.now(timezone.utc).replace(tzinfo=None)


def normalize_query(q: str) -> str:
    return re.sub(r"\s+", " ", (q or "").strip().lower())[:200]


def tutorial_query(exercise_name: str) -> str:
    return f"how to do {exercise_name} proper form"


def youtube_search_url(q: str) -> str:
    return "https://www.youtube.com/results?search_query=" + quote_plus(q)


def _iso_duration_seconds(value: str) -> int | None:
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", value or "")
    if not m:
        return None
    d, h, mnt, s = (int(x) if x else 0 for x in m.groups())
    return d * 86400 + h * 3600 + mnt * 60 + s


def _take_quota(user_id: int):
    key = (user_id, date.today())
    with _usage_lock:
        for k in [k for k in _usage if k[1] != key[1]]:
            del _usage[k]
        if _usage.get(key, 0) >= DAILY_UNCACHED_SEARCHES_PER_USER:
            raise VideoSearchError("You've reached today's video search limit. Try again tomorrow.")
        _usage[key] = _usage.get(key, 0) + 1


def _fetch(q: str) -> list[dict]:
    try:
        with httpx.Client(timeout=10) as client:
            res = client.get(SEARCH_URL, params={
                "part": "snippet", "type": "video", "q": q, "maxResults": MAX_RESULTS,
                "videoEmbeddable": "true", "safeSearch": "strict",
                "relevanceLanguage": "en", "key": settings.YOUTUBE_API_KEY,
            })
            if res.status_code != 200:
                logger.warning("YouTube search failed: %s %s", res.status_code, res.text[:300])
                raise VideoSearchError("Video search isn't available right now.")
            items = res.json().get("items", [])
            ids = [it["id"]["videoId"] for it in items if it.get("id", {}).get("videoId")]
            details = {}
            if ids:
                vres = client.get(VIDEOS_URL, params={
                    "part": "contentDetails,statistics", "id": ",".join(ids),
                    "key": settings.YOUTUBE_API_KEY,
                })
                if vres.status_code == 200:
                    details = {v["id"]: v for v in vres.json().get("items", [])}
    except httpx.HTTPError as exc:
        logger.warning("YouTube search error: %s", exc)
        raise VideoSearchError("Video search isn't available right now.") from exc

    videos = []
    for it in items:
        vid = it.get("id", {}).get("videoId")
        if not vid:
            continue
        sn = it.get("snippet", {})
        thumbs = sn.get("thumbnails", {})
        thumb = (thumbs.get("medium") or thumbs.get("high") or thumbs.get("default") or {}).get("url", "")
        extra = details.get(vid, {})
        views = extra.get("statistics", {}).get("viewCount")
        videos.append({
            "video_id": vid,
            "title": html.unescape(sn.get("title", "")),
            "channel": html.unescape(sn.get("channelTitle", "")),
            "thumbnail": thumb,
            "published_at": sn.get("publishedAt"),
            "duration_seconds": _iso_duration_seconds(extra.get("contentDetails", {}).get("duration", "")),
            "view_count": int(views) if views and views.isdigit() else None,
        })
    return videos


def search_videos(db: Session, q: str, user_id: int) -> dict:
    """Return {configured, query, videos, search_url, error}."""
    query = normalize_query(q)
    out = {"configured": bool(settings.YOUTUBE_API_KEY), "query": query,
           "videos": [], "search_url": youtube_search_url(query), "error": None}
    if not query or not settings.YOUTUBE_API_KEY:
        return out

    cached = db.query(VideoCache).filter(VideoCache.query == query).first()
    fresh_after = _utcnow() - timedelta(hours=settings.YOUTUBE_CACHE_HOURS)
    if cached and cached.fetched_at >= fresh_after:
        out["videos"] = cached.results
        return out

    try:
        _take_quota(user_id)
        videos = _fetch(query)
    except VideoSearchError as exc:
        out["error"] = str(exc)
        if cached:  # stale results beat none
            out["videos"] = cached.results
        return out

    if cached:
        cached.results = videos
        cached.fetched_at = _utcnow()
    else:
        db.add(VideoCache(query=query, results=videos, fetched_at=_utcnow()))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    out["videos"] = videos
    return out
