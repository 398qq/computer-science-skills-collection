#!/usr/bin/env python3
import sys

def qwen_vl_prompt(text, image_url=None):
    # Simulate Qwen-VL prompt structure
    if image_url:
        return f"<img>{image_url}</img> {text}"
    return text

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = sys.argv[1]
        img = sys.argv[2] if len(sys.argv) > 2 else None
        print(qwen_vl_prompt(query, img))
    else:
        print("Usage: python3 qwen_vl.py <text> [image_url]")
