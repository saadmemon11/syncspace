export default function MessageItem({ message }) {
  return (
    <div className="flex items-start gap-3 p-2 hover:bg-slate-800 rounded-lg">

      {/* Avatar */}
      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm">
        {message.sender.name[0]}
      </div>

      {/* Content */}
      <div>
        <div className="text-sm font-semibold">
          {message.sender.name}
        </div>

        <div className="text-sm text-slate-300">
          {message.content}
        </div>
      </div>

    </div>
  );
}