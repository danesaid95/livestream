"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Send, Smile, Gift, MoreVertical, Crown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  message: string;
  timestamp: Date;
  type: "message" | "gift" | "system";
  giftName?: string;
  giftAmount?: number;
  userRole?: "user" | "moderator" | "creator" | "admin";
}

interface LiveChatProps {
  streamId: string;
  className?: string;
  onSendGift?: () => void;
}

export function LiveChat({ streamId, className, onSendGift }: LiveChatProps) {
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";

    // Connect to the /chat namespace
    socketRef.current = io(`${wsUrl}/chat`, {
      auth: {
        token: accessToken,
      },
      transports: ["websocket", "polling"],
    });

    socketRef.current.on("connect", () => {
      setIsConnected(true);
      setIsConnecting(false);
      // Join the chat room for this stream
      socketRef.current?.emit("join_chat", { streamId, userId: user?.id });
    });

    socketRef.current.on("disconnect", () => {
      setIsConnected(false);
    });

    // Listen for new messages from the backend
    socketRef.current.on("new_message", (message: { id: string; userId: string; username: string; displayName: string; content: string; timestamp: string; isCreator?: boolean }) => {
      setMessages((prev) => [...prev, {
        id: message.id,
        userId: message.userId,
        username: message.username,
        displayName: message.displayName,
        message: message.content,
        timestamp: new Date(message.timestamp),
        type: "message",
        userRole: message.isCreator ? "creator" : "user",
      }]);
    });

    socketRef.current.on("gift-sent", (data: ChatMessage) => {
      setMessages((prev) => [...prev, { ...data, type: "gift" }]);
    });

    // Listen for chat history when joining
    socketRef.current.on("chat_history", (data: { messages: { id: string; userId: string; username: string; displayName: string; content: string; timestamp: string; isCreator?: boolean }[] }) => {
      const formattedMessages = data.messages.map((msg) => ({
        id: msg.id,
        userId: msg.userId,
        username: msg.username,
        displayName: msg.displayName,
        message: msg.content,
        timestamp: new Date(msg.timestamp),
        type: "message" as const,
        userRole: msg.isCreator ? "creator" as const : "user" as const,
      }));
      setMessages(formattedMessages);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Chat connection error:", error);
      setIsConnecting(false);
      setIsConnected(false);
    });

    return () => {
      socketRef.current?.emit("leave_chat", { streamId });
      socketRef.current?.disconnect();
    };
  }, [streamId, accessToken, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!inputMessage.trim() || !isAuthenticated || !socketRef.current) return;

    socketRef.current.emit("send_message", {
      streamId,
      userId: user?.id,
      content: inputMessage.trim(),
    });

    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "creator":
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-600 text-[10px] font-bold">
            <Crown className="w-3 h-3" />
            CREATOR
          </span>
        );
      case "moderator":
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-600 text-[10px] font-bold">
            <Shield className="w-3 h-3" />
            MOD
          </span>
        );
      case "admin":
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-600 text-[10px] font-bold">
            ADMIN
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-gray-900 rounded-lg border border-gray-800 h-full",
        className
      )}
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="font-semibold text-white">Live Chat</h3>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )}
          />
          <span className="text-xs text-gray-400">
            {isConnecting
              ? "Connecting..."
              : isConnected
              ? "Connected"
              : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
      >
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              No messages yet. Be the first to say something!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="group">
            {msg.type === "gift" ? (
              <div className="bg-gradient-to-r from-violet-600/20 to-pink-600/20 border border-violet-500/30 rounded-lg p-3 text-center">
                <Gift className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                <p className="text-sm">
                  <span className="font-semibold text-violet-400">
                    {msg.displayName}
                  </span>{" "}
                  sent{" "}
                  <span className="font-bold text-yellow-400">
                    {msg.giftName}
                  </span>
                  {msg.giftAmount && (
                    <span className="text-gray-400">
                      {" "}
                      x{msg.giftAmount}
                    </span>
                  )}
                </p>
              </div>
            ) : msg.type === "system" ? (
              <div className="text-center">
                <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
                  {msg.message}
                </span>
              </div>
            ) : (
              <div className="flex gap-2 hover:bg-gray-800/50 rounded p-1 -m-1 transition-colors">
                <Avatar
                  src={null}
                  fallback={msg.displayName?.substring(0, 2) || "??"}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-violet-400 truncate">
                      {msg.displayName}
                    </span>
                    {getRoleBadge(msg.userRole)}
                    <span className="text-[10px] text-gray-600">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 break-words">
                    {msg.message}
                  </p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-800">
        {!isAuthenticated ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-400">
              <a href="/auth/login" className="text-violet-400 hover:underline">
                Log in
              </a>{" "}
              to join the chat
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onSendGift}
              className="p-2 text-yellow-400 hover:bg-gray-800 rounded-lg transition-colors"
              title="Send Gift"
            >
              <Gift className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg transition-colors">
              <Smile className="w-5 h-5" />
            </button>
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Send a message..."
              className="flex-1 bg-gray-800 border-gray-700 text-sm"
              maxLength={200}
              disabled={!isConnected}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || !isConnected}
              size="icon"
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
