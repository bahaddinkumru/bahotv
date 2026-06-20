interface Message {
  id: string;
  text: string;
  sender: 'me' | 'stranger';
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isMe = message.sender === 'me';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe
            ? 'bg-white/20 text-white rounded-br-sm'
            : 'bg-white/30 text-white rounded-bl-sm'
          }`}
      >
        <p className="break-words">{message.text}</p>
        <p className="text-xs text-white/50 mt-1">
          {message.timestamp.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
}
