export default function ThreadPanel({ replies }) {

  if (!replies || !replies.parent) {
    return (
      <p className="text-gray-400 text-sm">
        No thread selected
      </p>
    );
  }

  return (
    <div className="text-white space-y-4">

      {/* Parent Message */}
      <div className="p-3 bg-[#1e293b] rounded">
        <p className="text-sm font-semibold text-white">
          {replies.parent?.sender?.name || "User"}
        </p>
        <p className="text-sm text-white">
          {replies.parent?.content}
        </p>
      </div>

      {/* Replies */}
      <div className="space-y-2">
        {replies.replies?.map((r) => (
          <div key={r._id} className="p-2 bg-[#0f172a] rounded">
            <p className="text-xs text-gray-400">
              {r.sender?.name}
            </p>
            <p className="text-sm text-white">
              {r.content}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}