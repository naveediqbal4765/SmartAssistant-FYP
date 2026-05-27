import { overlayLayers } from '../../../components/ui/overlayLayers';

export default function IncomingCallModal({ incomingCall, onAccept, onReject }) {
  if (!incomingCall) return null;

  return (
    <div className={`motion-modal-backdrop fixed inset-0 ${overlayLayers.modal} flex items-center justify-center bg-black/40 px-4`}>
      <div className="motion-modal-in w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900">
          Incoming {incomingCall.callType === 'video' ? 'video' : 'audio'} call
        </h2>
        <p className="mt-3 text-gray-700">
          {incomingCall.fromName || 'Someone'} is calling you.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 rounded-xl bg-gray-200 px-4 py-3 font-semibold"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
