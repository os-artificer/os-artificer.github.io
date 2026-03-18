from __future__ import annotations

import os
import re
import shutil
from pathlib import Path

from markdown import markdown as md_to_html


ROOT = Path(__file__).resolve().parent


def guess_title(md_text: str, fallback: str) -> str:
    # Prefer the first top-level heading.
    m = re.search(r"(?m)^\s*#\s+(.+?)\s*$", md_text)
    if m:
        return m.group(1).strip()
    m = re.search(r"(?m)^\s*##\s+(.+?)\s*$", md_text)
    if m:
        return m.group(1).strip()
    return fallback


def convert_one(md_path: Path, out_html_path: Path) -> None:
    md_text = md_path.read_text(encoding="utf-8")
    title = guess_title(md_text, md_path.stem)

    # Avoid duplicate title:
    # - Our HTML wrapper adds an <h1> with `title`
    # - Markdown also typically converts the first heading line to <h1>/<h2>
    # So we remove the first heading line from the markdown before conversion.
    md_text = re.sub(r"(?m)^(#{1,6})\s+.+\s*$\n?", "", md_text, count=1)

    # extensions:
    # - fenced_code: ``` code blocks
    # - tables: |a|b| table
    # - toc: allow [toc] patterns if present
    html_body = md_to_html(
        md_text,
        extensions=["fenced_code", "tables"],
    )

    out_html_path.parent.mkdir(parents=True, exist_ok=True)
    out_html_path.write_text(
        "\n".join(
            [
                "<!DOCTYPE html>",
                "<html>",
                "<head>",
                '    <meta charset="UTF-8">',
                '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
                f"    <title>{title}</title>",
                "    <style>",
                "      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.7;margin:24px;}",
                "      pre{background:#0b1020;color:#e6edf3;padding:12px;border-radius:10px;overflow:auto;}",
                "      code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,monospace;}",
                "      a{color:#2563eb;text-decoration:none;}",
                "      a:hover{text-decoration:underline;}",
                "      img{max-width:100%;height:auto;}",
                "      table{border-collapse:collapse;}",
                "      th,td{border:1px solid #d1d5db;padding:6px 10px;}",
                "      th{background:#f9fafb;}",
                "    </style>",
                "</head>",
                "<body>",
                f"    <article>",
                f"      <h1 style=\"margin-top:0\">{title}</h1>",
                f"      {html_body}",
                f"    </article>",
                "</body>",
                "</html>",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main() -> None:
    categories = ["cpp", "golang", "tech-arch"]
    for cat in categories:
        in_dir = ROOT / cat
        out_dir = ROOT / "web" / cat
        out_dir.mkdir(parents=True, exist_ok=True)

        md_files = sorted(in_dir.glob("*.md"))
        for md_path in md_files:
            out_html_path = out_dir / f"{md_path.stem}.html"
            convert_one(md_path, out_html_path)

        # Copy assets needed by some md files (currently only tech-arch/A2A-assets).
        if cat == "tech-arch":
            assets_in = in_dir / "A2A-assets"
            assets_out = out_dir / "A2A-assets"
            if assets_in.exists():
                if assets_out.exists():
                    shutil.rmtree(assets_out)
                shutil.copytree(assets_in, assets_out)

    # Also convert README so `index.html` can link to HTML only.
    if os.environ.get("SKIP_README") != "1":
        readme_md = ROOT / "README.md"
        if readme_md.exists():
            out_html = ROOT / "web" / "README.html"
            convert_one(readme_md, out_html)


if __name__ == "__main__":
    main()

