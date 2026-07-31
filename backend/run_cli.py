"""
Headless CLI runner for GitHub Actions & automated cron jobs.
Runs the 100-Agent Chief Marketing Intelligence System for a target website or marketing goal,
executing live web research, trend browsing, competitor analysis, content generation, and synthesis.
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

# Ensure backend path is in sys.path
sys.path.insert(0, str(Path(__file__).parent))

from database import init_db
from orchestrator import run_company


async def main():
    parser = argparse.ArgumentParser(description="100-Agent Marketing Intelligence System CLI")
    parser.add_argument(
        "--goal",
        type=str,
        default=os.environ.get("MARKETING_GOAL", "Scrape and market this website: https://agenttag.me (Agent Identity Platform)"),
        help="Target website URL or marketing mission",
    )
    parser.add_argument(
        "--output-file",
        type=str,
        default="master_marketing_report.md",
        help="Output Markdown filepath to save the final report",
    )

    args = parser.parse_args()

    print(f"🚀 Starting 100-Agent Marketing Intelligence System...")
    print(f"🎯 Target Mission: {args.goal}")
    print("=" * 60)

    # Initialize DB
    await init_db()

    # Run full orchestrator chain
    final_report = await run_company(args.goal)

    # Save artifact
    out_path = Path(args.output_file)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(final_report, encoding="utf-8")

    print("\n" + "=" * 60)
    print(f"✅ Master Marketing Intelligence Report successfully generated!")
    print(f"📄 Report saved to: {out_path.resolve()}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
