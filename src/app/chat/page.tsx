'use client';

import React, { useState, useRef, useEffect } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { motion, AnimatePresence } from 'framer-motion';

const generateId = () => Math.random().toString(36).substring(2, 9);

type Message = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  metadata?: any;
};

const SUGGESTED_PROMPTS = [
  "Show me espresso machines",
  "Coffee beans dikhao under ₹1,000",
  "Grinder chahiye best wala",
  "What happens if I order the descaler?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: '👋 Hey! Main hoon Agent Carter — aapka AI commerce assistant.\n\nAap mujhse Hinglish ya English mein baat kar sakte ho. Products dhundho, buy karo, aur payment complete karo — sab kuch yahan!\n\nKya dhundh rahe ho?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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
        content: data.reply || 'Sorry, I encountered an issue.',
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

  const handlePayment = (orderId: string, amount: number) => {
    if (orderId.startsWith("order_sim_")) {
      alert(
        "✅ Mock Payment Successful! 🎉\n\n" +
        "(Note: To see the real Razorpay Modal, add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env.local file)"
      );
      // Auto-trigger upsell flow
      handleSend("Payment successful! What's next?");
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
      amount: amount * 100,
      currency: "INR",
      name: "Agent Carter",
      description: "Hackathon Transaction",
      order_id: orderId,
      handler: function (response: any) {
        alert(`✅ Payment Successful! 🎉\nPayment ID: ${response.razorpay_payment_id}`);
        // Auto-trigger upsell flow
        handleSend("Payment successful! What's next?");
      },
      prefill: {
        name: "Carter User",
        email: "user@agentcarter.com",
        contact: "9999999999"
      },
      theme: {
        color: "#00E5FF"
      }
    };
    const rzp1 = new (window as any).Razorpay(options);
    rzp1.on('payment.failed', function (response: any) {
      alert(`❌ Payment Failed: ${response.error.description}`);
    });
    rzp1.open();
  };

  return (
    <PageWrapper>
      <div className="h-[calc(100vh-4rem)] pt-4 flex flex-row w-full font-sans">

        {/* Sidebar */}
        <div className="hidden md:flex flex-col w-72 border-r p-5 overflow-y-auto transition-colors bg-white border-slate-200 dark:bg-[#0c1322]/60 dark:border-white/10 dark:backdrop-blur-md">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Agent Session</h2>
          </div>
          {sessionId && (
            <div className="text-[10px] font-mono mb-6 text-slate-400 dark:text-slate-500 break-all">
              {sessionId}
            </div>
          )}

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
                className="card-hover p-3 text-sm cursor-pointer rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:text-rzp-blue dark:hover:text-cyan-400"
                onClick={() => {
                  setInputValue(prompt);
                }}
              >
                {prompt}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col h-full">
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
                          <div className="rounded-lg p-3 flex flex-col gap-2 mt-2 bg-blue-50 border border-blue-200 dark:bg-cyan-900/20 dark:border-cyan-700/40">
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
                            <button
                              onClick={() => handlePayment(msg.metadata!.checkoutResult!.orderId, msg.metadata!.checkoutResult!.amount)}
                              className="w-full py-2.5 text-sm flex justify-center rounded-lg font-semibold transition-all shadow btn-primary"
                            >
                              💳 Pay Now via Razorpay
                            </button>
                          </div>
                        )}

                        {/* Checkout Failed */}
                        {msg.metadata.checkoutResult && !msg.metadata.checkoutResult.success && (
                          <div className="rounded-lg p-3 mt-2 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700/40">
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400">
                              {msg.metadata.checkoutResult.guardrailReason || 'BLOCKED'}
                            </span>
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
                                  <span className="font-semibold text-slate-900 dark:text-cyan-400">₹{(rec.price / 100).toFixed(0)}</span>
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
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      className="w-2 h-2 rounded-full bg-slate-400 dark:bg-cyan-500"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-slate-400 dark:bg-cyan-500"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-slate-400 dark:bg-cyan-500"
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
          <div className="border-t p-4 flex items-center gap-3 transition-colors bg-white border-slate-200 dark:bg-[#0c1322]/60 dark:border-white/10">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AgentCarter anything... (Hinglish bhi chalega!)"
              className="rounded-xl px-4 py-3 flex-1 text-sm outline-none transition-all bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-500 dark:focus:ring-cyan-500/20"
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
