// components/TypingIndicator.tsx
export default function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1">
      <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce"></div>
      <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce delay-500"></div>
      <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce delay-1000"></div>
    </div>
  );
}
