import { SidechatSimpleAsset } from 'sidechat.js/src/types/SidechatTypes.js';
import React, { useEffect } from 'react';
import { View, StatusBar, Image, ScrollView } from 'react-native';
import {
  Appbar,
  useTheme,
  ProgressBar,
  Snackbar,
  TextInput,
  Icon,
  Text,
  TouchableRipple,
  Tooltip,
  IconButton,
  ActivityIndicator,
  Button,
  Divider,
} from 'react-native-paper';
import { AppContext } from '../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv';
import Post from '../components/Post';

const BORDER_RADIUS = 10;

function WriterScreen({ navigation, route }) {
  const { mode, groupID, postID, replyID, parentID, repostID } = route.params;
  if (mode != 'comment' && mode != 'post') return false;
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [error, setError] = React.useState(false);
  const [errorText, setErrorText] = React.useState('');
  const [textContent, setTextContent] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [postSortMethod, setPostSortMethod] = useMMKVString('postSortMethod');
  const [anonMode, setAnonMode] = useMMKVBoolean('anonMode');
  // MMKV returns undefined until the toggle is first touched, and
  // sidechat.js treats undefined as anonymous=false - so first-time users
  // silently posted under their username. YikYak's default is anonymous:
  // make that explicit here and always pass a real boolean to the API.
  const anon = anonMode ?? true;
  const [asset, setAsset] = React.useState(
    /** @type {SidechatSimpleAsset} */(null),
  );
  const [repost, setRepost] = React.useState(
    /** @type {SidechatPostOrComment} */(null),
  );
  const [isPoll, setIsPoll] = React.useState(false);
  const [showLibrary, setShowLibrary] = React.useState(false);
  const [libraryItems, setLibraryItems] = React.useState(null);
  // "Your library" = images/memes already uploaded to the account's
  // asset library (API.getAssetLibrary, never wired up upstream) -
  // the Recents row in the real app's meme picker.
  const toggleLibrary = async () => {
    const next = !showLibrary;
    setShowLibrary(next);
    if (next && libraryItems === null) {
      try {
        const items = await API.getAssetLibrary();
        const normalized = (items || [])
          .map(it => {
            const url = typeof it?.url === 'string' ? it.url : it?.url?.url;
            if (!url) return null;
            return {
              url,
              type: 'image',
              height: it.height || 0,
              width: it.width || 0,
              content_type: it.content_type || 'jpeg',
              id: it.id || url.split('/v1/assets/library/')[1] || url,
            };
          })
          .filter(Boolean);
        setLibraryItems(normalized);
      } catch (e) {
        setLibraryItems([]);
      }
    }
  };
  const [pollOptions, setPollOptions] = React.useState(['', '']);

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 1) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index, text) => {
    const newOptions = [...pollOptions];
    newOptions[index] = text;
    setPollOptions(newOptions);
  };

  React.useEffect(() => {
    if (repostID) {
      API.getPost(repostID).then((p) => {
        if (p) {
          setRepost(p);
        }
      });
    }
  }, [repostID])

  const isPollValid = !isPoll || pollOptions.every(opt => opt.trim().length > 0);

  const createPostOrComment = async () => {
    // The API returns an error object (or throws) on failure; the old code
    // treated a missing result as success and navigated away, so failed
    // posts/comments vanished with no feedback (#91). Only leave this
    // screen when the server actually created the content.
    try {
      if (mode == 'post') {
        const validPollOptions = isPoll ? pollOptions : undefined;

        const p = await API.createPost(
          textContent,
          groupID,
          asset ? [asset] : [],
          null,
          null,
          anon,
          repostID,
          validPollOptions,
        );
        if (p && p.id) {
          setPostSortMethod('recent');
          navigation.replace('Home');
          return;
        }
        if (p?.message) {
          setErrorText(String(p.message));
        }
      } else if (mode == 'comment') {
        const c = await API.createComment(
          postID,
          textContent,
          groupID,
          replyID,
          parentID || null,
          asset ? [asset] : [],
          null,
          anon);
        if (c && c.id) {
          navigation.pop();
          return;
        }
        if (c?.message) {
          setErrorText(String(c.message));
        }
      }
      setError(true);
    } catch (e) {
      setErrorText(e?.message || '');
      setError(true);
    }
  };

  const uploadImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1,
      maxHeight: 1800,
      maxWidth: 1800,
    });
    if (result.didCancel || result.errorMessage) return;
    setIsUploading(true);
    const photo = result.assets[0];
    photo.height;
    const assetURL = await API.uploadAsset(
      photo.uri,
      photo.type,
      photo.fileName,
    );
    setIsUploading(false);
    setAsset({
      url: assetURL,
      type: photo.type.split('/')[0],
      height: photo.height,
      width: photo.width,
      content_type: photo.type.split('/')[1],
      id: assetURL.split('/v1/assets/library/')[1],
    });
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={`New ${mode}`} />
        <Tooltip title="Anonymous mode">
          <Appbar.Action
            icon={anon ? 'incognito' : 'incognito-off'}
            onPress={() =>
              setAnonMode(!anon)
            }
          />
        </Tooltip>
        <Appbar.Action
          icon="send"
          onPress={createPostOrComment}
          disabled={textContent.length < 1 || textContent.length > 255 || !isPollValid}
        />
      </Appbar.Header>
      <ProgressBar
        indeterminate={true}
        visible={false}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <View style={{ flexDirection: 'column', flex: 1 }}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={{
              flex: 1,
              borderRadius: BORDER_RADIUS,
              borderBottomWidth: 0,
              backgroundColor: colors.elevation.level3,
              fontSize: 20,
              marginHorizontal: 10,
              marginVertical: 15,
              flexDirection: 'column',
            }}
            contentStyle={{
              height: '100%',
              paddingTop: 10,
              paddingBottom: 10,
            }}
            outlineStyle={{ borderRadius: BORDER_RADIUS }}
            mode="outlined"
            multiline={true}
            placeholder={`Write your ${mode} here...`}
            value={textContent}
            onChangeText={val => setTextContent(val)}
          />
          <ProgressBar style={{ marginHorizontal: 11, marginBottom: 5, borderRadius: 10 }} animatedValue={textContent.length / 255} color={textContent.length > 255 ? colors.error : undefined} />
          <Text style={{ marginHorizontal: 10, marginBottom: 10, color: textContent.length <= 255 ? colors.onSurface : colors.error }} variant="labelLarge">
            {textContent.length} / 255 chars
          </Text>
          {mode === 'post' && isPoll && (
            <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
              <Divider style={{ marginBottom: 10 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Icon source="poll" size={20} color={colors.primary} />
                <Text variant="titleMedium" style={{ marginLeft: 8, color: colors.primary }}>Poll Options</Text>
              </View>
              {pollOptions.map((option, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: colors.elevation.level3,
                      borderRadius: BORDER_RADIUS,
                    }}
                    mode="outlined"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChangeText={(text) => updatePollOption(index, text)}
                    maxLength={80}
                  />
                  {pollOptions.length > 2 && (
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => removePollOption(index)}
                    />
                  )}
                </View>
              ))}
              {pollOptions.length < 4 && (
                <Button
                  mode="outlined"
                  onPress={addPollOption}
                  icon="plus"
                  style={{ marginTop: 5 }}
                >
                  Add Option
                </Button>
              )}
            </View>
          )}
          {repost && <View style={{ padding: 10, paddingTop: 0, marginTop: -5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: "flex-start", marginBottom: -5 }}>
              <IconButton icon="repeat-variant" size={24} iconColor={colors.primary} style={{ marginLeft: -5, marginRight: -3 }} />
              <Text variant="labelLarge" style={{ color: colors.primary }}>Reposting</Text>
            </View>
            <Post themeColors={colors} apiInstance={API} post={repost} repost={true} minimal={true} />
          </View>}
        </View>
        {!asset && (
          <View
            style={{
              backgroundColor: colors.elevation.level5,
              paddingHorizontal: 15,
              paddingTop: 6,
            }}>
            <TouchableRipple
              onPress={toggleLibrary}
              borderless={true}
              style={{ borderRadius: BORDER_RADIUS, alignSelf: 'flex-start' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 4,
                }}>
                <Icon source="image-multiple" size={20} color={colors.primary} />
                <Text
                  variant="labelLarge"
                  style={{ color: colors.primary, marginLeft: 6 }}>
                  Your library
                </Text>
                <Icon
                  source={showLibrary ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.primary}
                />
              </View>
            </TouchableRipple>
            {showLibrary &&
              (libraryItems === null ? (
                <ActivityIndicator animating={true} style={{ marginVertical: 12 }} />
              ) : libraryItems.length === 0 ? (
                <Text
                  variant="bodySmall"
                  style={{ color: colors.onSurfaceVariant, paddingVertical: 8 }}>
                  Nothing here yet. Images you upload will show up for reuse.
                </Text>
              ) : (
                <ScrollView
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  style={{ paddingVertical: 8 }}>
                  {libraryItems.map(item => (
                    <TouchableRipple
                      key={item.id}
                      borderless={true}
                      style={{ borderRadius: BORDER_RADIUS, marginRight: 10 }}
                      onPress={() => {
                        setAsset(item);
                        setShowLibrary(false);
                      }}>
                      <Image
                        source={{
                          uri: item.url,
                          headers: {
                            Authorization: `Bearer ${API.userToken}`,
                          },
                        }}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: BORDER_RADIUS,
                        }}
                        resizeMode="cover"
                      />
                    </TouchableRipple>
                  ))}
                </ScrollView>
              ))}
          </View>
        )}
        <View
          style={{
            backgroundColor: colors.elevation.level5,
            flex: 0.15,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
            paddingBottom: insets.bottom,
          }}>
          {asset ? (
            <View style={{ position: 'relative' }}>
              <IconButton
                icon="delete"
                onPress={() => setAsset(null)}
                containerColor={colors.outline}
                iconColor={colors.inverseOnSurface}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  zIndex: 2,
                }}
              />
              <Image
                height="80%"
                resizeMode="cover"
                style={{
                  borderStyle: 'solid',
                  aspectRatio: '1 / 1',
                  borderWidth: 2,
                  borderRadius: BORDER_RADIUS,
                  borderColor: colors.outline,
                  height: '80%',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                source={{
                  uri: asset.url,
                  headers: {
                    Authorization: `Bearer ${API.userToken}`,
                  },
                }}
              />
            </View>
          ) : (
            <TouchableRipple
              onPress={uploadImage}
              style={{ borderRadius: BORDER_RADIUS }}
              borderless={true}>
              <View
                style={{
                  borderStyle: 'dashed',
                  aspectRatio: '1 / 1',
                  borderWidth: 2,
                  borderRadius: BORDER_RADIUS,
                  borderColor: colors.outline,
                  height: '80%',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {isUploading ? (
                  <ActivityIndicator animating={true} />
                ) : (
                  <>
                    <Icon
                      source="image-plus"
                      size={32}
                      color={colors.primary}
                    />
                    <Text
                      style={{ marginTop: 10, color: colors.onSurface }}
                      variant="labelMedium">
                      Add image
                    </Text>
                  </>
                )}
              </View>
            </TouchableRipple>
          )}
          {mode === 'post' && (
            <TouchableRipple
              onPress={() => {
                setIsPoll(!isPoll);
                if (!isPoll) {
                  setPollOptions(['', '']);
                }
              }}
              style={{ borderRadius: BORDER_RADIUS, marginLeft: 15 }}
              borderless={true}>
              <View
                style={{
                  borderStyle: isPoll ? 'solid' : 'dashed',
                  aspectRatio: '1 / 1',
                  borderWidth: 2,
                  borderRadius: BORDER_RADIUS,
                  borderColor: isPoll ? colors.primary : colors.outline,
                  backgroundColor: isPoll ? colors.primaryContainer : 'transparent',
                  height: '80%',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon
                  source="poll"
                  size={32}
                  color={isPoll ? colors.onPrimaryContainer : colors.primary}
                />
                <Text
                  style={{ marginTop: 10, color: isPoll ? colors.onPrimaryContainer : colors.onSurface }}
                  variant="labelMedium">
                  {'Create Poll'}
                </Text>
              </View>
            </TouchableRipple>
          )}
        </View>
      </View>
      <Snackbar
        visible={error}
        duration={6000}
        onDismiss={() => setError(false)}>
        {errorText
          ? `Server said: ${errorText}`
          : `Sorry, there was an error creating this ${mode}. Your text is still here.`}
      </Snackbar>
    </View>
  );
}

export default WriterScreen;
