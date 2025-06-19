import os
import requests
import json

headers = {
    "X-API-KEY": os.getenv("SERPER_API_KEY", "your_api_key_here"),
    "Content-Type": "application/json",
}


def search_google(query: str) -> str:
    """
    Search Google for a given query.

    param query: The search query.
    """
    url = "https://google.serper.dev/search"
    payload = json.dumps({"q": query})
    response = requests.request("POST", url, headers=headers, data=payload)
    out = response.json()

    # Construct a markdown string with the search results
    markdown = f"## Search Results for '{query}'\n\n"
    for result in out.get("organic", []):
        title = result.get("title")
        link = result.get("link")
        snippet = result.get("snippet")
        markdown += f"- **[{title}]({link})**: {snippet}\n"
    markdown += "\n### Related Searches\n\n"
    for related in out.get("relatedSearches", []):
        related_query = related.get("query")
        markdown += f"- **{related_query}**\n"
    return markdown


def scrape_website(url: str) -> str:
    """
    Scrape a website for its content.

    param url: The URL of the website to scrape.
    """
    srv_url = "https://scrape.serper.dev"
    payload = json.dumps({"url": url})
    response = requests.request("POST", srv_url, headers=headers, data=payload)
    out = response.json()

    # Construct a markdown string with the scraped content
    markdown = f"## Scraped Content from '{url}'\n\n"
    markdown += (
        f"### Title: {out.get('metadata', {}).get('title', 'No title available')}\n\n"
    )
    markdown += f"### Description: {out.get('metadata', {}).get('Description', 'No description available')}\n\n"
    markdown += f"### Content:\n{out.get('text', 'No content available')}\n\n"

    return markdown


tools = [search_google, scrape_website]

if __name__ == "__main__":
    # Example usage
    query = "Python programming"
    print(search_google(query))

    url = "https://www.apple.com"
    print(scrape_website(url))
