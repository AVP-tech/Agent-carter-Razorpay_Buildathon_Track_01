'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { motion, AnimatePresence } from 'framer-motion';

const generateId = () => Math.random().toString(36).substring(2, 9);

// Manual time formatter -- avoids Intl/toLocaleTimeString, whose output can
// differ between the server's Node ICU build and the browser's locale data
// and trips a React hydration mismatch (server: "10:47", client: "10:47 AM").
function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

type Message = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  metadata?: any;
};

type Toast = {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
};

const SUGGESTED_PROMPTS = [
  "Show me espresso machines",
  "Show me coffee beans under ₹1,000",
  "I'm looking for a premium grinder",
  "What happens if I order the descaler?",
];

const TOAST_STYLES: Record<Toast['type'], { border: string; icon: string; iconBg: string }> = {
  success: {
    border: 'border-l-emerald-500',
    icon: '✓',
    iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  },
  error: {
    border: 'border-l-red-500',
    icon: '✕',
    iconBg: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  },
  info: {
    border: 'border-l-orange-500',
    icon: 'i',
    iconBg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  },
};

// Defense-in-depth: strip any stray markdown symbols that slip through the
// model's system prompt (hashtags, asterisks, backticks) so the chat never
// shows raw formatting characters to the user.
function sanitizeAgentText(text: string): string {
  if (!text) return text;
  let out = text;
  out = out.replace(/^\s{0,3}#{1,6}\s*/gm, '');
  out = out.replace(/^\s*[-*]\s+/gm, '• ');
  out = out.replace(/\*\*(.*?)\*\*/g, '$1');
  out = out.replace(/__(.*?)__/g, '$1');
  out = out.replace(/\*(.*?)\*/g, '$1');
  out = out.replace(/`{1,3}([^`]*)`{1,3}/g, '$1');
  out = out.replace(/[#*_`]{2,}/g, '');
  return out.trim();
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 w-[min(360px,calc(100vw-2.5rem))]">
      <AnimatePresence>
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`pointer-events-auto rounded-xl border-l-4 ${style.border} p-3.5 pr-3 flex items-start gap-3 shadow-lg backdrop-blur-md bg-white/95 border border-slate-200 dark:bg-[#170F0A]/95 dark:border-white/10`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${style.iconBg}`}>
                {style.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.title}</div>
                {t.description && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">{t.description}</div>
                )}
              </div>
              <button
                onClick={() => onDismiss(t.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 -mt-0.5 -mr-0.5 w-5 h-5 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
              >
                ×
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'agent',
  content: "Hey, I'm Agent Carter — your AI commerce assistant. I can help you discover products, negotiate prices, and complete your purchase securely. How can I help you today?",
  timestamp: new Date(),
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => dismissToast(id), 6000);
  }, [dismissToast]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const startNewChat = () => {
    setMessages([{ ...WELCOME_MESSAGE, id: generateId(), timestamp: new Date() }]);
    setSessionId(null);
    setInputValue('');
    pushToast({ type: 'info', title: 'New session started', description: 'Previous conversation context has been cleared.' });
  };

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text, sessionId }),
      });

      const data = await response.json();

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const agentMessage: Message = {
        id: generateId(),
        role: 'agent',
        content: sanitizeAgentText(data.reply || 'Sorry, I encountered an issue.'),
        timestamp: new Date(),
        metadata: data.metadata
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: generateId(),
        role: 'agent',
        content: 'I am currently unable to process your request. Please try again later.',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Fires once a payment is actually confirmed (never on order creation).
  // Deliberately does NOT go through handleSend / the visible chat input --
  // there is no user-typed message here, just a confirmed purchase, so we
  // call the dedicated post-purchase endpoint directly and drop the reply
  // straight into the transcript as an agent message.
  const triggerPostPurchaseUpsell = async (sku?: string) => {
    if (!sku || !sessionId) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'agent',
          content: "Thanks for your order! It's confirmed. Let me know if you'd like anything else.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/agent/post-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, sku }),
      });
      const data = await response.json();

      const agentMessage: Message = {
        id: generateId(),
        role: 'agent',
        content: sanitizeAgentText(data.reply || "Thanks for your order! It's confirmed."),
        timestamp: new Date(),
        metadata: data.metadata,
      };
      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      console.error('Post-purchase upsell error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'agent',
          content: "Thanks for your order! It's confirmed. Let me know if you'd like anything else.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = (orderId: string, amount: number, sku?: string) => {
    if (orderId.startsWith("order_sim_")) {
      pushToast({
        type: 'success',
        title: 'Mock payment successful',
        description: 'Add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to .env.local to see the real Razorpay modal.',
      });
      triggerPostPurchaseUpsell(sku);
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
      amount: Math.round(amount * 100),
      currency: "INR",
      name: "Agent Carter",
      description: "Hackathon Transaction",
      order_id: orderId,
      retry: { enabled: false },
      handler: async function (response: any) {
        // A successful callback here is only the client's word for it -- it
        // is NOT proof the payment is real. Verify the signature server-side
        // before ever treating this as a captured payment.
        try {
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              sessionId,
            }),
          });
          const verifyData = await verifyRes.json();

          if (verifyData.valid) {
            pushToast({
              type: 'success',
              title: 'Payment verified',
              description: `Payment ID: ${response.razorpay_payment_id}`,
            });
            triggerPostPurchaseUpsell(sku);
          } else {
            pushToast({
              type: 'error',
              title: 'Payment could not be verified',
              description: 'The payment signature did not check out, so this was not treated as a completed payment.',
            });
            handleSend(
              `My payment for order ${orderId} went through the checkout modal, but the server could not verify its signature, so it was not confirmed. Can you help me figure out what to do next?`
            );
          }
        } catch (err) {
          pushToast({
            type: 'error',
            title: 'Verification request failed',
            description: 'Could not reach the server to verify this payment.',
          });
        }
      },
      prefill: {
        name: "Carter User",
        email: "user@agentcarter.com",
        contact: "9999999999"
      },
      theme: {
        color: "#C2622D"
      }
    };
    const rzp1 = new (window as any).Razorpay(options);
    rzp1.on('payment.failed', function (response: any) {
      const reason = response?.error?.description || "Unknown error";
      pushToast({
        type: 'error',
        title: 'Payment failed',
        description: reason,
      });
      handleSend(
        `My payment just failed with reason: "${reason}". The order ID was ${orderId}. Can you help me sort this out?`
      );
    });
    rzp1.open();
  };

  return (
    <PageWrapper>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <div className="h-[calc(100vh-4rem)] pt-4 flex flex-row w-full font-sans">

        {/* Sidebar */}
        <div className="hidden md:flex flex-col w-72 border-r p-5 overflow-y-auto transition-colors bg-white border-slate-200 dark:bg-[#170F0A]/60 dark:border-white/10 dark:backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-rzp-navy flex items-center justify-center shrink-0">
              <span className="text-sm">☕</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">Agent Session</h2>
              </div>
            </div>
          </div>
          {sessionId && (
            <div className="text-[10px] font-mono mb-4 text-slate-400 dark:text-slate-500 break-all">
              {sessionId}
            </div>
          )}

          <button
            onClick={startNewChat}
            className="mb-6 w-full text-xs font-semibold px-3 py-2 rounded-lg btn-secondary"
          >
            + New conversation
          </button>

          <div className="text-xs font-semibold uppercase tracking-wider mb-3 text-slate-400 dark:text-slate-500">
            Try asking
          </div>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="flex flex-col gap-2"
          >
            {SUGGESTED_PROMPTS.map((prompt, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0 }
                }}
                className="card-hover p-3 text-sm cursor-pointer rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:text-rzp-blue dark:hover:text-orange-400"
                onClick={() => {
                  setInputValue(prompt);
                }}
              >
                {prompt}
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-auto pt-5 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-white/10">
            Every reply, price and guardrail decision below is written to the immutable{' '}
            <a href="/audit" className="font-semibold text-rzp-blue dark:text-orange-400 hover:underline">audit trail</a>.
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col h-full">
          {/* Chat header */}
          <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F2994A] to-[#C2622D] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                AC
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">Agent Carter</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">Autonomous commerce agent</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Bounded &amp; Guardrailed
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`p-4 max-w-[75%] ${msg.role === 'user' ? 'chat-user' : 'chat-agent'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                    {/* Metadata rendering for Agent Messages */}
                    {msg.role === 'agent' && msg.metadata && (
                      <div className="mt-3 flex flex-col gap-2">

                        {/* Checkout Result: Pay Now Button */}
                        {msg.metadata.checkoutResult && msg.metadata.checkoutResult.success && (
                          <div className="rounded-lg p-3 flex flex-col gap-2 mt-2 bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-700/40">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-emerald-900/50 dark:text-emerald-400">
                                Order Created
                              </span>
                              {msg.metadata.checkoutResult.orderId && (
                                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{msg.metadata.checkoutResult.orderId}</span>
                              )}
                            </div>
                            {msg.metadata.checkoutResult.amount && (
                              <div className="font-semibold text-sm text-slate-900 dark:text-white">₹{msg.metadata.checkoutResult.amount}</div>
                            )}
                            {msg.metadata.checkoutResult.autoAdjustedDiscount && (
                              <div className="text-xs px-2 py-1.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/40">
                                ⚖️ Requested discount was auto-capped to protect merchant margin — order still went through at the adjusted price.
                              </div>
                            )}
                            <button
                              onClick={() => handlePayment(msg.metadata!.checkoutResult!.orderId, msg.metadata!.checkoutResult!.amount, msg.metadata!.checkoutResult!.sku)}
                              className="w-full py-2.5 text-sm flex justify-center rounded-lg font-semibold transition-all shadow btn-primary"
                            >
                              💳 Pay Now via Razorpay
                            </button>
                          </div>
                        )}

                        {/* Checkout Blocked -> Graceful Recovery */}
                        {msg.metadata.checkoutResult && !msg.metadata.checkoutResult.success && (
                          <div className="rounded-lg p-3 mt-2 flex flex-col gap-2 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700/40">
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400 self-start">
                              {msg.metadata.checkoutResult.status || msg.metadata.checkoutResult.guardrailReason || 'BLOCKED'}
                            </span>
                            {msg.metadata.checkoutResult.guardrailReason && (
                              <div className="text-xs text-red-800 dark:text-red-300">{msg.metadata.checkoutResult.guardrailReason}</div>
                            )}

                            {/* Recovery: alternative in-stock product */}
                            {msg.metadata.checkoutResult.recovery?.suggestedAlternative && (
                              <div className="rounded-md p-2.5 bg-white border border-red-200 dark:bg-black/20 dark:border-red-700/30 flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 mb-0.5">Suggested alternative</div>
                                  <div className="text-sm font-medium text-slate-800 dark:text-white">{msg.metadata.checkoutResult.recovery.suggestedAlternative.title}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">₹{(msg.metadata.checkoutResult.recovery.suggestedAlternative.price / 100).toFixed(0)} · {msg.metadata.checkoutResult.recovery.suggestedAlternative.inventoryCount} in stock</div>
                                </div>
                                <button
                                  onClick={() => handleSend(`Let's go with the ${msg.metadata!.checkoutResult!.recovery!.suggestedAlternative!.title} instead.`)}
                                  className="text-xs font-semibold px-3 py-2 rounded-lg btn-primary whitespace-nowrap"
                                >
                                  Try this instead
                                </button>
                              </div>
                            )}

                            {/* Recovery: human-approval payment link */}
                            {msg.metadata.checkoutResult.paymentLink && (
                              <a
                                href={msg.metadata.checkoutResult.paymentLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-center px-3 py-2 rounded-lg btn-primary"
                              >
                                🔗 Approve via secure payment link
                              </a>
                            )}
                          </div>
                        )}

                        {/* Upsell Offer */}
                        {msg.metadata.upsellOffer?.recommendations && (
                          <div className="rounded-lg p-3 mt-2 border bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/10">
                            <div className="text-xs font-semibold uppercase mb-2 text-slate-500 dark:text-slate-400">Recommended for you</div>
                            {msg.metadata.upsellOffer.recommendations.map((rec: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center text-sm py-1.5 border-t first:border-0 border-slate-100 dark:border-white/5">
                                <span className="font-medium text-slate-800 dark:text-white">{rec.title}</span>
                                <div className="flex items-center gap-2">
                                  {typeof rec.originalPrice === 'number' && (
                                    <span className="text-xs line-through text-slate-400 dark:text-slate-500">₹{(rec.originalPrice / 100).toFixed(0)}</span>
                                  )}
                                  <span className="font-semibold text-slate-900 dark:text-orange-400">₹{(rec.discountedBundlePrice / 100).toFixed(0)}</span>
                                  {rec.savings && <span className="text-xs px-1 py-0.5 rounded bg-green-50 text-green-600 dark:bg-emerald-900/30 dark:text-emerald-400">Save ₹{(rec.savings / 100).toFixed(0)}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                  <span className="text-[11px] mt-1 mx-1 text-slate-400 dark:text-slate-500">
                    {formatTime(msg.timestamp)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start"
              >
                <div className="chat-agent p-4 max-w-[75%]">
                  <div className="flex gap-1.5 items-center justify-center h-5">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-slate-400 dark:bg-orange-500"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-slate-400 dark:bg-orange-500"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-slate-400 dark:bg-orange-500"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t p-4 flex items-center gap-3 transition-colors bg-white border-slate-200 dark:bg-[#170F0A]/60 dark:border-white/10">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Agent Carter anything..."
              className="rounded-xl px-4 py-3 flex-1 text-sm outline-none transition-all bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-orange-500 dark:focus:ring-orange-500/20"
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputValue.trim()}
              className="btn-primary rounded-xl px-4 py-3 disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
