import { useState, useRef, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { usePresentationStore } from '@/stores/presentationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getProvider } from '@/services/ai/registry';
import {
  buildSystemPrompt,
  extractHtmlFromResponse,
} from '@/services/ai/prompts';
import { buildAgentMessages } from '@/services/ai/agentWorkflow';
import type { AIMessage } from '@/services/ai/types';
import type { ChatMessage as ChatMessageType } from '@/types';
import { cn } from '@/lib/utils';

export function ChatBar() {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const addMessage = useChatStore((s) => s.addMessage);
  const setStatus = useChatStore((s) => s.setStatus);
  const setStreamingContent = useChatStore((s) => s.setStreamingContent);
  const appendStreamingContent = useChatStore((s) => s.appendStreamingContent);

  const slidesHtml = usePresentationStore((s) => s.slidesHtml);
  const setSlides = usePresentationStore((s) => s.setSlides);
  const setTitle = usePresentationStore((s) => s.setTitle);

  const providerId = useSettingsStore((s) => s.providerId);
  const getActiveProvider = useSettingsStore((s) => s.getActiveProvider);
  const hasApiKey = useSettingsStore((s) => s.hasApiKey);
  const setShowSettings = useSettingsStore((s) => s.setShowSettings);

  const isGenerating = status.state === 'generating';

  const handleSubmit = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || isGenerating) return;

    if (!hasApiKey()) {
      setShowSettings(true);
      return;
    }

    const userMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setInput('');

    const chatHistory: AIMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Run agent workflow: validate → enhance → build messages
    const { messages: aiMessages, blocked, blockReason } = buildAgentMessages(
      prompt,
      slidesHtml || undefined,
      chatHistory,
      buildSystemPrompt(),
    );

    if (blocked) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: blockReason ?? 'This request cannot be processed.',
        timestamp: Date.now(),
      });
      return;
    }

    setStatus({ state: 'generating', startedAt: Date.now() });
    setStreamingContent('');

    try {
      const provider = getProvider(providerId);
      const config = getActiveProvider();

      const fullResponse = await provider.generateStream(
        aiMessages,
        (chunk) => appendStreamingContent(chunk),
        config.apiKey,
        config.baseUrl ?? '',
        config.model,
      );

      const html = extractHtmlFromResponse(fullResponse);
      if (html) {
        setSlides(html);

        const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
        if (titleMatch?.[1]) {
          const title = titleMatch[1]
            .replace(/<[^>]+>/g, '')
            .trim();
          if (title) setTitle(title);
        }
      }

      const assistantMsg: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: html
          ? 'Done! I\'ve updated the slides.'
          : fullResponse.slice(0, 200),
        timestamp: Date.now(),
      };
      addMessage(assistantMsg);
      setStatus({ state: 'idle' });
      setStreamingContent('');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Generation failed';
      setStatus({ state: 'error', message });
      setStreamingContent('');

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${message}`,
        timestamp: Date.now(),
      });
    }
  }, [
    input,
    isGenerating,
    hasApiKey,
    setShowSettings,
    addMessage,
    messages,
    slidesHtml,
    setStatus,
    setStreamingContent,
    appendStreamingContent,
    providerId,
    getActiveProvider,
    setSlides,
    setTitle,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = input.trim().length > 0 && !isGenerating;

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6">
      <div className="relative mx-auto max-w-3xl">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isGenerating
              ? 'Generating\u2026'
              : slidesHtml
                ? 'Describe changes to your slides\u2026'
                : 'What do you want to create?'
          }
          disabled={isGenerating}
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-muted/50 px-4 py-3 pb-11 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/20 focus:bg-background disabled:opacity-50"
        />

        <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/50">
            {isGenerating ? 'Generating\u2026' : 'Enter to send'}
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSend}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-lg transition-colors',
              canSend
                ? 'bg-foreground text-background hover:bg-foreground/90'
                : 'cursor-not-allowed bg-muted text-muted-foreground/40',
            )}
            aria-label="Send message"
          >
            <ArrowUp size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {status.state === 'error' && (
        <p className="mt-2 text-center text-xs text-destructive">
          {status.message}
        </p>
      )}
    </div>
  );
}
