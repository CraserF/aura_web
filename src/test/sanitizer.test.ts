import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeInnerHtml } from '@/services/html/sanitizer';

describe('sanitizeHtml', () => {
  it('removes <script> tags entirely', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>Hello</p>');
  });

  it('removes <iframe> tags', () => {
    const input = '<div><iframe src="https://evil.com"></iframe></div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<iframe');
  });

  it('removes <form> tags', () => {
    const input = '<form action="/post"><input type="text" /></form>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<form');
  });

  it('removes onclick and other event handlers', () => {
    const input = '<button onclick="alert(1)">Click</button>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
  });

  it('removes onerror attribute', () => {
    const input = '<img src="x.png" onerror="alert(1)" />';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onerror');
  });

  it('removes external http:// src attributes', () => {
    const input = '<img src="https://external.com/img.png" />';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('src="https://external.com');
  });

  it('removes javascript: href', () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
  });

  it('allows relative src paths', () => {
    const input = '<img src="./images/photo.png" />';
    const result = sanitizeHtml(input);
    expect(result).toContain('src="./images/photo.png"');
  });

  it('allows safe data: image URIs', () => {
    const input = '<img src="data:image/png;base64,iVBORw0KGgo=" />';
    const result = sanitizeHtml(input);
    expect(result).toContain('data:image/png;base64');
  });

  it('blocks unsafe data: URIs (data:text/html)', () => {
    const input = '<a href="data:text/html,<h1>XSS</h1>">link</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('data:text/html');
  });

  it('preserves internal anchor links', () => {
    const input = '<a href="#section-1">Go to section</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('href="#section-1"');
  });

  it('preserves benign underline tags', () => {
    const input = '<p>Please <u>read carefully</u>.</p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<u>read carefully</u>');
  });

  it('preserves relative href links', () => {
    const input = '<a href="./other-doc">Other doc</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('href="./other-doc"');
  });

  it('preserves <style> blocks', () => {
    const input = '<style>.foo { color: red; }</style><p class="foo">Hello</p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('.foo');
  });

  it('removes <base> tags', () => {
    const input = '<base href="https://evil.com" /><p>content</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<base');
  });

  it('removes vbscript: protocol', () => {
    const input = '<a href="vbscript:msgbox(1)">click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('vbscript:');
  });

  it('handles empty string', () => {
    const result = sanitizeHtml('');
    expect(result).toBe('');
  });
});

describe('sanitizeInnerHtml', () => {
  it('removes script tags from inner HTML', () => {
    const input = '<section><script>evil()</script><h2>Title</h2></section>';
    const result = sanitizeInnerHtml(input);
    expect(result).not.toContain('<script');
    expect(result).toContain('<h2>Title</h2>');
  });

  it('removes event handlers from inner HTML', () => {
    const input = '<div onmouseover="track()">Hover me</div>';
    const result = sanitizeInnerHtml(input);
    expect(result).not.toContain('onmouseover');
    expect(result).toContain('Hover me');
  });
});
