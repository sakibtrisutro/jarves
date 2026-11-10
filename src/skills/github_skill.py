"""Skill 7: GitHub Intelligence & Code Comprehension.

Enables searching GitHub repositories, inspecting repo trees, fetching READMEs,
reading specific code files, and analyzing repos for technical queries.
Distinguishes verified facts from assumptions.
"""

import base64
from typing import Any, Dict, List, Optional
import httpx
from src.config import settings


def _get_github_headers(token: Optional[str] = None) -> Dict[str, str]:
    """Build standard GitHub API headers with optional token authentication."""
    headers = {
        "User-Agent": "JARVIS-Personal-Assistant/1.0",
        "Accept": "application/vnd.github.v3+json",
    }
    active_token = token or settings.GITHUB_TOKEN
    if active_token and len(active_token.strip()) > 5:
        headers["Authorization"] = f"Bearer {active_token.strip()}"
    return headers


async def search_repositories(query: str, limit: int = 5) -> Dict[str, Any]:
    """Search public GitHub repositories by query string."""
    clean_query = query.strip()
    if not clean_query:
        return {"query": "", "items": [], "summary": "No query provided."}

    url = "https://api.github.com/search/repositories"
    params = {"q": clean_query, "per_page": min(limit, 20)}
    headers = _get_github_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params, headers=headers)

        if resp.status_code != 200:
            return {
                "query": clean_query,
                "items": [],
                "summary": f"GitHub API Error ({resp.status_code}): {resp.text[:200]}",
                "error": resp.text,
            }

        data = resp.json()
        raw_items = data.get("items", [])
        items: List[Dict[str, Any]] = []

        summary_lines = [f"### GitHub Repositories for \"{clean_query}\" (Top {len(raw_items)}):\n"]

        for idx, item in enumerate(raw_items, 1):
            repo_info = {
                "name": item.get("name"),
                "full_name": item.get("full_name"),
                "html_url": item.get("html_url"),
                "description": item.get("description") or "No description provided.",
                "stars": item.get("stargazers_count", 0),
                "language": item.get("language") or "Not specified",
                "forks": item.get("forks_count", 0),
            }
            items.append(repo_info)
            summary_lines.append(
                f"{idx}. **[{repo_info['full_name']}]({repo_info['html_url']})** "
                f"({repo_info['language']}, ⭐ {repo_info['stars']:,})\n"
                f"   *{repo_info['description']}*"
            )

        return {
            "query": clean_query,
            "total_count": data.get("total_count", 0),
            "items": items,
            "summary": "\n".join(summary_lines),
        }

    except Exception as exc:
        return {
            "query": clean_query,
            "items": [],
            "summary": f"Failed to search GitHub: {exc}",
            "error": str(exc),
        }


async def get_repository_info(owner: str, repo: str) -> Dict[str, Any]:
    """Fetch repository metadata, README, and tree structure."""
    clean_owner = owner.strip()
    clean_repo = repo.strip()
    base_url = f"https://api.github.com/repos/{clean_owner}/{clean_repo}"
    headers = _get_github_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Fetch repo metadata
            repo_resp = await client.get(base_url, headers=headers)
            if repo_resp.status_code != 200:
                return {
                    "owner": clean_owner,
                    "repo": clean_repo,
                    "error": f"Repository not found or access denied (Status {repo_resp.status_code})",
                }
            repo_data = repo_resp.json()
            default_branch = repo_data.get("default_branch", "main")

            # 2. Fetch README
            readme_text = ""
            readme_resp = await client.get(f"{base_url}/readme", headers=headers)
            if readme_resp.status_code == 200:
                readme_data = readme_resp.json()
                content_b64 = readme_data.get("content", "")
                if content_b64:
                    try:
                        readme_text = base64.b64decode(content_b64).decode("utf-8", errors="replace")
                    except Exception:
                        readme_text = "Unable to decode README base64 content."

            # 3. Fetch file tree
            tree_files: List[str] = []
            tree_resp = await client.get(f"{base_url}/git/trees/{default_branch}?recursive=1", headers=headers)
            if tree_resp.status_code == 200:
                tree_data = tree_resp.json()
                tree_files = [item.get("path") for item in tree_data.get("tree", []) if item.get("type") == "blob"]

            return {
                "owner": clean_owner,
                "repo": clean_repo,
                "full_name": repo_data.get("full_name"),
                "html_url": repo_data.get("html_url"),
                "description": repo_data.get("description"),
                "stars": repo_data.get("stargazers_count", 0),
                "language": repo_data.get("language"),
                "default_branch": default_branch,
                "readme_preview": readme_text[:2000] if readme_text else "No README available.",
                "total_files": len(tree_files),
                "file_tree": tree_files[:50],
            }

    except Exception as exc:
        return {
            "owner": clean_owner,
            "repo": clean_repo,
            "error": f"Failed to retrieve repository info: {exc}",
        }


async def get_file_content(owner: str, repo: str, path: str) -> Dict[str, Any]:
    """Retrieve the content of a specific file from a GitHub repository."""
    clean_path = path.strip().lstrip("/")
    url = f"https://api.github.com/repos/{owner.strip()}/{repo.strip()}/contents/{clean_path}"
    headers = _get_github_headers()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers)

        if resp.status_code != 200:
            return {
                "owner": owner,
                "repo": repo,
                "path": clean_path,
                "error": f"File not found (Status {resp.status_code})",
            }

        data = resp.json()
        if data.get("type") != "file":
            return {
                "owner": owner,
                "repo": repo,
                "path": clean_path,
                "error": "Target path is a directory, not a file.",
            }

        content_b64 = data.get("content", "")
        content_text = ""
        if content_b64:
            content_text = base64.b64decode(content_b64).decode("utf-8", errors="replace")

        return {
            "owner": owner,
            "repo": repo,
            "path": clean_path,
            "size_bytes": data.get("size", 0),
            "content": content_text,
            "html_url": data.get("html_url"),
        }

    except Exception as exc:
        return {
            "owner": owner,
            "repo": repo,
            "path": clean_path,
            "error": f"Failed to fetch file content: {exc}",
        }


async def analyze_repository_for_query(owner: str, repo: str, query: str) -> Dict[str, Any]:
    """Analyze a repository for a specific query and structure verified facts vs snippets."""
    info = await get_repository_info(owner, repo)
    if "error" in info:
        return info

    clean_query = query.strip().lower()
    readme = info.get("readme_preview", "")
    tree = info.get("file_tree", [])

    # Check for matching files
    matching_files = [f for f in tree if clean_query in f.lower()]

    # Extract matching sentences from README
    matching_readme_lines = []
    if readme:
        for line in readme.splitlines():
            if clean_query in line.lower() and len(line.strip()) > 5:
                matching_readme_lines.append(line.strip())

    summary_lines = [
        f"### GitHub Analysis: `{info['full_name']}` for \"{query}\"\n",
        f"- **Repository URL**: [{info['html_url']}]({info['html_url']})",
        f"- **Language**: {info['language']} | ⭐ {info['stars']:,} Stars",
        f"- **Description**: {info['description']}\n",
        "**Verified Findings:**",
    ]

    if matching_readme_lines:
        summary_lines.append("- **Relevant Documentation Snippets:**")
        for line in matching_readme_lines[:5]:
            summary_lines.append(f"  > {line}")

    if matching_files:
        summary_lines.append(f"- **Matching File Paths in Repo ({len(matching_files)}):**")
        for f in matching_files[:10]:
            summary_lines.append(f"  * `{f}`")
    else:
        summary_lines.append("- No direct file path matches found for the query.")

    return {
        "owner": owner,
        "repo": repo,
        "query": query,
        "matching_files": matching_files,
        "matching_readme_snippets": matching_readme_lines,
        "summary": "\n".join(summary_lines),
    }
