"""
Live Web Scraper & Internet Retrieval Engine — provides real-time web search,
target website scraping, and live platform retrieval capabilities for the 100 agents.

BROWSING STRATEGY:
  1. Search DuckDuckGo for the query
  2. Actually VISIT and READ the top results (not just snippets)
  3. Browse Reddit hot posts from relevant subreddits directly
  4. Browse Hacker News, Product Hunt, GitHub Trending
  5. Feed all full page content to agents so they write trend-aware content
"""

import asyncio
import logging
import re
import time
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
from curl_cffi import requests as cffi_requests
import httpx
import trafilatura

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("web_scraper")

# Popular subreddits to monitor for trends
TECH_SUBREDDITS = [
    "SaaS", "artificial", "MachineLearning", "technology",
    "webdev", "programming", "startups", "Entrepreneur",
    "ChatGPT", "AItools", "OpenAI",
]


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def extract_urls(text: str) -> List[str]:
    """Extract URLs from a text block."""
    pattern = r'https?://[^\s>"]+|www\.[^\s>"]+'
    matches = re.findall(pattern, text)
    cleaned = []
    for m in matches:
        u = m.rstrip('.,);')
        if not u.startswith('http'):
            u = 'https://' + u
        cleaned.append(u)
    return cleaned


def _get(url: str, timeout: int = 15) -> Optional[str]:
    """Fetch a URL with curl_cffi Chrome impersonation, return HTML or None."""
    for attempt in range(3):
        try:
            resp = cffi_requests.get(url, impersonate="chrome", timeout=timeout)
            if resp.status_code == 200:
                return resp.text
        except Exception:
            time.sleep(1.5 * (attempt + 1))
    return None


# ─── TARGET WEBSITE PROFILE ───────────────────────────────────────────────────

def extract_target_website_profile(url: str) -> Dict[str, str]:
    """
    Deep-scrape a target website URL to produce a comprehensive
    product intelligence profile for the 100 agents.
    """
    if not url.startswith("http"):
        url = "https://" + url

    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            downloaded = _get(url)

        if downloaded:
            soup = BeautifulSoup(downloaded, "html.parser")
            title = soup.title.string.strip() if soup.title and soup.title.string else url

            meta_desc = ""
            desc_tag = (soup.find("meta", attrs={"name": "description"}) or
                        soup.find("meta", attrs={"property": "og:description"}))
            if desc_tag and desc_tag.get("content"):
                meta_desc = desc_tag["content"].strip()

            h1s = [h.text.strip() for h in soup.find_all("h1") if h.text.strip()]
            h2s = [h.text.strip() for h in soup.find_all("h2") if h.text.strip()][:8]

            extracted_text = trafilatura.extract(downloaded, include_links=False) or ""
            if not extracted_text:
                for script in soup(["script", "style", "nav", "footer"]):
                    script.decompose()
                extracted_text = soup.get_text(separator=" ", strip=True)

            return {
                "url": url,
                "title": title,
                "meta_description": meta_desc,
                "h1_headers": ", ".join(h1s),
                "h2_headers": ", ".join(h2s),
                "full_text": extracted_text[:4000],
                "summary": (
                    f"=== SCRAPED TARGET WEBSITE PROFILE ({url}) ===\n"
                    f"Title: {title}\nDescription: {meta_desc}\n"
                    f"Hero Headlines: {', '.join(h1s[:3])}\n"
                    f"Extracted Content:\n{extracted_text[:2500]}"
                )
            }
    except Exception as e:
        logger.error(f"Error extracting profile for {url}: {e}")

    return {"url": url, "title": url, "meta_description": "", "h1_headers": "",
            "h2_headers": "", "full_text": "", "summary": f"Target Website: {url}"}


# ─── SEARCH ───────────────────────────────────────────────────────────────────

def search_web(query: str, max_results: int = 5) -> List[Dict[str, str]]:
    """
    Live DuckDuckGo HTML search. Returns list of {title, link, snippet}.
    """
    try:
        encoded_query = query.replace(' ', '+')
        target_url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
        html = _get(target_url)
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        results = []
        for result in soup.select(".result")[:max_results]:
            title_elem = result.select_one(".result__title")
            snippet_elem = result.select_one(".result__snippet")
            url_elem = result.select_one(".result__url")
            if title_elem and url_elem:
                title = title_elem.text.strip()
                link = url_elem.text.strip()
                if not link.startswith("http"):
                    link = "https://" + link
                snippet = snippet_elem.text.strip() if snippet_elem else ""
                results.append({"title": title, "link": link, "snippet": snippet})
        return results
    except Exception as e:
        logger.error(f"search_web error for '{query}': {e}")
        return []


def scrape_url(url: str, max_chars: int = 2500) -> str:
    """Fetch clean readable text from a web page using trafilatura + fallback."""
    try:
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            downloaded = _get(url)

        if downloaded:
            extracted = trafilatura.extract(downloaded, include_links=False, include_comments=False)
            if extracted:
                return extracted[:max_chars]
            soup = BeautifulSoup(downloaded, "html.parser")
            for tag in soup(["script", "style", "nav", "footer"]):
                tag.decompose()
            return soup.get_text(separator=" ", strip=True)[:max_chars]
    except Exception as e:
        logger.error(f"scrape_url error for {url}: {e}")
    return ""


def browse_and_read_top_results(query: str, n_pages: int = 3, max_chars_each: int = 1200) -> str:
    """
    Search for query, then actually BROWSE and READ the top n_pages results.
    Returns full concatenated page content — gives agents real information, not just snippets.
    """
    results = search_web(query, max_results=n_pages + 2)
    if not results:
        return ""

    browsed_content = []
    visited = 0
    for r in results:
        if visited >= n_pages:
            break
        url = r["link"]
        # Skip PDFs, social-only, or login-required pages
        if any(skip in url for skip in ["pdf", "login", "signup", "accounts.google", "facebook.com/login"]):
            continue
        try:
            content = scrape_url(url, max_chars=max_chars_each)
            if content and len(content) > 100:
                browsed_content.append(
                    f"=== BROWSED: {r['title']} ({url}) ===\n{content}\n"
                )
                visited += 1
        except Exception:
            continue

    return "\n".join(browsed_content)


# ─── REDDIT BROWSER ───────────────────────────────────────────────────────────

def fetch_reddit_hot_posts(subreddit: str, limit: int = 8) -> List[Dict[str, str]]:
    """
    Fetch trending posts from a subreddit via DuckDuckGo site:reddit.com/r/ search.
    More reliable than direct scraping since Reddit blocks bots.
    """
    results = search_web(f"site:reddit.com/r/{subreddit}", max_results=limit)
    posts = []
    for r in results:
        posts.append({
            "title": r["title"],
            "subreddit": f"r/{subreddit}",
            "url": r["link"],
            "permalink": r["link"],
            "score": 0,
            "comments": 0,
            "flair": "",
            "text_preview": r["snippet"],
        })
    return posts


def fetch_reddit_search(query: str, sort: str = "hot", limit: int = 10) -> List[Dict[str, str]]:
    """
    Search Reddit via DuckDuckGo site:reddit.com (reliable, no API needed).
    Returns top posts with title, url, and snippet.
    """
    results = search_web(f"{query} site:reddit.com", max_results=limit)
    posts = []
    for r in results:
        posts.append({
            "title": r["title"],
            "subreddit": "reddit.com",
            "url": r["link"],
            "permalink": r["link"],
            "score": 0,
            "comments": 0,
            "flair": "",
            "text_preview": r["snippet"],
        })
    return posts


def format_reddit_posts(posts: List[Dict]) -> str:
    """Format a list of Reddit posts into a readable string for agents."""
    lines = []
    for p in posts:
        sub = p.get("subreddit", "")
        flair = f" [{p['flair']}]" if p.get("flair") else ""
        preview = f"\n    Preview: {p['text_preview']}" if p.get("text_preview") else ""
        lines.append(
            f"• [{p['score']}↑ | {p['comments']} comments] {p['title']}{flair}\n"
            f"  {p.get('permalink') or p.get('url', '')}{preview}"
        )
    return "\n".join(lines)


# ─── HACKER NEWS ──────────────────────────────────────────────────────────────

def fetch_hacker_news_trends(limit: int = 8) -> List[Dict[str, str]]:
    try:
        resp = httpx.get("https://hacker-news.firebaseio.com/v0/topstories.json", timeout=6)
        if resp.status_code == 200:
            story_ids = resp.json()[:limit]
            stories = []
            for sid in story_ids:
                s_resp = httpx.get(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json", timeout=4)
                if s_resp.status_code == 200:
                    data = s_resp.json()
                    stories.append({
                        "title": data.get("title", ""),
                        "url": data.get("url", f"https://news.ycombinator.com/item?id={sid}"),
                        "score": data.get("score", 0),
                        "comments": data.get("descendants", 0)
                    })
            return stories
    except Exception as e:
        logger.error(f"Error fetching HN trends: {e}")
    return []


# ─── GITHUB TRENDING ──────────────────────────────────────────────────────────

def fetch_github_trending() -> List[Dict[str, str]]:
    try:
        html = trafilatura.fetch_url("https://github.com/trending")
        if html:
            extracted = trafilatura.extract(html, include_links=True)
            if extracted:
                lines = [line for line in extracted.split("\n") if line.strip()]
                return [{"repo_info": "\n".join(lines[:30])}]
    except Exception as e:
        logger.error(f"Error fetching GitHub trending: {e}")
    return []


# ─── PRODUCT HUNT TRENDING ────────────────────────────────────────────────────

def fetch_product_hunt_trending() -> List[Dict[str, str]]:
    """Browse Product Hunt front page for today's trending products."""
    try:
        html = _get("https://www.producthunt.com/")
        if not html:
            return []
        soup = BeautifulSoup(html, "html.parser")
        products = []
        # Product Hunt uses data-test attributes and specific class patterns
        for item in soup.select("[data-test='post-item']")[:8]:
            name_tag = item.select_one("[data-test='post-name']") or item.find("h3")
            tagline_tag = item.select_one("[data-test='post-tagline']") or item.find("p")
            name = name_tag.text.strip() if name_tag else ""
            tagline = tagline_tag.text.strip() if tagline_tag else ""
            if name:
                products.append({"name": name, "tagline": tagline})
        return products
    except Exception as e:
        logger.error(f"Error fetching Product Hunt trending: {e}")
    return []


# ─── TECH NEWS ────────────────────────────────────────────────────────────────

def fetch_tech_news() -> List[Dict[str, str]]:
    try:
        html = _get("https://techcrunch.com")
        if not html:
            return []
        soup = BeautifulSoup(html, "html.parser")
        articles = []
        for a in soup.select("a.loop-card__title-link")[:6]:
            title = a.text.strip()
            href = a.get("href", "")
            if title and href:
                articles.append({"title": title, "link": href})
        return articles
    except Exception as e:
        logger.error(f"Error fetching TechCrunch: {e}")
    return []


# ─── MAIN INTELLIGENCE GATHERER ───────────────────────────────────────────────

async def gather_live_intelligence(task: str, department: str) -> str:
    """
    Asynchronously gathers real-time live internet data for each agent.
    Strategy: BROWSE and READ pages, not just collect snippets.
    Every agent gets actual page content so their output is truly trend-aware.
    """
    loop = asyncio.get_running_loop()
    snippets = []
    search_query = task[:120].replace("\n", " ").strip()

    try:
        # ── 1. General web search + actually browse top results ────────────────
        search_results = await loop.run_in_executor(None, search_web, search_query, 4)
        if search_results:
            snippets.append("### LIVE WEB SEARCH RESULTS ###")
            for r in search_results:
                snippets.append(f"- **{r['title']}** ({r['link']})\n  {r['snippet']}")

        # ── 2. Browse and READ top search result pages (full content) ──────────
        browsed = await loop.run_in_executor(None, browse_and_read_top_results, search_query, 2)
        if browsed:
            snippets.append("\n### FULL CONTENT FROM BROWSED WEB PAGES ###")
            snippets.append(browsed[:3000])

        # ── 3. Reddit: search + browse hot subreddits ──────────────────────────
        if any(t in department for t in ["Team A", "Trend", "Content", "Team C", "Audience", "Team D"]):
            # Search Reddit for the topic
            reddit_posts = await loop.run_in_executor(None, fetch_reddit_search, search_query, 10)
            if reddit_posts:
                snippets.append("\n### LIVE REDDIT HOT POSTS (searched across all subreddits) ###")
                snippets.append(format_reddit_posts(reddit_posts))

            # Also browse specific relevant subreddits
            relevant_subs = TECH_SUBREDDITS[:4]  # Top 4 most relevant
            sub_results = await asyncio.gather(*[
                loop.run_in_executor(None, fetch_reddit_hot_posts, sub, 5)
                for sub in relevant_subs
            ])
            sub_snippets = []
            for sub, posts in zip(relevant_subs, sub_results):
                if posts:
                    sub_snippets.append(f"\n  r/{sub} HOT RIGHT NOW:")
                    sub_snippets.append(format_reddit_posts(posts[:4]))
            if sub_snippets:
                snippets.append("\n### LIVE REDDIT SUBREDDIT HOT POSTS ###")
                snippets.extend(sub_snippets)

        # ── 4. Hacker News + GitHub Trending (for Trend team) ─────────────────
        if any(t in department for t in ["Team A", "Trend"]):
            hn_stories = await loop.run_in_executor(None, fetch_hacker_news_trends, 6)
            if hn_stories:
                snippets.append("\n### LIVE HACKER NEWS TOP STORIES ###")
                for s in hn_stories:
                    snippets.append(f"• [{s['score']}pts | {s['comments']} comments] {s['title']} — {s['url']}")

            gh_trending = await loop.run_in_executor(None, fetch_github_trending)
            if gh_trending:
                snippets.append("\n### LIVE GITHUB TRENDING TODAY ###")
                snippets.append(gh_trending[0]["repo_info"][:1200])

            ph_trending = await loop.run_in_executor(None, fetch_product_hunt_trending)
            if ph_trending:
                snippets.append("\n### LIVE PRODUCT HUNT TRENDING TODAY ###")
                for p in ph_trending:
                    snippets.append(f"• {p['name']} — {p['tagline']}")

        # ── 5. Competitor Intelligence: Tech news + browse competitor pages ────
        if any(t in department for t in ["Team B", "Competitor"]):
            tech_news = await loop.run_in_executor(None, fetch_tech_news)
            if tech_news:
                snippets.append("\n### LIVE TECH NEWS & PRODUCT ANNOUNCEMENTS ###")
                for item in tech_news:
                    snippets.append(f"• {item['title']}: {item['link']}")

        # ── 6. SEO team: Question-based search browsing ────────────────────────
        if any(t in department for t in ["Team E", "SEO"]):
            q_query = f"how to {search_query} questions"
            q_results = await loop.run_in_executor(None, search_web, q_query, 4)
            if q_results:
                snippets.append("\n### LIVE SEARCH: USER QUESTIONS & KEYWORD INTENT ###")
                for r in q_results:
                    snippets.append(f"- **{r['title']}**: {r['snippet']}")

        # ── 7. Strategy team: browse trending content for channel insights ──────
        if any(t in department for t in ["Team G", "Strategy"]):
            strategy_posts = await loop.run_in_executor(None, fetch_reddit_search, f"{search_query} marketing growth", 6)
            if strategy_posts:
                snippets.append("\n### LIVE REDDIT: GROWTH & MARKETING DISCUSSIONS ###")
                snippets.append(format_reddit_posts(strategy_posts))

    except Exception as e:
        logger.error(f"Error gathering live intelligence: {e}")

    if not snippets:
        return ""

    return "\n\n" + "\n".join(snippets) + "\n\n"
