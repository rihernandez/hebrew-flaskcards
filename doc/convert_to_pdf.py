#!/usr/bin/env python3
"""
Convierte los archivos markdown educativos a PDF con soporte para hebreo y RTL.
"""

import markdown
import re
from weasyprint import HTML, CSS
import os

# Archivos a convertir
MD_FILES = [
    "doc/combinaciones-especiales-espanol.md",
    "doc/conjugaciones-verbales-espanol.md",
    "doc/verbos-irregulares-espanol.md",
    "doc/estructura-oraciones-espanol.md",
]

CSS_STYLES = """
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;700&family=Noto+Sans:wght@400;700&display=swap');

* { box-sizing: border-box; }

body {
    font-family: 'Noto Sans Hebrew', 'Noto Sans', Arial, sans-serif;
    font-size: 13px;
    line-height: 1.7;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
    direction: rtl;
}

@page {
    size: A4;
    margin: 2cm 2.5cm 2cm 2.5cm;
    @top-right {
        content: "Richard HC";
        font-family: 'Noto Sans Hebrew', 'Noto Sans', Arial, sans-serif;
        font-size: 10px;
        color: #2c5f8a;
        font-style: italic;
    }
}

h1 {
    font-size: 22px;
    color: #1a3a5c;
    border-bottom: 3px solid #1a3a5c;
    padding-bottom: 8px;
    margin-top: 0;
    margin-bottom: 20px;
    text-align: center;
}

h2 {
    font-size: 16px;
    color: #2c5f8a;
    border-right: 4px solid #2c5f8a;
    padding-right: 10px;
    margin-top: 28px;
    margin-bottom: 12px;
    page-break-after: avoid;
}

h3 {
    font-size: 14px;
    color: #3a7abf;
    margin-top: 18px;
    margin-bottom: 8px;
    page-break-after: avoid;
}

p {
    margin: 6px 0 10px 0;
    text-align: right;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 18px 0;
    font-size: 12px;
    page-break-inside: avoid;
    direction: rtl;
}

th {
    background-color: #1a3a5c;
    color: white;
    padding: 8px 10px;
    text-align: right;
    font-weight: bold;
}

td {
    padding: 7px 10px;
    border: 1px solid #d0d8e4;
    text-align: right;
    vertical-align: top;
}

tr:nth-child(even) td { background-color: #f0f5fb; }

blockquote {
    background-color: #f0f7ff;
    border-right: 4px solid #2c5f8a;
    border-left: none;
    margin: 10px 0;
    padding: 10px 14px;
    border-radius: 4px;
    font-size: 12.5px;
    direction: rtl;
}

blockquote p { margin: 4px 0; }

pre {
    background-color: #f4f4f4;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 12px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    direction: ltr;
    text-align: left;
    overflow-wrap: break-word;
    white-space: pre-wrap;
}

code {
    background-color: #f0f0f0;
    padding: 1px 5px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 11.5px;
}

ul, ol {
    padding-right: 20px;
    padding-left: 0;
    margin: 8px 0;
    direction: rtl;
}

li { margin-bottom: 4px; }

hr {
    border: none;
    border-top: 1px solid #ccd6e0;
    margin: 20px 0;
}

strong { color: #1a3a5c; }

bdi[dir="ltr"] {
    direction: ltr;
    unicode-bidi: embed;
    display: inline;
}

h2 + table, h3 + table { page-break-before: avoid; }
"""


def wrap_latin_words(text: str) -> str:
    """
    Envuelve secuencias de palabras latinas en <bdi dir="ltr">.
    Respeta tags HTML existentes. No toca contenido dentro de <pre> o <code>.
    """
    if '<bdi' in text:
        return text

    # Dividir en segmentos: tags HTML, contenido pre/code, y texto normal
    # Primero proteger bloques pre/code completos
    protected = []
    def protect(m):
        idx = len(protected)
        protected.append(m.group(0))
        return f'\x00PROTECTED{idx}\x00'

    text_safe = re.sub(r'<(pre|code)[^>]*>.*?<\/\1>', protect, text, flags=re.DOTALL)

    # Ahora procesar el texto restante
    parts = re.split(r'(<[^>]+>)', text_safe)
    result = []
    for part in parts:
        if part.startswith('<'):
            result.append(part)
        elif '\x00PROTECTED' in part:
            result.append(part)
        else:
            fixed = re.sub(
                r'([A-Za-záéíóúüñÁÉÍÓÚÜÑàèìòùâêîôûäëïöü¿¡]'
                r'[A-Za-z0-9áéíóúüñÁÉÍÓÚÜÑàèìòùâêîôûäëïöü¿¡'
                r'\'\-\.\,\!\?\/\(\)\*\_]*'
                r'(?:\s+[A-Za-z0-9áéíóúüñÁÉÍÓÚÜÑàèìòùâêîôûäëïöü¿¡\'\-\.\,\!\?\/\(\)\*\_]+)*)',
                lambda m: (
                    f'<bdi dir="ltr">{m.group(1)}</bdi>'
                    if len(m.group(1).strip()) > 1 else m.group(1)
                ),
                part
            )
            result.append(fixed)

    result_text = ''.join(result)

    # Restaurar bloques protegidos
    for idx, original in enumerate(protected):
        result_text = result_text.replace(f'\x00PROTECTED{idx}\x00', original)

    return result_text


def process_block(tag: str, attrs: str, inner: str, style: str) -> str:
    """
    Corrige la dirección de un bloque HTML según su contenido:
    - Ya procesado → sin cambios
    - Contiene elementos estructurales → sin cambios
    - Solo hebreo o < 3 letras latinas → sin cambios
    - Tiene hebreo + latino (mixto) → envolver solo las palabras latinas en <bdi>
    - Solo latino (sin hebreo) → dir=ltr en el bloque
    """
    if '<bdi' in inner or 'dir="ltr"' in inner:
        return f'<{tag}{attrs}>{inner}</{tag}>'

    if '<pre' in inner or '<table' in inner or '<ul' in inner or '<ol' in inner:
        return f'<{tag}{attrs}>{inner}</{tag}>'

    plain  = re.sub(r'<[^>]+>', '', inner)
    latin  = re.findall(r'[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]', plain)
    hebrew = re.findall(r'[\u05d0-\u05ea]', plain)

    if len(latin) < 3:
        return f'<{tag}{attrs}>{inner}</{tag}>'
    elif hebrew:
        # Mixto: bloque sigue RTL, solo las palabras latinas van en bdi
        return f'<{tag}{attrs}>{wrap_latin_words(inner)}</{tag}>'
    else:
        # Solo latino: dir=ltr en el bloque completo
        return f'<{tag}{attrs} dir="ltr" style="{style}">{inner}</{tag}>'


def fix_bidi(html: str) -> str:
    """
    Corrige bidi en orden correcto para evitar doble procesamiento:
    1. td, th  — tablas (nunca anidados entre sí)
    2. blockquote — procesa el bloque completo incluyendo <p> internos
    3. li, p   — solo los que quedan fuera de blockquotes
    """
    styles = {
        'td':         'text-align:left',
        'th':         'text-align:left',
        'li':         'text-align:left',
        'p':          'text-align:left',
        'blockquote': 'text-align:left; padding-right:14px',
    }

    # 1. Tablas
    for tag in ['td', 'th']:
        s = styles[tag]
        html = re.sub(
            rf'<{tag}([^>]*)>(.*?)<\/{tag}>',
            lambda m, _t=tag, _s=s: process_block(_t, m.group(1), m.group(2), _s),
            html, flags=re.DOTALL
        )

    # 2. Blockquotes — aplica wrap_latin_words al interior completo
    def fix_bq(m):
        attrs = m.group(1)
        inner = m.group(2)
        if '<bdi' in inner:
            return m.group(0)
        plain = re.sub(r'<[^>]+>', '', inner)
        latin = re.findall(r'[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]', plain)
        hebrew = re.findall(r'[\u05d0-\u05ea]', plain)
        if len(latin) < 3:
            return m.group(0)
        # Siempre RTL en blockquote, solo envolver palabras latinas
        return f'<blockquote{attrs}>{wrap_latin_words(inner)}</blockquote>'

    html = re.sub(r'<blockquote([^>]*)>(.*?)<\/blockquote>', fix_bq, html, flags=re.DOTALL)

    # 3. li y p — los que no están dentro de blockquote ya procesado
    for tag in ['li', 'p']:
        s = styles[tag]
        html = re.sub(
            rf'<{tag}([^>]*)>(.*?)<\/{tag}>',
            lambda m, _t=tag, _s=s: process_block(_t, m.group(1), m.group(2), _s),
            html, flags=re.DOTALL
        )

    return html


def convert_md_to_pdf(md_path: str) -> str:
    """Convierte un archivo .md a .pdf"""
    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    html_body = markdown.markdown(
        md_content,
        extensions=["tables", "fenced_code", "nl2br", "sane_lists"],
    )

    html_body = fix_bidi(html_body)

    full_html = f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
{html_body}
</body>
</html>"""

    base_name = os.path.splitext(os.path.basename(md_path))[0]
    pdf_path = os.path.join(os.path.dirname(md_path), f"{base_name}.pdf")

    HTML(string=full_html).write_pdf(
        pdf_path,
        stylesheets=[CSS(string=CSS_STYLES)],
    )

    return pdf_path


def main():
    print("Convirtiendo archivos Markdown a PDF...\n")
    success = 0
    for md_file in MD_FILES:
        if not os.path.exists(md_file):
            print(f"  ⚠️  No encontrado: {md_file}")
            continue
        try:
            pdf_path = convert_md_to_pdf(md_file)
            size_kb = os.path.getsize(pdf_path) // 1024
            print(f"  ✅  {md_file} → {pdf_path} ({size_kb} KB)")
            success += 1
        except Exception as e:
            print(f"  ❌  Error en {md_file}: {e}")

    print(f"\nListo: {success}/{len(MD_FILES)} archivos convertidos.")


if __name__ == "__main__":
    main()
