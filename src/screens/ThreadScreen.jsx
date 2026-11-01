import React, { useCallback } from 'react';
import { FlatList, InteractionManager, View } from 'react-native';
import {
  Appbar,
  Surface,
  Text,
  TextInput,
  Tooltip,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../App';
import timesago from 'timesago';
import DeviceInfo from 'react-native-device-info';
import { sha256 } from 'js-sha256';
import useInterval from '../hooks/useInterval';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { launchImageLibrary } from 'react-native-image-picker';
import AutoImage from '../components/AutoImage';
import { groupChatName, isGroupChat, senderName } from '../utils/groupChats';
import { useWindowDimensions } from 'react-native';

// The Sidechat/YikYak server dedupes DM sends by client_id: a second send
// carrying the same client_id returns HTTP 200 echoing the FIRST message and
// creates nothing new. The old code passed sha256(Android ID) - the same
// value for every message - so only the first DM in a thread ever landed
// (upstream issues #83/#105/#106). Generate a fresh client_id per send; it
// stays a 64-char sha256 hex string, so the wire format is unchanged.
const newClientID = async () => {
  const id = await DeviceInfo.getAndroidId();
  return sha256(`${id}-${Date.now()}-${Math.random()}-${Math.random()}`);
};

function ThreadScreen({ navigation, route }) {
  const { postID, chatID, title } = route.params;
  const {
    appState: { API },
  } = React.useContext(AppContext);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [meta, setMeta] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [isFetching, setIsFetching] = React.useState(false);
  const [manualRefreshing, setManualRefreshing] = React.useState(false);
  const [messageDraft, setMessageDraft] = React.useState('');
  const [sendError, setSendError] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const fetchingRef = React.useRef(false);
  const { width: screenWidth } = useWindowDimensions();
  const isGroup =
    !!route.params.isGroup || isGroupChat(meta) || !!title;

  React.useEffect(() => {
    if (isFocused) {
      InteractionManager.runAfterInteractions(() => {
        if (chatID) {
          fetchMessages(true);
        }
      });
    }
  }, [isFocused]);

  useInterval(() => {
    if (chatID && isFocused) {
      fetchMessages(false);
    }
  }, 5000);

  const fetchMessages = async (manual, idOverride) => {
    const id = idOverride || chatID;
    if (!id || fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;
    setIsFetching(true);
    if (manual) {
      setManualRefreshing(true);
    }
    try {
      const d = await API.getDMThread(id);
      // Inverted list renders newest first; sort explicitly instead of
      // relying on the old inverted + column-reverse double inversion,
      // which made older messages vanish in long threads (#83).
      const sorted = [...(d.messages || [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
      setMessages(sorted);
      setMeta(d);
    } catch (e) {
      // Poll failures are transient; keep the current messages on screen.
    } finally {
      setManualRefreshing(false);
      setIsFetching(false);
      fetchingRef.current = false;
    }
  };

  const sendMessage = async () => {
    const draft = messageDraft;
    if (!draft.trim()) {
      return;
    }
    try {
      await API.sendDM(chatID, draft, await newClientID());
      setMessageDraft('');
      setSendError(false);
      await fetchMessages(false);
    } catch (e) {
      // Keep the draft so a failed send is never silently lost.
      setSendError(true);
    }
  };

  const startThread = async () => {
    const draft = messageDraft;
    if (!draft.trim()) {
      return;
    }
    try {
      const newDM = await API.startDM(draft, await newClientID(), postID);
      setMessageDraft('');
      setSendError(false);
      navigation.setParams({ chatID: newDM.chat.id });
      await fetchMessages(false, newDM.chat.id);
    } catch (e) {
      setSendError(true);
    }
  };

  const leaveChat = async () => {
    return; // No leave endpoint has been reverse engineered yet.
  };

  // Pick a photo, upload it, and send it into this chat. DMs and group
  // chats accept assets on the same /v1/chats/send endpoint; the app
  // simply never wired the button up.
  const sendPhoto = async () => {
    if (!chatID || isUploading) {
      return;
    }
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.9,
      maxHeight: 1800,
      maxWidth: 1800,
    });
    if (result.didCancel || result.errorMessage || !result.assets?.[0]) {
      return;
    }
    setIsUploading(true);
    try {
      const photo = result.assets[0];
      const assetURL = await API.uploadAsset(
        photo.uri,
        photo.type,
        photo.fileName,
      );
      const asset = {
        url: assetURL,
        type: 'image',
        height: photo.height,
        width: photo.width,
        content_type: photo.type.split('/')[1],
        id: assetURL.split('/v1/assets/library/')[1],
      };
      await API.sendDM(chatID, messageDraft.trim(), await newClientID(), [
        asset,
      ]);
      setMessageDraft('');
      setSendError(false);
      await fetchMessages(false);
    } catch (e) {
      setSendError(true);
    } finally {
      setIsUploading(false);
    }
  };

  const goToSource = async () => {
    if (!meta) return;
    const p = await API.getPost(meta.post_id, false);
    if ((await p.type) == 'post') {
      navigation.push('Comments', {
        postID: meta.post_id,
        postObj: p,
      });
    } else if ((await p.type) == 'comment') {
      navigation.push('Comments', {
        postID: p.parent_post_id,
      });
    }
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content
          title={isGroup ? title || groupChatName(meta) : 'Thread'}
        />
        <Tooltip title="Show context">
          <Appbar.Action
            icon="note-text-outline"
            onPress={() => goToSource()}
          />
        </Tooltip>
      </Appbar.Header>
      <FlatList
        inverted={true}
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 10,
          gap: 10,
        }}
        data={messages}
        onRefresh={() => fetchMessages(true)}
        refreshing={manualRefreshing}
        renderScrollComponent={(props) => <KeyboardAwareScrollView {...props} />}
        renderItem={({ item }) => (
          <TouchableRipple
            borderless={true}
            onPress={() => { }}
            style={{
              borderRadius: 10,
              marginLeft: item.authored_by_user ? 50 : 0,
              marginRight: item.authored_by_user ? 0 : 50,
            }}>
            <Surface
              key={item.id}
              style={{
                padding: 15,
                borderRadius: 10,
                backgroundColor: item.authored_by_user
                  ? colors.secondaryContainer
                  : colors.elevation.level1,
              }}
              mode="flat">
              {isGroup && !item.authored_by_user && senderName(item) && (
                <Text
                  style={{ color: colors.primary, fontWeight: 'bold' }}
                  variant="labelLarge">
                  {senderName(item)}
                </Text>
              )}
              {item.assets
                ?.filter(a => a?.url && a.type == 'image')
                .map(asset => (
                  <AutoImage
                    key={asset.id || asset.url}
                    src={asset.url}
                    fitWidth={screenWidth - 110}
                    srcWidth={asset.width || 1}
                    srcHeight={asset.height || 1}
                    token={API.userToken}
                    style={{ marginTop: 5, marginBottom: item.text ? 8 : 5 }}
                  />
                ))}
              {!!item.text && (
                <Text style={{ color: colors.onSurface }} variant="bodyLarge">
                  {item.text}
                </Text>
              )}
              <Text
                style={{ color: colors.onSurfaceDisabled }}
                variant="labelMedium">
                {timesago(item.created_at)}
              </Text>
            </Surface>
          </TouchableRipple>
        )}
      />
      {sendError && (
        <Text
          style={{ color: colors.error, paddingHorizontal: 12, paddingVertical: 6 }}>
          Message failed to send. Your draft is still here - tap send to retry.
        </Text>
      )}
      <KeyboardStickyView>
        <TextInput
          value={messageDraft}
          onChangeText={setMessageDraft}
          onSubmitEditing={() => {
            if (chatID) {
              sendMessage();
            } else {
              startThread();
            }
          }}
          autoFocus={true}
          placeholder="Send a message"
          style={{ paddingBottom: insets.bottom }}
          left={
            chatID ? (
              <TextInput.Icon
                icon={isUploading ? 'loading' : 'image-outline'}
                disabled={isUploading}
                onPress={() => sendPhoto()}
              />
            ) : undefined
          }
          right={
            <TextInput.Icon
              icon="send"
              onPress={() => {
                if (chatID) {
                  sendMessage();
                } else {
                  startThread();
                }
              }}
            />
          }
        />
      </KeyboardStickyView>
    </View>
  );
}

export default ThreadScreen;
