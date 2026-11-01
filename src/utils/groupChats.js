// Group chat helpers. Group chats ride the same /v1/chats endpoints as DMs
// in sidechat.js (getDMs / getDMThread / sendDM), plus getGroupChats for
// explore and joinGroupChat to join. Response shapes are not documented,
// so every helper here is defensive about field names.

/** Unwrap a `{ chat: {...} }` envelope if the API used one. */
export const unwrapChat = o => (o && o.chat ? { ...o, ...o.chat } : o);

/** Best-effort detection of a group chat vs a 1:1 DM. */
export const isGroupChat = c => {
  if (!c) return false;
  const kind = String(c.type || c.chat_type || c.kind || '').toLowerCase();
  if (kind.includes('group')) return true;
  if (c.is_group || c.is_group_chat || c.group_chat) return true;
  if (Array.isArray(c.participants) && c.participants.length > 2) return true;
  if (Array.isArray(c.members) && c.members.length > 2) return true;
  // Named chats with no source post are group chats; DMs hang off a post.
  if ((c.name || c.title) && !c.post_id) return true;
  return false;
};

/** Display name for a group chat. */
export const groupChatName = c =>
  c?.name || c?.title || c?.display_name || c?.group?.name || 'Group chat';

/** Member count when the API provides one, else null. */
export const groupChatMemberCount = c =>
  c?.member_count ??
  c?.members_count ??
  c?.participant_count ??
  (Array.isArray(c?.participants)
    ? c.participants.length
    : Array.isArray(c?.members)
      ? c.members.length
      : null);

/** Who sent a chat message, when the API labels it (group chats). */
export const senderName = item =>
  item?.identity?.display_name ||
  item?.identity?.name ||
  item?.sender?.display_name ||
  item?.sender?.name ||
  item?.author?.display_name ||
  item?.author?.name ||
  null;

/** Normalize an explore/join list response into chat objects. */
export const normalizeChatList = json => {
  const list = Array.isArray(json)
    ? json
    : json?.chats || json?.group_chats || json?.results || [];
  return list.map(unwrapChat).filter(c => c && c.id);
};
