import React from 'react';
import { FlatList, InteractionManager, ToastAndroid, View } from 'react-native';
import {
  Appbar,
  Button,
  Dialog,
  Icon,
  Portal,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { AppContext } from '../App';
import timesago from 'timesago';
import useInterval from '../hooks/useInterval';
import {
  groupChatMemberCount,
  groupChatName,
  isGroupChat,
  normalizeChatList,
} from '../utils/groupChats';

const lastMessageText = item =>
  item?.messages?.length > 0
    ? item.messages[item.messages.length - 1]?.text || 'Photo'
    : 'No messages in this chat';

function MessageScreen({ navigation }) {
  const {
    appState: { API },
  } = React.useContext(AppContext);
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [tab, setTab] = React.useState('dms');
  const [chats, setChats] = React.useState([]);
  const [explore, setExplore] = React.useState([]);
  const [exploreError, setExploreError] = React.useState(false);
  const [manualRefreshing, setManualRefreshing] = React.useState(false);
  const [joinTarget, setJoinTarget] = React.useState(null);
  const [joinName, setJoinName] = React.useState('');
  const [joining, setJoining] = React.useState(false);
  const [myIdentity, setMyIdentity] = React.useState(null);

  React.useEffect(() => {
    // Default join identity: the user's own username + conversation icon.
    API.getUpdates()
      .then(u => {
        if (u?.user) {
          setMyIdentity({
            username: u.user.username || null,
            conversation_icon: u.user.conversation_icon || null,
          });
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (isFocused) {
      InteractionManager.runAfterInteractions(() => {
        refresh(true);
      });
    }
  }, [isFocused]);

  useInterval(() => {
    if (isFocused) {
      fetchChats();
    }
  }, 15000);

  const fetchChats = async () => {
    try {
      const d = await API.getDMs();
      setChats(Array.isArray(d) ? d.filter(Boolean) : []);
    } catch (e) {
      // Keep the existing list; a failed poll must not clear the screen.
    }
  };

  const fetchExplore = async () => {
    try {
      const raw = await API.getGroupChats();
      setExplore(normalizeChatList(raw));
      setExploreError(false);
    } catch (e) {
      setExploreError(true);
    }
  };

  const refresh = async manual => {
    if (manual) {
      setManualRefreshing(true);
    }
    await Promise.all([fetchChats(), fetchExplore()]);
    setManualRefreshing(false);
  };

  const dms = chats.filter(c => !isGroupChat(c));
  const joinedGroups = chats.filter(c => isGroupChat(c));
  const joinedIDs = new Set(joinedGroups.map(c => c.id));
  const joinable = explore.filter(c => !joinedIDs.has(c.id));

  const openChat = (item, isGroup) =>
    navigation.push('Thread', {
      mode: 'existing',
      chatID: item.id,
      isGroup,
      title: isGroup ? groupChatName(item) : undefined,
    });

  const askToJoin = item => {
    setJoinName(myIdentity?.username || '');
    setJoinTarget(item);
  };

  const join = async anonymous => {
    const item = joinTarget;
    if (!item || joining) return;
    setJoining(true);
    try {
      const icon = myIdentity?.conversation_icon || {};
      await API.joinGroupChat(
        item.id,
        anonymous ? 'Anonymous' : joinName.trim() || 'Anonymous',
        icon.emoji || '💬',
        icon.color || '#6750A4',
        icon.secondary_color || '#EADDFF',
      );
      setJoinTarget(null);
      await fetchChats();
      openChat(item, true);
    } catch (e) {
      ToastAndroid.show("Couldn't join that group chat", ToastAndroid.SHORT);
    } finally {
      setJoining(false);
    }
  };

  const ChatCard = ({ item, isGroup }) => (
    <TouchableRipple
      borderless={true}
      onPress={() => openChat(item, isGroup)}
      style={{ borderRadius: 12 }}>
      <Surface
        style={{
          padding: 15,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 15,
        }}
        mode="elevated">
        <Icon
          source={isGroup ? 'account-group-outline' : 'message-reply-text-outline'}
          size={32}
          color={colors.primary}
        />
        <View style={{ flex: 1 }}>
          {isGroup && (
            <Text
              style={{ color: colors.onSurface, fontWeight: 'bold' }}
              variant="bodyLarge"
              numberOfLines={1}>
              {groupChatName(item)}
            </Text>
          )}
          <Text
            style={{
              color: isGroup ? colors.onSurfaceVariant : colors.onSurface,
            }}
            variant={isGroup ? 'bodyMedium' : 'bodyLarge'}
            numberOfLines={2}>
            {lastMessageText(item)}
          </Text>
          <Text style={{ color: colors.onSurfaceVariant }} variant="labelMedium">
            {[
              item.updated_at ? timesago(item.updated_at) : null,
              isGroup && groupChatMemberCount(item) != null
                ? `${groupChatMemberCount(item)} members`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Icon source="chevron-right" size={20} color={colors.onSurfaceVariant} />
      </Surface>
    </TouchableRipple>
  );

  const ExploreCard = ({ item }) => {
    const count = groupChatMemberCount(item);
    return (
      <Surface
        style={{
          padding: 15,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 15,
        }}
        mode="flat">
        <Icon source="account-group" size={32} color={colors.secondary} />
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.onSurface, fontWeight: 'bold' }}
            variant="bodyLarge"
            numberOfLines={1}>
            {groupChatName(item)}
          </Text>
          {!!(item.description || count != null) && (
            <Text
              style={{ color: colors.onSurfaceVariant }}
              variant="labelMedium"
              numberOfLines={2}>
              {[item.description, count != null ? `${count} members` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </View>
        <Button mode="contained-tonal" onPress={() => askToJoin(item)}>
          Join
        </Button>
      </Surface>
    );
  };

  const SectionLabel = ({ children }) => (
    <Text
      variant="titleSmall"
      style={{ color: colors.primary, marginTop: 10, marginLeft: 5 }}>
      {children}
    </Text>
  );

  const EmptyState = ({ icon, text }) => (
    <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
      <Icon source={icon} size={72} color={colors.secondaryContainer} />
      <Text style={{ color: colors.onSurfaceVariant }} variant="bodyMedium">
        {text}
      </Text>
    </View>
  );

  const groupData = [
    { kind: 'label', key: 'joined-label', text: 'Your group chats' },
    ...(joinedGroups.length
      ? joinedGroups.map(c => ({ kind: 'joined', key: 'j' + c.id, item: c }))
      : [
          {
            kind: 'empty',
            key: 'joined-empty',
            text: "You haven't joined any group chats yet.",
          },
        ]),
    { kind: 'label', key: 'explore-label', text: 'Join a group chat' },
    ...(exploreError
      ? [
          {
            kind: 'empty',
            key: 'explore-error',
            text: "Couldn't load group chats to join. Pull to retry.",
          },
        ]
      : joinable.length
        ? joinable.map(c => ({ kind: 'explore', key: 'e' + c.id, item: c }))
        : [
            {
              kind: 'empty',
              key: 'explore-empty',
              text: 'No group chats available to join right now.',
            },
          ]),
  ];

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Messages" />
      </Appbar.Header>
      <SegmentedButtons
        style={{ margin: 10, marginBottom: 0 }}
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'dms', label: 'DMs', icon: 'message-text-outline' },
          { value: 'groups', label: 'Group chats', icon: 'account-group-outline' },
        ]}
      />
      {tab === 'dms' ? (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 10, gap: 10 }}
          data={dms}
          keyExtractor={item => item.id}
          onRefresh={() => refresh(true)}
          refreshing={manualRefreshing}
          renderItem={({ item }) => <ChatCard item={item} isGroup={false} />}
          ListEmptyComponent={
            <EmptyState
              icon="message-processing-outline"
              text="No DMs yet. Open a post and tap the speech bubble to start one."
            />
          }
        />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 10, gap: 10 }}
          data={groupData}
          keyExtractor={row => row.key}
          onRefresh={() => refresh(true)}
          refreshing={manualRefreshing}
          renderItem={({ item: row }) => {
            if (row.kind === 'label') return <SectionLabel>{row.text}</SectionLabel>;
            if (row.kind === 'empty')
              return (
                <Text
                  style={{ color: colors.onSurfaceVariant, marginLeft: 5 }}
                  variant="bodyMedium">
                  {row.text}
                </Text>
              );
            if (row.kind === 'joined')
              return <ChatCard item={row.item} isGroup={true} />;
            return <ExploreCard item={row.item} />;
          }}
        />
      )}
      <Portal>
        <Dialog visible={!!joinTarget} onDismiss={() => setJoinTarget(null)}>
          <Dialog.Title>
            Join {joinTarget ? groupChatName(joinTarget) : ''}
          </Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <Text variant="bodyMedium">
              Choose the name people in this chat will see.
            </Text>
            <TextInput
              mode="outlined"
              label="Your name in this chat"
              value={joinName}
              onChangeText={setJoinName}
              maxLength={30}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setJoinTarget(null)}>Cancel</Button>
            <Button loading={joining} onPress={() => join(true)}>
              Join anonymously
            </Button>
            <Button
              mode="contained"
              loading={joining}
              disabled={!joinName.trim()}
              onPress={() => join(false)}>
              Join
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

export default MessageScreen;
