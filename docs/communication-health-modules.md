# Communication and Health Module Documentation

This document describes two major Smart Senior Assistant modules for developer onboarding:

- Communication Module: chat, groups, calls, notifications, voice notes, and media uploads.
- Health Module: medications, appointments, drug interaction checker, digital health vault, and telemetry.

Paths below are relative to the project root `D:/smart-senior-assistant`.

## Communication Module

### Module Overview

The Communication Module powers Care Connect. It provides private messaging, group messaging, audio/video calls, group calls, realtime presence, message reactions, read receipts, notifications, voice notes, and Cloudinary-backed media uploads.

Primary users:

- Seniors use private chat, group chat, calls, notifications, and Care Connect.
- Caregivers use communication with linked seniors and relevant groups.
- Volunteers use chat, groups, calls, and notification flows for senior assistance.

### File Structure

Frontend files:

- `client/src/features/communication/CommunicationHub.jsx` - Care Connect landing page linking to chats, groups, and calls.
- `client/src/features/communication/chat/pages/ChatPage.jsx` - Main private chat page for conversations, messages, uploads, reactions, receipts, forwarding, and embedded calls.
- `client/src/features/communication/chat/services/chatApi.js` - Axios client for private chat, conversations, uploads, reactions, search, and delete APIs.
- `client/src/features/communication/chat/services/socket.js` - Shared Socket.IO client singleton using JWT auth.
- `client/src/features/communication/chat/hooks/useChatSocket.js` - React socket hook for private chat messages, notifications, presence, reactions, and receipts.
- `client/src/features/communication/chat/components/ChatBox.jsx` - Private chat shell combining message window, input, capture modal, and call screen.
- `client/src/features/communication/chat/components/ChatWindow.jsx` - Private message viewport with presence, call buttons, scrolling, and highlighting.
- `client/src/features/communication/chat/components/ChatInput.jsx` - Text, typing, media, camera capture, and voice recorder entry point.
- `client/src/features/communication/chat/components/MessageBubble.jsx` - Renders text, media, files, voice notes, call messages, replies, forwards, reactions, and actions.
- `client/src/features/communication/chat/components/VoiceRecorder.jsx` - Browser microphone recorder for voice notes.
- `client/src/features/communication/chat/components/MediaCaptureModal.jsx` - Browser camera/photo/video capture with fallback upload.
- `client/src/features/communication/chat/components/ConversationList.jsx` - Conversation list states and rendering.
- `client/src/features/communication/chat/components/ConversationItem.jsx` - Conversation row with swipe delete behavior.
- `client/src/features/communication/chat/components/SearchUsers.jsx` - User search for starting new private conversations.
- `client/src/features/communication/chat/components/ForwardMessageModal.jsx` - Modal for forwarding messages to users, chats, or groups.
- `client/src/features/communication/chat/components/ReplyPreview.jsx` - Reply preview UI.
- `client/src/features/communication/chat/utils/replyPreview.js` - Reply target and preview text helpers.
- `client/src/features/communication/chat/utils/reactionEmojiMap.js` - Reaction type to emoji mapping.
- `client/src/features/communication/groups/GroupPage.jsx` - Main group chat page for groups, messages, calls, settings, join requests, uploads, reactions, and receipts.
- `client/src/features/communication/groups/groupApi.js` - Axios client for group APIs and group upload APIs.
- `client/src/features/communication/groups/GroupChat.jsx` - Group message UI with typing, replies, voice/media/file sending, and call controls.
- `client/src/features/communication/groups/GroupList.jsx` - My groups and discover groups UI.
- `client/src/features/communication/groups/CreateGroupModal.jsx` - Create group modal with initial members.
- `client/src/features/communication/groups/AddMemberModal.jsx` - Admin modal for searching and adding members.
- `client/src/features/communication/groups/GroupSettingsModal.jsx` - Group details, settings, members, removal, and request management.
- `client/src/features/communication/groups/GroupRequestsPanel.jsx` - Admin panel for approving or rejecting join requests.
- `client/src/features/communication/groups/AdminLeaveGroupModal.jsx` - Admin leave flow requiring transfer or delete.
- `client/src/features/communication/groups/useGroupCall.js` - Multi-peer WebRTC group-call hook.
- `client/src/features/communication/groups/GroupCallScreen.jsx` - Group call participant grid and controls.
- `client/src/features/communication/groups/GroupCallInviteHandler.jsx` - Global group-call invite popup and ringtone handler.
- `client/src/features/communication/calls/callSocket.js` - Private call socket emit wrapper.
- `client/src/features/communication/calls/useWebRTC.js` - One-to-one WebRTC hook.
- `client/src/features/communication/calls/CallStateContext.jsx` - Global incoming private-call state and ringtone management.
- `client/src/features/communication/calls/GlobalCallHandler.jsx` - App-level incoming call modal and active call screen.
- `client/src/features/communication/calls/IncomingCallModal.jsx` - Accept/reject private call modal.
- `client/src/features/communication/calls/CallScreen.jsx` - Private audio/video call UI.
- `client/src/features/communication/calls/CallButton.jsx` - Audio/video call action button component.
- `client/src/features/communication/calls/CallsPage.jsx` - Call history page using stored private and group call messages.
- `client/src/features/communication/notifications/notificationApi.js` - Axios client for notifications.
- `client/src/features/communication/notifications/useNotifications.js` - Notification state hook, realtime listener, unread count, sounds, and reminder popups.
- `client/src/features/communication/notifications/NotificationContext.jsx` - Notification context provider.
- `client/src/features/communication/notifications/NotificationBell.jsx` - Header notification bell and routing behavior.
- `client/src/features/communication/notifications/NotificationDropdown.jsx` - Notification dropdown with delete and clear behavior.
- `client/src/features/communication/notifications/AutoNotificationConsumer.jsx` - Auto-consumes notifications when matching content is already visible.
- `client/src/features/communication/notifications/ReminderNotificationPopup.jsx` - Call reminder popup UI.
- `client/src/features/communication/notifications/notificationConsumption.js` - Notification consume helper.
- `client/src/features/communication/audio/audioFeedback.js` - Web Audio tones for notifications, reminders, and calls.
- `client/src/features/communication/DEV_NOTES.md` - Communication development notes.
- `client/src/App.jsx` - Registers communication routes and global communication overlays.
- `client/src/components/layout/AppShell.jsx` - Wraps authenticated pages with app header and notification context.
- `client/src/components/layout/AppHeader.jsx` - Displays the notification bell and Care Connect shortcut.

Backend files:

- `server/src/app.js` - Mounts communication HTTP APIs.
- `server/src/server.js` - Creates HTTP server, initializes Socket.IO, and starts background services.
- `server/src/modules/communication/communication.routes.js` - Parent communication router.
- `server/src/modules/communication/conversation.controller.js` - Deletes or hides private/group conversations for the current user.
- `server/src/modules/communication/README.md` - Backend communication notes.
- `server/src/modules/communication/chat/chat.routes.js` - Private chat HTTP routes.
- `server/src/modules/communication/chat/conversation.routes.js` - Nested conversation HTTP routes.
- `server/src/modules/communication/chat/chat.controller.js` - Private message, delete, and reaction handlers.
- `server/src/modules/communication/chat/conversation.controller.js` - Conversation list, create, resolve, get, and search handlers.
- `server/src/modules/communication/chat/chat.service.js` - Private message persistence, permissions, replies, reactions, delivery, and seen status.
- `server/src/modules/communication/chat/conversation.service.js` - Conversation creation, visibility, search, and permission filtering.
- `server/src/modules/communication/chat/chat.model.js` - `ChatMessage` Mongoose model.
- `server/src/modules/communication/chat/conversation.model.js` - `Conversation` Mongoose model.
- `server/src/modules/communication/chat/chat.socket.js` - Private chat socket handlers.
- `server/src/modules/communication/chat/messageReaction.routes.js` - Global message reaction route mounted at `/api/messages`.
- `server/src/modules/communication/chat/voiceNoteReaction.routes.js` - Global voice note reaction route mounted at `/api/voice-notes`.
- `server/src/modules/communication/groups/group.routes.js` - Group HTTP routes.
- `server/src/modules/communication/groups/group.controller.js` - Group CRUD, messages, reactions, membership, requests, mute, and notification handlers.
- `server/src/modules/communication/groups/group.service.js` - Group business rules, permissions, messages, receipts, reactions, and join requests.
- `server/src/modules/communication/groups/group.model.js` - `Group`, `GroupJoinRequest`, and `GroupMessage` models.
- `server/src/modules/communication/groups/group.socket.js` - Group chat and group call socket handlers.
- `server/src/modules/communication/calls/call.routes.js` - Placeholder call HTTP router.
- `server/src/modules/communication/calls/call.controller.js` - Placeholder call controller.
- `server/src/modules/communication/calls/call.service.js` - Private call permission wrapper.
- `server/src/modules/communication/calls/call.socket.js` - Private call signaling and call log persistence.
- `server/src/modules/communication/calls/call.model.js` - Placeholder call model boundary.
- `server/src/modules/communication/notifications/notification.routes.js` - Notification HTTP routes.
- `server/src/modules/communication/notifications/notification.controller.js` - Notification list/read/consume/delete/clear handlers.
- `server/src/modules/communication/notifications/notification.service.js` - Notification persistence and realtime emit service.
- `server/src/modules/communication/notifications/notification.model.js` - `Notification` Mongoose model.
- `server/src/modules/notifications/notification.dispatcher.js` - Retry/log wrapper around notification dispatch.
- `server/src/modules/notifications/notificationDispatchLog.model.js` - Notification dispatch log model.
- `server/src/modules/communication/uploads/upload.routes.js` - Cloudinary-backed audio/media upload routes.
- `server/src/modules/communication/uploads/upload.controller.js` - Upload HTTP response handlers.
- `server/src/modules/communication/uploads/upload.service.js` - Upload validation and response shaping.
- `server/src/modules/communication/uploads/upload.socket.js` - Upload socket placeholder.
- `server/src/modules/communication/uploads/upload.model.js` - Upload model placeholder.
- `server/src/modules/communication/sockets/socket.server.js` - Socket.IO server initialization.
- `server/src/modules/communication/sockets/communication.socket.js` - Socket auth, user room joins, and communication handler registration.
- `server/src/modules/communication/sockets/socket.auth.js` - Socket JWT/fallback auth.
- `server/src/modules/communication/sockets/socket.manager.js` - Shared realtime emit helper for communication and cross-module events.
- `server/src/modules/communication/permissions/communicationPermission.service.js` - Role/link permission rules for communication actions.
- `server/src/shared/cloudinary.js` - Cloudinary storage, folder mapping, public IDs, and deletion helpers.
- `server/src/middleware/auth.js` - Auth middleware export.
- `server/src/shared/jwt/authMiddleware.js` - Bearer token auth and `req.user` loading.
- `server/src/shared/models/User.js` - Shared user model export.
- `server/models/User.js` - User model with roles, linked relationships, online status, and last seen fields.

### Features List

- Private conversations: users can search allowed contacts, create/resolve conversations, list visible conversations, and hide conversations.
- Private messaging: text, media, files, voice notes, replies, forwards, reactions, delete for me/everyone, delivered receipts, seen receipts, typing state, and presence.
- Group management: create groups, discover groups, request to join, approve/reject requests, add/remove members, mute groups, update group details, leave groups, and admin transfer/delete.
- Group messaging: group text, media, file, voice, replies, forwards, reactions, delete, delivered receipts, seen receipts, and typing state.
- Private calls: one-to-one WebRTC audio/video calls with incoming modal, ringtone, ICE signaling, accept/reject/end behavior, and persisted call logs.
- Group calls: group call invites, join/leave/end, multi-peer WebRTC signaling, participant UI, and persisted group call logs.
- Notifications: persisted notifications, realtime `newNotification`, unread count, dropdown, delete/clear, auto-consume, click-through routing, and sounds.
- Uploads: Cloudinary-backed audio, image, video, and document uploads for chat/group messages.
- Presence: sockets update user online/offline state and broadcast presence changes.

### How It Works

Private chat flow:

1. The user opens `ChatPage.jsx`, which loads conversations through `chatApi.js`.
2. Selecting or searching a user resolves a conversation through `/api/communication/chat/conversations/resolve`.
3. Sending a text message calls `POST /api/communication/chat/message`.
4. `chat.controller.js` delegates to `chat.service.js`.
5. The service validates communication permission, creates a `ChatMessage`, updates or creates the `Conversation`, and optionally creates a notification.
6. The server emits `newMessage` to the receiver room.
7. The receiver UI appends the message and emits delivered/seen events when appropriate.
8. The sender UI receives receipt events and updates message status.

Private media and voice flow:

1. The user records audio or selects/captures media in `ChatInput.jsx`.
2. `chatApi.js` uploads the file to `/api/communication/uploads/audio` or `/api/communication/uploads/media`.
3. `upload.routes.js` stores the file in Cloudinary through `createCloudinaryStorage`.
4. The upload API returns a Cloudinary URL and metadata.
5. `ChatPage.jsx` sends a normal message using that URL and metadata.

Group chat flow:

1. `GroupPage.jsx` loads groups through `groupApi.js`.
2. Opening a group emits `join-group-room`.
3. Sending a group message emits `group-message`.
4. `group.socket.js` calls `group.service.js`, which checks membership, saves a `GroupMessage`, and creates notifications for eligible members.
5. The server emits `group-message` to group member user rooms.
6. Clients append the message and send delivered/seen receipts.

Private call flow:

1. `useWebRTC.js` obtains local media and emits `call-user` with an SDP offer.
2. `call.socket.js` validates call permissions and forwards the offer to the callee.
3. The callee accepts with `call-accepted`; both peers exchange `ice-candidate`.
4. Ending the call emits `end-call`.
5. The server writes call log messages as `ChatMessage` records with `messageType: "call"` and emits `newMessage`.
6. `CallsPage.jsx` reads call logs from stored messages and displays history.

Notification flow:

1. Backend services call `notification.service.js` to persist a notification.
2. The service emits `newNotification` to the target user room.
3. `useNotifications.js` merges it into local state, plays sound, and updates unread count.
4. `NotificationBell.jsx` routes clicks to chat, group, task, or reminder context.
5. `notificationConsumption.js` can mark matching notifications consumed.

### Socket Events

- `user:presence:active`: emitted by client `App.jsx`; listened by backend; marks user active/online.
- `user:presence:inactive`: emitted by client `App.jsx`; listened by backend; marks user inactive/offline.
- `user:online`: emitted by backend; listened by chat UI; updates presence.
- `user:offline`: emitted by backend; listened by chat UI; updates presence.
- `chat:send`: emitted by client; listened by backend; saves private message and emits `newMessage`.
- `newMessage`: emitted by backend; listened by chat and calls UIs; delivers private messages and call logs.
- `typing:start`: emitted by sender; backend forwards to receiver; shows typing indicator.
- `typing:stop`: emitted by sender; backend forwards to receiver; clears typing indicator.
- `message:delivered`: emitted by receiver; backend updates message status and notifies sender.
- `message:seen`: emitted by receiver; backend updates seen status and notifies sender.
- `message-deleted`: emitted by backend; listened by chat/group UIs; removes or updates deleted message.
- `ITEM_REACTION_UPDATED`: emitted by backend after reactions; listened by chat/group UIs; updates reactions.
- `conversation-deleted`: emitted by backend; listened by list UIs; removes hidden conversation/group locally.
- `create-group`: emitted by client; backend creates group and returns it through callback.
- `join-group-room`: emitted by group page; backend joins `group:{id}` room and returns active call state.
- `group-message`: emitted by group page and backend; saves and distributes group messages.
- `group:typing:start`: emitted by group member; backend broadcasts typing to other members.
- `group:typing:stop`: emitted by group member; backend broadcasts stop typing.
- `group-message:delivered`: emitted by member; backend records delivery.
- `group-message:seen`: emitted by member; backend records seen state.
- `group-updated`: emitted by backend; group UIs refresh membership/settings state.
- `group-request-updated`: emitted by backend; group request UIs refresh request state.
- `call-user`: emitted by caller; backend validates and forwards offer.
- `call-accepted`: emitted by callee; backend forwards answer.
- `ice-candidate`: emitted by either peer; backend forwards ICE candidate.
- `end-call`: emitted by either peer; backend ends call and persists call logs.
- `call-error`: emitted by backend; call UI displays or handles failure.
- `group-call:start`: emitted by starter; backend creates active group call and invites members.
- `group-call:invite`: emitted by backend; global group call invite UI shows popup.
- `group-call:accept`: emitted by invitee; backend acknowledges active invite.
- `group-call:ignore`: emitted by invitee; backend acknowledges ignored invite.
- `group-call:join`: emitted by participant; backend joins participant to call room.
- `group-call:join-existing`: emitted by participant; backend syncs participant into existing call.
- `group-call:offer`: emitted by group call peer; backend forwards offer to target peer.
- `group-call:answer`: emitted by group call peer; backend forwards answer.
- `group-call:ice-candidate`: emitted by group call peer; backend forwards ICE candidate.
- `group-call:user-joined`: emitted by backend; group call UI adds participant.
- `group-call:user-left`: emitted by client/backend; group call UI removes participant.
- `group-call:end`: emitted by client/backend; ends group call and logs it.
- `group-call:cancelled`: emitted by backend; invite UI dismisses missed/cancelled call.
- `newNotification`: emitted by notification service; listened by notification UI and reminder popups.

### API Routes

Private chat and conversations:

- `GET /api/communication/chat/conversations`: returns current user conversations.
- `POST /api/communication/chat/conversations/resolve`: resolves or creates a conversation context.
- `GET /api/communication/chat/conversations/:conversationId`: returns one visible conversation.
- `POST /api/communication/chat/conversations`: creates or reuses a conversation with a participant.
- `GET /api/communication/chat/search-users?query=`: searches allowed users.
- `POST /api/communication/chat/message`: sends a private message.
- `DELETE /api/communication/chat/message/:id`: deletes a private message for self or everyone.
- `POST /api/communication/chat/message/:id/reaction`: toggles a private message reaction.
- `POST /api/communication/chat/voice-note/:id/reaction`: toggles a voice note reaction.
- `GET /api/communication/chat/:userId`: returns messages with a specific user.
- `DELETE /api/communication/conversation/:id`: hides a private or group conversation for the current user.
- `POST /api/messages/:id/reaction`: legacy/global message reaction endpoint.
- `POST /api/voice-notes/:id/reaction`: legacy/global voice note reaction endpoint.

Groups:

- `POST /api/communication/groups`: creates a group.
- `GET /api/communication/groups`: returns current user groups.
- `GET /api/communication/groups/discover`: returns discoverable groups.
- `GET /api/communication/groups/create/search-users?query=`: searches users for initial group members.
- `POST /api/communication/groups/add-member`: adds a member to a group.
- `DELETE /api/communication/groups/message/:id`: deletes a group message.
- `POST /api/communication/groups/message/:id/reaction`: toggles a group message reaction.
- `PATCH /api/communication/groups/requests/:requestId/approve`: approves a join request.
- `PATCH /api/communication/groups/requests/:requestId/reject`: rejects a join request.
- `GET /api/communication/groups/:groupId/messages`: returns group messages.
- `POST /api/communication/groups/:groupId/messages`: sends a group message over HTTP.
- `PATCH /api/communication/groups/:groupId`: updates group metadata.
- `DELETE /api/communication/groups/:groupId`: deletes a group.
- `POST /api/communication/groups/:groupId/exit`: exits a group.
- `POST /api/communication/groups/:groupId/transfer-admin-exit`: transfers admin ownership and exits.
- `PATCH /api/communication/groups/:groupId/mute`: toggles group mute for current user.
- `POST /api/communication/groups/:groupId/join-request`: creates a join request.
- `DELETE /api/communication/groups/:groupId/join-request`: cancels a pending join request.
- `GET /api/communication/groups/:groupId/requests`: returns pending join requests.
- `GET /api/communication/groups/:groupId/search-users?query=`: searches addable users.
- `DELETE /api/communication/groups/:groupId/members/:userId`: removes a member.
- `POST /api/communication/group`: legacy alias for group creation.
- Other `/api/communication/group/*` routes mirror `/api/communication/groups/*` through the legacy mount.

Uploads:

- `POST /api/communication/uploads/audio`: uploads voice audio to Cloudinary and returns `{ success, audio }`.
- `POST /api/communication/uploads/media`: uploads image/video/document media to Cloudinary and returns `{ success, media }`.

Notifications:

- `GET /api/communication/notifications`: returns latest notifications for the current user.
- `DELETE /api/communication/notifications`: clears all current-user notifications.
- `PATCH /api/communication/notifications/consume`: marks matching notifications read by context.
- `PATCH /api/communication/notifications/:id/read`: marks one notification read.
- `DELETE /api/communication/notifications/:id`: deletes one notification.

Calls:

- `server/src/modules/communication/calls/call.routes.js` currently defines no HTTP call endpoints; call signaling is socket-based.

### Database Models

- `ChatMessage`: stores private messages, media metadata, voice metadata, call logs, replies, forwards, delete state, reactions, delivery status, and seen timestamps.
- `Conversation`: stores private conversation participants, last message summary, last activity time, and per-user hidden state.
- `Group`: stores group name, description, creator, hidden users, muted users, members, and member roles.
- `GroupJoinRequest`: stores group join request user, group, status, and timestamps.
- `GroupMessage`: stores group messages, media metadata, voice metadata, call logs, replies, forwards, delete state, reactions, delivered users, and seen users.
- `Notification`: stores target user, notification type, linked entity IDs, title, message, read state, and timestamp.
- `NotificationDispatchLog`: stores notification dispatch attempts, payloads, errors, retry count, status, and timestamp.
- `User`: communication uses role, linked senior/caregiver relationships, `isOnline`, and `lastSeenAt`.

### Dependencies

Frontend:

- `react`, `react-dom`, `react-router-dom`
- `axios`
- `socket.io-client`
- `lucide-react`
- Browser APIs: `RTCPeerConnection`, `MediaStream`, `MediaRecorder`, `navigator.mediaDevices.getUserMedia`, and Web Audio API.

Backend:

- `express`
- `socket.io`
- `mongoose`
- `jsonwebtoken`
- `multer`
- `cloudinary`
- `multer-storage-cloudinary`
- `cors`
- `dotenv`
- `express-session`
- `passport`

Shared utilities:

- `server/src/shared/cloudinary.js`
- `server/src/shared/jwt/authMiddleware.js`
- `server/src/modules/communication/sockets/socket.manager.js`
- `server/src/modules/communication/permissions/communicationPermission.service.js`

## Health Module

### Module Overview

The Health Module supports medication management, appointment scheduling, reminder popups, drug interaction checking, digital health vault documents, and telemetry/IoT health monitoring.

Primary users:

- Seniors create and manage medications, appointments, reminders, and vault documents.
- Caregivers view linked senior medications, appointments, telemetry, and vault documents.
- Volunteers generally do not manage health data and are blocked from medication/appointment management views.

### File Structure

Frontend files:

- `client/src/App.jsx` - Registers health routes and global reminder overlays.
- `client/src/features/health/components/HealthPlaceholder.jsx` - Shared health page wrapper.
- `client/src/features/health/medications/medicationApi.js` - Medication Axios client.
- `client/src/features/health/medications/MedicationPage.jsx` - Medication management page with role-based access and realtime refresh.
- `client/src/features/health/medications/MedicationForm.jsx` - Medication form with multiple schedule types.
- `client/src/features/health/medications/MedicationList.jsx` - Medication list with reminder status display.
- `client/src/features/health/medications/MedicationReminder.jsx` - Due medication popup with Taken, Skip, and Dismiss actions.
- `client/src/features/health/appointments/appointmentApi.js` - Appointment Axios client.
- `client/src/features/health/appointments/AppointmentPage.jsx` - Appointment page with calendar, list, form, and role-based behavior.
- `client/src/features/health/appointments/AppointmentForm.jsx` - Appointment form with future date/time validation.
- `client/src/features/health/appointments/AppointmentList.jsx` - Appointment list for selected dates.
- `client/src/features/health/appointments/AppointmentCalendar.jsx` - Calendar with appointment counts.
- `client/src/features/health/appointments/AppointmentNotification.jsx` - Appointment reminder popup.
- `client/src/features/health/reminders/GlobalSeniorReminderPopups.jsx` - Global senior reminder overlay for medication, appointment, and call reminders.
- `client/src/features/health/interactions/interactionApi.js` - Drug interaction Axios client.
- `client/src/features/health/interactions/DrugInteractionPage.jsx` - Drug interaction checker page wrapper.
- `client/src/features/health/interactions/DrugInteractionChecker.jsx` - Dataset-backed medicine selector and interaction result UI.
- `client/src/features/health/vault/HealthVaultPage.jsx` - Health vault route wrapper.
- `client/src/pages/DocumentVault.jsx` - Digital Health Vault list/upload/view/delete UI.
- `client/src/features/health/telemetry/TelemetryDashboard.jsx` - Telemetry page wrapper.
- `client/src/features/health/iot/components/IoTDashboard.jsx` - Live vitals dashboard.
- `client/src/features/health/iot/components/VitalsCard.jsx` - Individual vitals display card.
- `client/src/features/health/iot/hooks/useRealtimeVitals.js` - Socket listener for telemetry updates.
- `client/src/features/health/iot/hooks/useVitalsSource.js` - Vitals source abstraction.
- `client/src/features/health/iot/hooks/useMockVitals.js` - Local mock vitals hook.
- `client/src/features/health/iot/types/vitals.contract.js` - Vitals snapshot contract and validation helpers.
- `client/src/pages/dashboard/dashboardRoleConfig.jsx` - Dashboard health route/module config.
- `client/src/pages/dashboard/DashboardHome.jsx` - Dashboard tile routing for health features.
- `client/src/pages/dashboard/DashboardPanels.jsx` - Telemetry, reminders, appointments, medications, and vault summaries.
- `client/src/features/communication/notifications/useNotifications.js` - Receives reminder notifications through `newNotification`.
- `client/src/features/communication/notifications/ReminderNotificationPopup.jsx` - Call reminder notification popup.
- `client/src/features/communication/notifications/AutoNotificationConsumer.jsx` - Consumes route-matched notifications.
- `client/src/features/communication/chat/services/socket.js` - Shared socket client used by health realtime features.

Backend files:

- `server/src/app.js` - Mounts `/api/health`, `/api/reminders`, `/api/user`, and communication APIs used by health.
- `server/src/server.js` - Starts Socket.IO, reminder worker, and telemetry simulator.
- `server/src/modules/health/health.routes.js` - Parent health router.
- `server/src/modules/health/medications/medication.routes.js` - Medication route definitions.
- `server/src/modules/health/medications/medication.controller.js` - Medication controllers.
- `server/src/modules/health/medications/medication.service.js` - Medication validation, schedule computation, reminder occurrences, and realtime emits.
- `server/src/modules/health/medications/medication.model.js` - Medication model.
- `server/src/modules/health/appointments/appointment.routes.js` - Appointment route definitions.
- `server/src/modules/health/appointments/appointment.controller.js` - Appointment controllers.
- `server/src/modules/health/appointments/appointment.service.js` - Appointment validation, timezone conversion, reminder lifecycle, and realtime emits.
- `server/src/modules/health/appointments/appointment.model.js` - Appointment model.
- `server/src/modules/health/interactions/interaction.routes.js` - Drug interaction route definitions.
- `server/src/modules/health/interactions/interaction.controller.js` - Drug interaction controllers.
- `server/src/modules/health/interactions/interaction.service.js` - Re-export to nested interaction service.
- `server/src/modules/health/interactions/service/interaction.service.js` - Dataset mapping, interaction rules, severity, and optional LLM explanation.
- `server/src/modules/health/interactions/rules/interaction.rules.js` - Drug category interaction rules.
- `server/src/modules/health/interactions/llm/llm.service.js` - Optional OpenRouter explanation service.
- `server/src/modules/health/interactions/data/drugs.dataset.json` - Local drug dataset.
- `server/src/modules/health/vault/vault.routes.js` - Health vault status route.
- `server/src/modules/health/vault/vault.controller.js` - Health vault status controller.
- `server/src/modules/health/vault/vault.service.js` - Status response noting the actual vault uses document APIs.
- `server/src/modules/health/telemetry/telemetry.routes.js` - Telemetry status route.
- `server/src/modules/health/telemetry/telemetry.controller.js` - Telemetry status controller.
- `server/src/modules/health/telemetry/telemetry.service.js` - Telemetry status service.
- `server/src/modules/health/telemetry/telemetry.model.js` - Placeholder telemetry model.
- `server/src/modules/health/telemetry/telemetry.simulator.js` - Simulated vitals emitter.
- `server/src/modules/reminders/reminder.routes.js` - Call reminder route definitions.
- `server/src/modules/reminders/reminder.controller.js` - Call reminder controllers.
- `server/src/modules/reminders/reminder.service.js` - Call reminder create/list/delete logic.
- `server/src/modules/reminders/reminder.model.js` - Call reminder model.
- `server/src/modules/reminders/reminder.worker.js` - Unified scheduler for call, appointment, and medication reminders.
- `server/src/modules/profile/profile.routes.js` - Digital Health Vault document routes under `/api/user/documents`.
- `server/src/modules/profile/profile.controller.js` - Profile document controllers.
- `server/src/modules/profile/profile.service.js` - Vault access rules, document metadata persistence, Cloudinary delete, and activity logging.
- `server/models/Document.js` - Digital Health Vault document model.
- `server/src/shared/models/Document.js` - Document model re-export.
- `server/models/User.js` - User model with role, linked caregiver/senior, privacy, emergency contacts, and location.
- `server/src/shared/cloudinary.js` - Cloudinary storage and delete helpers.
- `server/src/middleware/auth.js` - Auth middleware export.
- `server/src/shared/jwt/authMiddleware.js` - JWT auth middleware.
- `server/src/modules/communication/sockets/socket.manager.js` - Shared socket emitters for telemetry, reminders, medication status, tasks, and notifications.
- `server/src/modules/communication/sockets/socket.server.js` - Socket.IO initialization.
- `server/src/modules/communication/sockets/communication.socket.js` - Socket auth and user room setup.
- `server/src/modules/communication/notifications/notification.service.js` - Notification creation and realtime delivery.
- `server/src/modules/communication/notifications/notification.model.js` - Notification model used by reminders.

### Features List

- Medication CRUD: seniors manage medications, caregivers view linked senior medications, volunteers are blocked.
- Medication schedules: once daily, multiple daily, interval hours, weekly, and as-needed schedules.
- Medication reminder status: active occurrences can be dismissed, taken, skipped, or expired.
- Appointment CRUD: seniors manage appointments, caregivers view linked senior appointments.
- Appointment reminders: backend computes appointment UTC time, reminder window, repeat popup timing, and expiration.
- Global senior reminder popups: shows active medication, appointment, and call reminders without requiring page refresh.
- Drug interaction checker: checks selected medicines against local dataset and rule engine.
- Digital Health Vault: seniors upload/list/view/delete documents; caregivers view linked senior vault read-only.
- Telemetry dashboard: receives simulated vitals over sockets and renders live cards.
- Dashboard summaries: health panels preview telemetry, upcoming reminders, appointments, medications, and vault counts.

### How It Works

Medication flow:

1. `MedicationPage.jsx` calls `medicationApi.js`.
2. Requests hit `/api/health/medications`.
3. `medication.controller.js` delegates to `medication.service.js`.
4. The service validates role, validates schedule, creates or updates `Medication`, and schedules the next reminder worker run.
5. The service emits `SENIOR_REMINDER_CHANGED` to senior and linked caregivers.
6. `MedicationPage.jsx`, dashboard cards, and global reminders reload silently.
7. Due reminders are activated by `reminder.worker.js`.
8. Senior popup actions call reminder status endpoints, update occurrence status, and emit `MEDICATION_REMINDER_STATUS_UPDATED`.

Appointment flow:

1. `AppointmentPage.jsx` uses `appointmentApi.js`.
2. Requests hit `/api/health/appointments`.
3. `appointment.service.js` computes `appointmentAtUTC`, `reminderActiveAt`, `reminderExpiresAt`, and `nextReminderAt`.
4. Appointment documents are saved in MongoDB.
5. CRUD actions emit `SENIOR_REMINDER_CHANGED`.
6. `reminder.worker.js` activates due appointment reminders.
7. `GlobalSeniorReminderPopups.jsx` fetches eligible reminders and displays `AppointmentNotification`.
8. Dismiss actions update the appointment reminder fields and refresh realtime listeners.

Drug interaction flow:

1. `DrugInteractionChecker.jsx` uses the local drug dataset for selection.
2. The UI posts selected medicines to `/api/health/interactions/check`.
3. The backend maps medicine names and aliases to dataset entries.
4. `interaction.rules.js` compares category pairs and assigns severity.
5. The backend returns conflicts, recognized medicines, unknown medicines, and optional LLM explanation.
6. The UI renders the interaction result.

Digital Health Vault flow:

1. `/health/vault` renders `HealthVaultPage.jsx`, which renders `DocumentVault.jsx`.
2. The UI fetches `/api/user/documents` or `/api/user/documents/:targetUserId`.
3. `profile.service.js` validates own-vault or linked-caregiver read-only access.
4. Upload uses multipart field `document` on `POST /api/user/documents`.
5. `profile.routes.js` uses Cloudinary multer storage.
6. `profile.service.js` stores document metadata in `Document`, including the Cloudinary URL.
7. View opens the stored Cloudinary URL directly.
8. Delete removes the Cloudinary file and deletes the document record.

Telemetry flow:

1. `server/src/server.js` starts `startTelemetrySimulator()`.
2. `telemetry.simulator.js` emits generated vitals every few seconds.
3. `socket.manager.js` sends `SENIOR_TELEMETRY_UPDATED` to the senior and linked caregivers.
4. `useRealtimeVitals.js` listens and normalizes payloads with `vitals.contract.js`.
5. `IoTDashboard.jsx` and dashboard telemetry cards render updated vitals.

### Socket Events

- `SENIOR_TELEMETRY_UPDATED`: emitted by telemetry simulator via `socket.manager`; listened by `useRealtimeVitals.js` and dashboard panels; updates live vitals for seniors and linked caregivers.
- `SENIOR_REMINDER_CHANGED`: emitted by medication, appointment, and reminder flows; listened by medication page, appointment page, global reminder popups, and dashboard panels; triggers silent refresh of reminder-backed UI.
- `MEDICATION_REMINDER_STATUS_UPDATED`: emitted by medication service after taken/skipped/dismissed; listened by medication page; merges latest occurrence status.
- `newNotification`: emitted by notification service; listened by notification UI and reminder popup logic; used for call reminders and other cross-module alerts.
- `user:presence:active`: emitted by client app; backend records presence through shared communication socket.
- `user:presence:inactive`: emitted by client app; backend records inactive presence through shared communication socket.

### API Routes

Health base:

- `GET /api/health`: returns health module status.

Medications:

- `GET /api/health/medications`: returns medications for senior or linked caregiver.
- `GET /api/health/medications/reminders/eligible`: returns active medication reminders for the senior.
- `POST /api/health/medications`: creates a medication for a senior.
- `PUT /api/health/medications/:id`: updates a senior medication.
- `PATCH /api/health/medications/:id/reminder/dismiss`: dismisses one reminder occurrence.
- `PATCH /api/health/medications/:id/reminder/taken`: marks one reminder occurrence taken.
- `PATCH /api/health/medications/:id/reminder/skip`: marks one reminder occurrence skipped.
- `DELETE /api/health/medications/:id`: deletes a medication.

Appointments:

- `GET /api/health/appointments`: returns appointments for senior or linked caregiver.
- `GET /api/health/appointments/reminders/eligible`: returns active appointment reminders.
- `POST /api/health/appointments`: creates an appointment.
- `PUT /api/health/appointments/:id`: updates an appointment.
- `PATCH /api/health/appointments/:id/reminder/dismiss`: dismisses an appointment reminder.
- `DELETE /api/health/appointments/:id`: deletes an appointment.

Drug interactions:

- `GET /api/health/interactions`: returns interaction checker status and dataset metadata.
- `POST /api/health/interactions/check`: checks selected medicines and returns severity, conflicts, recognized medicines, unknown medicines, and explanations.

Telemetry:

- `GET /api/health/telemetry`: returns telemetry module status; live data is socket-based.

Health vault status:

- `GET /api/health/vault`: returns health vault module status; actual vault data uses `/api/user/documents`.

Digital Health Vault document APIs:

- `GET /api/user/documents`: returns current senior vault documents.
- `GET /api/user/documents/:targetUserId`: returns a linked senior vault for caregivers, read-only.
- `POST /api/user/documents`: uploads and creates a vault document.
- `DELETE /api/user/documents/:id`: deletes an owned vault document and Cloudinary file.

Call reminders:

- `GET /api/reminders`: returns senior call reminders.
- `POST /api/reminders`: creates a senior call reminder.
- `DELETE /api/reminders/:id`: deletes a senior call reminder.

### Database Models

- `Medication`: stores senior medication details, dosage, frequency, schedule type, reminder times, interval hours, weekly days, start/end dates, notes, and reminder occurrences.
- `Medication.reminderOccurrences`: stores occurrence key, scheduled time, status, activation time, dismissal time, taken time, skipped time, and expiration time.
- `Appointment`: stores senior appointment title, local date/time, timezone, UTC time, notes, reminder status, reminder version, active/expires timing, dismissal time, last shown time, and next reminder time.
- `Reminder`: stores call reminder user/senior IDs, target user name, title, reminder text, scheduled time, status, and timestamps.
- `Document`: stores vault document owner, title, type, Cloudinary file name/public ID, Cloudinary file URL, notes, and creation time.
- `Telemetry`: placeholder schema for telemetry records with user ID, metric type, recorded time, and created time.
- `Notification`: stores reminder and app notification target user, type, linked entity metadata, title, message, read state, and created time.
- `User`: health access uses role, linked senior/caregiver relationships, privacy settings, emergency contacts, and location.

### Dependencies

Frontend:

- `react`, `react-dom`, `react-router-dom`
- `axios`
- `socket.io-client`
- `react-markdown`
- `lucide-react`
- `framer-motion`

Backend:

- `express`
- `mongoose`
- `jsonwebtoken`
- `cors`
- `dotenv`
- `multer`
- `cloudinary`
- `multer-storage-cloudinary`
- `socket.io`
- `nodemailer`
- `express-session`

External services and shared utilities:

- MongoDB through Mongoose.
- Cloudinary for Digital Health Vault uploads.
- Socket.IO for telemetry and reminder sync.
- Optional OpenRouter via `OPENROUTER_API_KEY` for interaction explanations.
- `server/src/modules/communication/sockets/socket.manager.js` for shared realtime emits.
- `server/src/shared/jwt/authMiddleware.js` for protected APIs.
