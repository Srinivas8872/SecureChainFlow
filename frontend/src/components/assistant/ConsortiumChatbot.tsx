import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  RotateCcw,
  Layers,
  HelpCircle
} from 'lucide-react';
import {
  queryConsortiumAssistant,
  ROLE_GUIDES,
  AssistantMessage
} from '../../lib/consortiumAssistant';

interface ConsortiumChatbotProps {
  user?: {
    name: string;
    role: string;
    organizationName?: string;
  } | null;
}

export const ConsortiumChatbot: React.FC<ConsortiumChatbotProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || 'SUPPLIER');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasPromptedGreeting, setHasPromptedGreeting] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Synchronize role if user logs in or changes
  useEffect(() => {
    if (user?.role) {
      setSelectedRole(user.role);
    }
  }, [user]);

  // Initial welcome message
  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    const initial = queryConsortiumAssistant('hello', user?.role || 'SUPPLIER', user?.name);
    return [initial];
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMessage: AssistantMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    // Simulate natural AI thinking delay
    setTimeout(() => {
      const botResponse = queryConsortiumAssistant(query, selectedRole, user?.name);
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 400);
  };

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    const roleMsg = queryConsortiumAssistant('my role', newRole, user?.name);
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'bot',
        text: `Switched guidance view to **${ROLE_GUIDES[newRole]?.title || newRole}**. Here is how operators in this role use SecureChainFlow:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      roleMsg,
    ]);
  };

  const handleClearChat = () => {
    const fresh = queryConsortiumAssistant('hello', selectedRole, user?.name);
    setMessages([fresh]);
  };

  const handleActionClick = (route: string) => {
    navigate(route);
    setIsOpen(false);
  };

  // Format assistant text with basic bolding and bullets
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-white text-sm pt-1 pb-0.5 text-sky-400">
                {line.replace('### ', '')}
              </h4>
            );
          }
          if (line.startsWith('#### ')) {
            return (
              <h5 key={idx} className="font-semibold text-slate-200 text-xs pt-1">
                {line.replace('#### ', '')}
              </h5>
            );
          }
          if (line.startsWith('- ')) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1 text-slate-300">
                <span className="text-sky-400 text-sm leading-none">•</span>
                <span>{formatInlineMarkdown(line.replace('- ', ''))}</span>
              </div>
            );
          }
          if (/^\d+\.\s/.test(line)) {
            const num = line.match(/^\d+/)?.[0];
            const rest = line.replace(/^\d+\.\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-1 text-slate-300">
                <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 border border-sky-500/30">
                  {num}
                </span>
                <span>{formatInlineMarkdown(rest)}</span>
              </div>
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }
          return <p key={idx} className="text-slate-300">{formatInlineMarkdown(line)}</p>;
        })}
      </div>
    );
  };

  const formatInlineMarkdown = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="text-slate-200">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 bg-slate-950/80 border border-slate-800 text-sky-400 font-mono text-[11px] rounded">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              setHasPromptedGreeting(true);
            }}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white rounded-full shadow-2xl shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 focus:outline-none"
            aria-label="Open Consortium Assistant"
          >
            <div className="relative">
              <Bot className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full" />
            </div>
            <span className="text-xs font-bold tracking-wide hidden sm:inline">
              Consortium AI Assistant
            </span>

            {/* Pulsing indicator pill for new users */}
            {!hasPromptedGreeting && (
              <span className="absolute -top-2.5 -left-2 bg-sky-500 text-[10px] font-black uppercase tracking-wider text-slate-950 px-2 py-0.5 rounded-full shadow-md animate-bounce">
                Help
              </span>
            )}
          </button>
        )}
      </div>

      {/* Slide-Up Chatbot Drawer/Modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-[440px] h-[640px] max-h-[90vh] bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header Bar */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white leading-tight">Consortium AI Assistant</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Role guidance & platform walkthrough
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Reset Conversation"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Role Filter & Switcher Bar */}
          <div className="px-4 py-2 bg-slate-950/70 border-b border-slate-800/60 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Viewing Role:</span>
            </span>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 text-sky-400 font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="SUPPLIER">Supplier / Producer</option>
                <option value="PROCESSOR">Processor / Manufacturer</option>
                <option value="TRANSPORTER">Transporter / Carrier</option>
                <option value="WAREHOUSE">Warehouse / Silo</option>
                <option value="RETAILER">Retailer / Supermarket</option>
                <option value="REGULATOR">Regulator / Auditor</option>
                <option value="ADMIN">Consortium Admin</option>
                <option value="GUEST">Public Consumer / Guest</option>
              </select>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isBot ? 'items-start' : 'items-end justify-end'}`}
                >
                  {isBot && (
                    <div className="w-7 h-7 rounded-lg bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`space-y-2 max-w-[85%] ${isBot ? 'text-left' : 'text-right'}`}>
                    <div
                      className={`p-3.5 rounded-2xl ${
                        isBot
                          ? 'bg-slate-800/80 border border-slate-700/60 text-slate-200'
                          : 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-sky-600/20'
                      }`}
                    >
                      {isBot ? renderMessageContent(msg.text) : (
                        <p className="text-xs sm:text-[13px] whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>

                    {/* Direct Page Action Buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.actions.map((act, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleActionClick(act.route)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <span>{act.label}</span>
                            <ArrowRight className="w-3 h-3 text-sky-400" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Follow-up question pills */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="space-y-1 pt-1.5">
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <HelpCircle className="w-3 h-3 text-slate-500" />
                          <span>Suggested Inquiries</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestions.map((sug, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSend(sug)}
                              className="text-[11px] px-2.5 py-1 bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-left transition-colors"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 font-mono px-1">
                      {msg.timestamp}
                    </div>
                  </div>

                  {!isBot && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <div className="w-7 h-7 rounded-lg bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask anything about your role as ${selectedRole}...`}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 bg-gradient-to-tr from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl shadow-md transition-all flex items-center justify-center flex-shrink-0"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
