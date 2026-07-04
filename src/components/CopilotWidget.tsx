/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, ArrowDown } from "lucide-react";
import { UserRole } from "../types.js";

interface Message {
  role: "user" | "model";
  content: string;
}

interface CopilotWidgetProps {
  token: string;
  userRole: UserRole;
  userName: string;
  onDraftAction: (action: any) => void;
}

export function CopilotWidget({ token, userRole, userName, onDraftAction }: CopilotWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: `Hi ${userName.split(" ")[0]}! 👋 I'm **Mind Assistant**. I am connected directly to your workspace records to avoid any calculations. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickChips =
    userRole === UserRole.Employee
      ? ["My leave balance", "Did I check in today?", "Why is my payslip lower?"]
      : ["Who is absent today?", "Summarize attendance trends", "Pending leave requests"];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: textToSend,
          chatHistory: messages,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Copilot error");
      }

      setMessages((prev) => [...prev, { role: "model", content: data.content }]);

      if (data.draftAction) {
        onDraftAction(data.draftAction);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "Sorry, I had trouble reaching the AI core. Please verify your internet connection or active secrets settings.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-[350px] h-[480px] mb-4 overflow-hidden flex flex-col transition-all duration-200">
          {/* Header */}
          <div className="bg-[#0B1B42] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1 status-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]"></div>
              </div>
              <span className="text-white font-semibold text-sm">Mind Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F8FAFC]">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#2F5CE0] text-white rounded-tr-none"
                      : "bg-white text-slate-700 card-shadow border border-slate-100 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === "model" && index > 0 && (
                    <div className="mt-1.5 pt-1 border-t border-slate-100 text-[9px] text-slate-400">
                      Based on current database records
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-400 card-shadow border border-slate-100 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chip responses */}
          <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-1.5 max-h-[76px] overflow-y-auto">
            {quickChips.map((chip, index) => (
              <button
                key={index}
                onClick={() => sendMessage(chip)}
                className="px-2.5 py-1 bg-white hover:bg-[#E7EDFF] hover:text-[#2F5CE0] text-slate-600 border border-slate-200 rounded-full text-[10px] font-medium transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 bg-white">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Mind..."
                className="w-full bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#2F5CE0] focus:bg-white rounded-full pl-4 pr-10 py-2 text-xs"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-2 text-[#2F5CE0] hover:text-blue-700 disabled:opacity-30 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-[#2F5CE0] hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center transition-all cursor-pointer border-4 border-white"
        aria-label="Mind AI Assistant"
      >
        {open ? (
          <X className="w-6 h-6 animate-spin-once" />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="10" r="1.5" fill="white" />
            <circle cx="12" cy="10" r="1.5" fill="white" />
            <circle cx="10" cy="8" r="1.5" fill="white" />
            <path d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18Z" fill="white" fillOpacity="0.2" />
          </svg>
        )}
      </button>
    </div>
  );
}
