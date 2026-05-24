export default function GroupRequestsPanel({ requests, onApprove, onReject }) {
  if (!requests.length) {
    return <div className="text-sm text-gray-500">No pending requests.</div>;
  }

  return (
    <div className="space-y-2">
      {requests.map((request) => (
        <div key={request._id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <p className="font-semibold">{request.userId?.name}</p>
            <p className="text-sm capitalize text-gray-500">{request.userId?.role}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onApprove(request._id)} className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white">
              Approve
            </button>
            <button onClick={() => onReject(request._id)} className="rounded-lg bg-gray-200 px-3 py-2 text-sm">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
