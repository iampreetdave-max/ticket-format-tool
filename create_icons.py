#!/usr/bin/env python3
"""
Generate professional icons for Ticket Generator Pro extension.
Run: python create_icons.py
Requires: pip install Pillow
"""

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Installing Pillow...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'Pillow'])
    from PIL import Image, ImageDraw

import os

def create_icon(size):
    """Create a ticket icon at the specified size."""
    # Create image with transparency
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Colors
    primary = (99, 102, 241)  # #6366f1
    primary_dark = (67, 56, 202)  # #4338ca
    white = (255, 255, 255)

    # Background - rounded rectangle
    padding = 0
    radius = int(size * 0.15)

    # Draw rounded rectangle background
    draw.rounded_rectangle(
        [padding, padding, size - padding - 1, size - padding - 1],
        radius=radius,
        fill=primary
    )

    # Ticket dimensions
    ticket_padding = int(size * 0.18)
    ticket_left = ticket_padding
    ticket_top = ticket_padding
    ticket_right = size - ticket_padding
    ticket_bottom = size - ticket_padding
    ticket_radius = int(size * 0.08)

    # Draw ticket outline
    line_width = max(1, int(size * 0.04))

    # Ticket body (rounded rectangle outline)
    draw.rounded_rectangle(
        [ticket_left, ticket_top, ticket_right, ticket_bottom],
        radius=ticket_radius,
        outline=white,
        width=line_width
    )

    # Header line
    header_y = ticket_top + int((ticket_bottom - ticket_top) * 0.32)
    draw.line(
        [(ticket_left, header_y), (ticket_right, header_y)],
        fill=white,
        width=line_width
    )

    # Stub line (vertical)
    stub_x = ticket_left + int((ticket_right - ticket_left) * 0.25)
    draw.line(
        [(stub_x, ticket_top), (stub_x, header_y)],
        fill=white,
        width=line_width
    )

    # Content lines (bullet points) for larger sizes
    if size >= 32:
        content_start_x = ticket_left + int((ticket_right - ticket_left) * 0.12)
        content_end_x = ticket_right - int((ticket_right - ticket_left) * 0.12)

        line_spacing = int((ticket_bottom - header_y) * 0.22)
        thin_line = max(1, int(size * 0.03))

        for i in range(3):
            line_y = header_y + line_spacing * (i + 1)
            if line_y < ticket_bottom - int(size * 0.1):
                # Bullet dot
                dot_radius = max(1, int(size * 0.025))
                draw.ellipse(
                    [content_start_x - dot_radius, line_y - dot_radius,
                     content_start_x + dot_radius, line_y + dot_radius],
                    fill=white
                )
                # Line
                line_end = content_end_x - int((ticket_right - ticket_left) * 0.1 * i)
                draw.line(
                    [(content_start_x + int(size * 0.06), line_y), (line_end, line_y)],
                    fill=white,
                    width=thin_line
                )

    # Checkmark for larger sizes
    if size >= 48:
        check_size = int(size * 0.12)
        check_x = ticket_right - int(size * 0.12)
        check_y = ticket_bottom - int(size * 0.12)

        check_points = [
            (check_x - check_size, check_y - int(check_size * 0.2)),
            (check_x - int(check_size * 0.4), check_y + int(check_size * 0.4)),
            (check_x + int(check_size * 0.5), check_y - int(check_size * 0.6))
        ]

        draw.line(check_points[:2], fill=white, width=max(2, int(size * 0.04)))
        draw.line(check_points[1:], fill=white, width=max(2, int(size * 0.04)))

    return img


def main():
    sizes = [16, 32, 48, 128]
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(icons_dir, exist_ok=True)

    for size in sizes:
        icon = create_icon(size)
        filepath = os.path.join(icons_dir, f'icon{size}.png')
        icon.save(filepath, 'PNG')
        print(f"Created: {filepath}")

    print("\nIcons generated successfully!")
    print("Reload your extension in Chrome to see the new icons.")


if __name__ == '__main__':
    main()
