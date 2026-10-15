"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  clearSavedConversation,
  getConversationSnapshot,
  getServerConversationSnapshot,
  MAX_STORED_MESSAGES,
  saveConversation,
  subscribeToConversation,
} from "../lib/assistant/storage.ts";
import {
  isChatResponse,
  MAX_CHAT_MESSAGE_LENGTH,
} from "../lib/assistant/validation.ts";
import { ENGLISH_ASSISTANT_COPY as copy } from "../lib/assistant/copy.ts";
import type {
  ChatResponse,
  ConversationTurn,
  StoredChatMessage,
} from "../lib/assistant/types.ts";
import type { AssistantRequestContext } from "../lib/assistant/integration-context.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(payload: unknown): string {
  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error;
  }
  return copy.apiFailure;
}

function apiTurns(messages: readonly StoredChatMessage[]): ConversationTurn[] {
  return messages.slice(-8).map(({ role, content }) => ({ role, content }));
}

function makeMessage(
  role: StoredChatMessage["role"],
  content: string,
  response?: ChatResponse,
): StoredChatMessage {
  return {
    id: globalThis.crypto.randomUUID(),
    role,
    content,
    ...(response ? { response } : {}),
    createdAt: new Date().toISOString(),
  };
}

export function AssistantChat({
  context = {},
  contextNotice,
}: {
  context?: AssistantRequestContext;
  contextNotice?: string;
}) {
  const conversation = useSyncExternalStore(
    subscribeToConversation,
    getConversationSnapshot,
    getServerConversationSnapshot,
  );
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const scrollTargetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation.messages.length, isSending]);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || trimmed.length > MAX_CHAT_MESSAGE_LENGTH || isSending) return;

    const userMessage = makeMessage("user", trimmed);
    const contextMessages = [
      ...conversation.messages,
      userMessage,
    ].slice(-MAX_STORED_MESSAGES);
    saveConversation(contextMessages);
    setDraft("");
    setRequestError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          recentTurns: apiTurns(conversation.messages),
          ...context,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setRequestError(errorMessage(payload));
        return;
      }
      if (!isChatResponse(payload)) {
        setRequestError(copy.invalidResponse);
        return;
      }

      const assistantMessage = makeMessage(
        "assistant",
        payload.answer,
        payload,
      );
      saveConversation(
        [...contextMessages, assistantMessage].slice(-MAX_STORED_MESSAGES),
      );
    } catch {
      setRequestError(
        copy.networkFailure,
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  const remainingCharacters = MAX_CHAT_MESSAGE_LENGTH - draft.length;

  return (
    <main className="min-h-screen bg-[#f5f4e9] px-3 py-4 text-stone-900 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-white shadow-[0_24px_80px_-36px_rgba(15,71,48,0.35)] sm:min-h-[calc(100dvh-4rem)]">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 px-5 py-4 sm:px-8">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            {copy.languageBadge}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearSavedConversation}
              disabled={
                (conversation.messages.length === 0 && !conversation.error) ||
                isSending
              }
              className="rounded-xl px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copy.clearConversation}
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <section className="flex min-h-[55dvh] min-w-0 flex-col lg:min-h-0">
            <div className="border-b border-stone-100 px-5 py-5 sm:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                {copy.sectionEyebrow}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
                {copy.heading}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                {copy.intro}
              </p>
              <p
                aria-live="polite"
                className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950"
              >
                {contextNotice ??
                  "No location, farm profile, or live weather context is currently supplied."}
              </p>
            </div>

            <div
              className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-8"
              aria-label="Conversation"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {conversation.messages.length === 0 ? (
                <>
                  <div className="max-w-2xl rounded-3xl rounded-tl-md border border-emerald-100 bg-[#f7faf5] p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white" aria-hidden="true">
                        ✳
                      </span>
                      <div>
                        <p className="font-semibold text-emerald-950">
                          {copy.welcomeTitle}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-stone-700">
                          {copy.welcomeDescription}
                        </p>
                        <p className="mt-3 text-xs leading-5 text-stone-500">
                          {copy.safetyNotice}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 lg:hidden">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                      {copy.starterHeading}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {copy.starterQuestions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          disabled={isSending}
                          onClick={() => void sendMessage(question)}
                          className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-left text-xs font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                conversation.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-3xl px-4 py-3 sm:max-w-[82%] sm:px-5 ${
                        message.role === "user"
                          ? "rounded-br-md bg-emerald-800 text-white"
                          : "rounded-bl-md border border-stone-200 bg-[#fbfaf5] text-stone-800"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="mb-2 space-y-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                          <p>
                            {message.response?.basis === "fallback"
                              ? copy.safeFallback
                              : message.response?.basis === "clarification"
                                ? copy.clarificationNeeded
                                : copy.ruleMatch(message.response?.confidenceLabel ?? "general")}
                          </p>
                          {message.response?.verificationStatus ===
                          "unverified-general-guidance" ? (
                            <p className="text-amber-800">
                              {copy.unverifiedGuidance}
                            </p>
                          ) : null}
                          {message.response?.verificationStatus ===
                          "official-overview-linked" ? (
                            <p className="text-emerald-700">
                              {copy.officialOverview}
                            </p>
                          ) : null}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {message.content}
                      </p>
                      {message.response?.sources.length ? (
                        <ul className="mt-3 space-y-1 border-t border-stone-200 pt-2 text-xs">
                          {message.response.sources.map((source) => (
                            <li key={`${source.label}-${source.url ?? ""}`}>
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2"
                                >
                                  {source.label}
                                </a>
                              ) : (
                                <span className="font-semibold text-emerald-800">
                                  {source.label}
                                </span>
                              )}
                              <span className="block leading-5 text-stone-500">
                                {source.note}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {message.response?.suggestedFollowUps.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.response.suggestedFollowUps.map((question) => (
                            <button
                              key={question}
                              type="button"
                              disabled={isSending}
                              onClick={() => void sendMessage(question)}
                              className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-left text-xs font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <time
                        dateTime={message.createdAt}
                        className={`mt-2 block text-[10px] ${message.role === "user" ? "text-emerald-100" : "text-stone-400"}`}
                      >
                        {new Intl.DateTimeFormat("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(message.createdAt))}
                      </time>
                    </div>
                  </article>
                ))
              )}
              {isSending && (
                <p className="text-sm text-stone-500" role="status">
                  {copy.loading}
                </p>
              )}
              <div ref={scrollTargetRef} />
            </div>

            {(requestError || conversation.error) && (
              <p
                role="alert"
                className="mx-4 mb-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950 sm:mx-8"
              >
                {requestError ?? conversation.error}
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              className="border-t border-stone-200 bg-white p-4 sm:px-8 sm:py-5"
            >
              <label
                htmlFor="assistant-message"
                className="mb-2 block text-sm font-semibold text-stone-700"
              >
                {copy.inputLabel}
              </label>
              <div className="flex items-end gap-2 rounded-2xl border border-stone-300 bg-white p-2 shadow-sm focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
                <textarea
                  id="assistant-message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(draft);
                    }
                  }}
                  maxLength={MAX_CHAT_MESSAGE_LENGTH}
                  rows={2}
                  placeholder={copy.inputPlaceholder}
                  aria-describedby="message-hint"
                  className="max-h-36 min-h-12 flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm leading-6 outline-none placeholder:text-stone-400"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || isSending}
                  className="mb-0.5 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  {isSending ? copy.sending : copy.send}
                </button>
              </div>
              <p id="message-hint" className="mt-2 flex justify-between text-xs text-stone-500">
                <span>{copy.keyboardHint}</span>
                <span aria-live="polite">
                  {copy.charactersRemaining(remainingCharacters)}
                </span>
              </p>
              <p className="mt-2 text-center text-[11px] leading-5 text-stone-500">
                {copy.privacy}
              </p>
            </form>
          </section>

          <aside className="hidden border-l border-stone-200 bg-[#faf9f3] p-6 lg:block">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Try asking
            </p>
            <div className="mt-4 space-y-3">
              {copy.starterQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={isSending}
                  onClick={() => void sendMessage(question)}
                  className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left text-sm font-medium leading-5 text-stone-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="font-semibold text-emerald-950">A note on answers</p>
              <p className="mt-2 text-sm leading-6 text-emerald-950/80">
                Confidence describes how closely your words matched a supported
                rule. It is not a probability that agricultural advice is
                correct. Topics marked unverified use conservative general
                guidance pending local review.
              </p>
            </div>
            <p className="mt-5 text-xs leading-5 text-stone-500">
              English is supported in this version. Other Indian languages are
              not yet supported.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
