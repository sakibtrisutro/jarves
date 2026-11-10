"""Skill 2: Web Research.

Searches the web using DuckDuckGo Instant Answer & web search protocols.
Collects, structures, and summarizes findings with source citations.
Explicitly distinguishes verified information from assumptions.
"""

import html
import re
from typing import Any, Dict, List
import httpx


async def search_web(query: str, max_results: int = 5) -> Dict[str, Any]:
    """Execute a web search, extract results, and synthesize a factual briefing."""
    clean_query = query.strip()
    if not clean_query:
        return {
            "query": "",
            "sources": [],
            "summary": "No query provided.",
            "verified_facts": [],
            "assumptions": [],
        }

    sources: List[Dict[str, str]] = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    }

    # 1. Query DuckDuckGo Instant Answer API
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": clean_query, "format": "json", "no_html": "1", "skip_disambig": "0"},
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                abstract = data.get("AbstractText", "")
                source_url = data.get("AbstractURL", "")
                heading = data.get("Heading", clean_query)

                if abstract:
                    sources.append({
                        "title": heading or "Primary Reference",
                        "snippet": abstract,
                        "url": source_url or "https://duckduckgo.com/?q=" + clean_query,
                    })

                # Process Related Topics
                for topic in data.get("RelatedTopics", []):
                    if len(sources) >= max_results:
                        break
                    if isinstance(topic, dict) and topic.get("Text"):
                        sources.append({
                            "title": topic.get("Text", "").split(" - ")[0] if " - " in topic.get("Text", "") else "Related Topic",
                            "snippet": topic.get("Text", ""),
                            "url": topic.get("FirstURL", ""),
                        })
    except Exception:
        pass

    # 2. If fewer than 2 results, supplement with DuckDuckGo HTML search
    if len(sources) < 2:
        try:
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
                html_resp = await client.get(
                    "https://html.duckduckgo.com/html/",
                    params={"q": clean_query},
                    headers=headers,
                )
                if html_resp.status_code == 200:
                    text = html_resp.text
                    # Extract snippets and titles using regex
                    results = re.findall(
                        r'<a class="result__snippet[^"]*" href="([^"]*)"[^>]*>(.*?)</a>',
                        text,
                        re.DOTALL,
                    )
                    for link, raw_snippet in results:
                        if len(sources) >= max_results:
                            break
                        clean_snippet = html.unescape(re.sub(r"<[^>]+>", "", raw_snippet)).strip()
                        if clean_snippet and not any(s["snippet"] == clean_snippet for s in sources):
                            sources.append({
                                "title": f"Web Result {len(sources) + 1}",
                                "snippet": clean_snippet,
                                "url": link if link.startswith("http") else f"https://duckduckgo.com{link}",
                            })
        except Exception:
            pass

    # 3. Structure Verified Facts vs Assumptions
    verified_facts: List[str] = []
    for s in sources:
        verified_facts.append(f"{s['title']}: {s['snippet']}")

    if sources:
        summary_lines = [
            f"### Web Research Findings for \"{clean_query}\"\n",
            "**Verified Information from Sources:**",
        ]
        for idx, src in enumerate(sources, 1):
            url_display = f" [Source Link]({src['url']})" if src['url'] else ""
            summary_lines.append(f"{idx}. **{src['title']}**: {src['snippet']}{url_display}")

        summary_lines.append("\n**Analytical Note:**")
        summary_lines.append("- Information summarized above reflects current indexed search results.")
        summary_lines.append("- Any strategic interpretation or domain assumption must be confirmed by the owner.")
        summary = "\n".join(summary_lines)
    else:
        summary = f"No verified external web results found for \"{clean_query}\". Please verify search terms or check network connection."

    return {
        "query": clean_query,
        "sources": sources,
        "summary": summary,
        "verified_facts": verified_facts,
        "assumptions": [
            "External web search data is subject to public availability and real-time network conditions."
        ],
    }
