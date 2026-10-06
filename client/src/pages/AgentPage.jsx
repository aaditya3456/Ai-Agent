import React, { useState, useEffect, useRef } from 'react';
import { agentService } from '../services/agentService.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Button } from '../components/common/Button.jsx';
import {
  Bot,
  User,
  Send,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';

export const AgentPage = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeActionSteps, setActiveActionSteps] = useState([]);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const data = await agentService.listConversations();
      setConversations(data.conversations || []);
      if (data.conversations && data.conversations.length > 0) {
        if (!currentConversationId) {
          loadConversation(data.conversations[0]._id);
        }
      } else {
        // Start fresh
        setMessages([]);
        setCurrentConversationId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (id) => {
    setCurrentConversationId(id);
    setError(null);
    try {
      const data = await agentService.getConversationMessages(id);
      setMessages(data.messages || []);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error(err);
      setError('Failed to load conversation messages.');
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeActionSteps, sending]);

  const handleStartNewConversation = async () => {
    try {
      const data = await agentService.createConversation('New Agent Consultation');
      setConversations([data.conversation, ...conversations]);
      setCurrentConversationId(data.conversation._id);
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation history?')) return;
    try {
      await agentService.deleteConversation(id);
      const remaining = conversations.filter((c) => c._id !== id);
      setConversations(remaining);
      if (currentConversationId === id) {
        if (remaining.length > 0) {
          loadConversation(remaining[0]._id);
        } else {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputMessage;
    if (!textToSend || !textToSend.trim() || sending) return;

    setError(null);
    const userText = textToSend.trim();
    setInputMessage('');

    // Optimistically append user message
    const tempUserMsg = {
      _id: 'temp-' + Date.now(),
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    setSending(true);
    setActiveActionSteps(['Understanding your career objective...']);

    try {
      const result = await agentService.chat({
        conversationId: currentConversationId,
        message: userText,
      });

      if (!currentConversationId && result.conversationId) {
        setCurrentConversationId(result.conversationId);
        fetchConversations();
      }

      setMessages((prev) => [
        ...prev.filter((m) => m._id !== tempUserMsg._id),
        result.userMessage,
        result.assistantMessage,
      ]);
      setActiveActionSteps([]);
    } catch (err) {
      setError(err.message || 'Failed to communicate with AI Agent.');
      setActiveActionSteps([]);
    } finally {
      setSending(false);
    }
  };

  const promptSuggestions = [
    'Analyze my resume against all saved jobs and show skill gaps',
    'Which jobs currently have the highest compatibility heuristic?',
    'What key backend skills am I missing across my opportunities?',
    'Draft a customized application message for my latest job',
  ];

  if (loading) {
    return <LoadingSpinner label="Connecting to AI Agent..." size="lg" />;
  }

  return (
    <div className="h-[calc(100vh-8.5rem)] flex gap-6">
      {/* Conversation History Sidebar */}
      <div className="w-64 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between hidden lg:flex p-3">
        <div className="space-y-3 overflow-hidden flex flex-col flex-1">
          <Button
            variant="primary"
            size="sm"
            onClick={handleStartNewConversation}
            className="w-full justify-center"
            icon={Plus}
          >
            New Session
          </Button>

          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 pt-2 block">
            Session History
          </span>

          <div className="overflow-y-auto space-y-1 pr-1 flex-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-400 px-2 py-4 italic">No past sessions.</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv._id}
                  onClick={() => loadConversation(conv._id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-medium transition ${
                    currentConversationId === conv._id
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{conv.title || 'Conversation'}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv._id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 rounded transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security badge */}
        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[10px] text-slate-400">
          <span className="text-emerald-400 font-semibold block mb-0.5">Strict Privacy</span>
          Agent only queries data belonging to your authenticated account.
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Autonomous Job Search Agent
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Tool-Calling Active
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Connected with controlled access to your resume, saved jobs, matching engine, and application pipeline.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartNewConversation}
            className="text-slate-400 hover:text-slate-200"
          >
            Clear / New
          </Button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="py-8 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-100">
                  What would you like the AI Agent to investigate?
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  The agent doesn't just chat — it uses functions to inspect your resume, search opportunities, compare skill requirements, and update applications.
                </p>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
                {promptSuggestions.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850/60 text-xs text-slate-300 transition text-left leading-relaxed flex items-start gap-2"
                  >
                    <span className="text-emerald-400 shrink-0 mt-0.5">›</span>
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg._id || i}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`space-y-2 max-w-2xl ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Tool Action Step Badges */}
                  {!isUser && msg.actionSteps && msg.actionSteps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {msg.actionSteps.map((step, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{step.step}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-emerald-600 text-slate-950 font-medium rounded-tr-sm shadow-md'
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Real-time Tool Activity Indicator */}
          {sending && (
            <div className="flex gap-3.5 items-start">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {activeActionSteps.map((step, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-slate-950 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-lg flex items-center gap-2 animate-pulse"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>{step}</span>
                    </span>
                  ))}
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-400 flex items-center gap-2">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce delay-100">●</span>
                  <span className="animate-bounce delay-200">●</span>
                  <span className="ml-1">Agent reasoning & evaluating tools...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleSendMessage()}>
                Retry
              </Button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask agent: e.g. 'Compare my resume to my saved jobs and show missing skills'..."
              disabled={sending}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-50"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!inputMessage.trim() || sending}
              loading={sending}
              className="px-5 py-3 shrink-0"
              icon={Send}
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
