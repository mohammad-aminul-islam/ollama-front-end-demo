// ============================================
// OPTION 1: Direct API Call (app/page.tsx) with file upload
// ============================================
"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import TypingIndicator from "./ui/TypingIndicator";

interface Message {
  role: "user" | "assistant";
  content: string;
  fileName?: string;
}
export interface AIModel {
  id: number;
  text: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const AIModels: AIModel[] = [
    { id: 1, text: "Ollama" },
    { id: 2, text: "Gemini" },
  ];
  const [modelId, setModelId] = useState<number>(1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() && !selectedFile) return;
    if (isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      fileName: selectedFile?.name,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedFile(null);
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append("prompt", input);
      formData.append("model", modelId.toString());
      if (selectedFile) formData.append("attachment", selectedFile);

      const response = await fetch("http://localhost:5088/api/chats", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      // Add empty assistant message that we'll update
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (data.done) {
              setIsLoading(false);
              break;
            }

            assistantMessage += data.content;

            // Update the last message (assistant's message)
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: "assistant",
                content: assistantMessage,
              };
              return newMessages;
            });
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Request cancelled");
      } else {
        console.error("Error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, there was an error processing your request.",
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  function onChangeAIDropdown(event: ChangeEvent<HTMLSelectElement>): void {
    setModelId(parseInt(event.target.value));
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-10">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 border-b grid grid-flow-col">
        <h1 className="text-2xl font-bold text-gray-800">Ollama Chat</h1>
        <select
          onChange={onChangeAIDropdown}
          className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {AIModels.map((item, index) => (
            <option key={index} value={item.id}>
              {item.text}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <p className="text-lg">Start a conversation with Ollama</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[100%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-800 shadow"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.fileName && (
                <p className="text-sm text-blue-600 mt-1">
                  File: {message.fileName}
                </p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg p-3 shadow">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4 m-5 rounded-lg">
        <div className="max-w-4xl mx-auto flex gap-2 flex-col sm:flex-row">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 resize-none border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            rows={1}
          />
          <input
            type="file"
            onChange={handleFileChange}
            className="border rounded-lg p-2"
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              onClick={cancelRequest}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim() && !selectedFile}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
