import React from 'react';
import { View, StatusBar, ScrollView, Linking, Image, Alert, ToastAndroid } from 'react-native';
import {
  Appbar,
  Button,
  useTheme,
  Text,
  Divider,
  Avatar,
  Card,
} from 'react-native-paper';
import RNRestart from 'react-native-restart';
import { version } from '../../package.json';
import { storage } from '../utils/mmkv';
import { AppContext } from '../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import offsidesLogo from '../assets/Offsides.png';
import { needsUpdate } from '../utils';
import { useMMKVObject } from 'react-native-mmkv';

function SettingsScreen({ navigation }) {
  const { appState } = React.useContext(AppContext);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [currentGroup, setCurrentGroup] = useMMKVObject('currentGroup');
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  React.useEffect(() => {
    checkForUpdate();
  }, []);
  const checkForUpdate = async () => {
    const needs = await needsUpdate(version);
    setUpdateAvailable(needs);
  };
  const signOut = () => {
    storage.clearAll();
    RNRestart.restart();
  };
  const API = appState.API;
  const unhideAll = () => {
    Alert.alert(
      'Unhide all users?',
      'Posts from users you hid with "Hide posts from this user" will show again.',
      [
        { text: 'Cancel' },
        {
          text: 'Unhide all',
          onPress: async () => {
            try {
              await API.unhidePostsFromAllUsers();
              ToastAndroid.show('All users unhidden', ToastAndroid.SHORT);
            } catch (e) {
              ToastAndroid.show("Couldn't unhide users", ToastAndroid.SHORT);
            }
          },
        },
      ],
    );
  };
  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBar animated={true} backgroundColor={colors.elevation.level2} />
      <Appbar.Header elevated={true}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>
      <ScrollView
        style={{ padding: 20 }}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: insets.bottom }}>
        <Avatar.Image
          source={offsidesLogo}
          size={80}
          style={{ marginBottom: 15 }}></Avatar.Image>
        <Text variant="bodyLarge" style={{ textAlign: 'center' }}>
          <Text variant="headlineSmall" style={{ color: colors.primary, fontWeight: "bold" }}>
            Offsides+{' '}
          </Text>
          <Text variant="headlineSmall">version {version}</Text>
        </Text>
        <Text
          style={{ textAlign: 'center', marginBottom: 10, marginTop: -2 }}
          variant="labelLarge">
          a third-party client for Sidechat/YikYak
        </Text>
        <Text
          style={{ textAlign: 'center', marginBottom: 4 }}
          variant="labelLarge">
          Improved fork maintained by{' '}
          <Text style={{ color: colors.primary }}>Darek Anderson</Text>
        </Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            columnGap: 10,
          }}>
          <Button
            mode="contained"
            onPress={signOut}
            style={{
              maxWidth: '50%',
              marginTop: 10,
              marginBottom: 20,
            }}>
            Sign Out
          </Button>
          <Button
            mode="contained-tonal"
            onPress={() => Linking.openURL('https://github.com/darek225/offsides-improved')}
            style={{
              maxWidth: '50%',
              marginTop: 10,
              marginBottom: 20,
            }}>
            GitHub
          </Button>
        </View>
        {updateAvailable && (
          <Card style={{ width: '90%', marginBottom: 15 }} mode="contained">
            <Card.Title
              title="Update Available"
              titleVariant="titleMedium"
              titleStyle={{ color: colors.primary, minHeight: 20 }}
              subtitle={`Version ${updateAvailable.latestVersion}`}
              subtitleStyle={{ color: colors.secondary, marginTop: 0 }}
            />
            <Card.Content>
              {updateAvailable.changelog ? (
                <Text>{updateAvailable.changelog}</Text>
              ) : (
                <Text>
                  This update brings new features and bugfixes. You should
                  update as soon as possible for the most complete and stable
                  experience!
                </Text>
              )}
            </Card.Content>
            <Card.Actions>
              <Button
                mode="elevated"
                onPress={() => {
                  Linking.openURL(
                    `https://github.com/darek225/offsides-improved/releases/tag/v${updateAvailable.latestVersion}`,
                  );
                }}>
                Get Update
              </Button>
            </Card.Actions>
          </Card>
        )}
        <Card style={{ width: '90%', marginBottom: 15 }}>
          <Card.Title title="About & Credits"
            titleVariant="titleMedium"
            titleStyle={{ color: colors.primary, minHeight: 20 }} />
          <Card.Content>
            <Text>
              Offsides+ is an improved fork of Offsides, maintained by Darek
              Anderson. It fixes DMs, adds group chats and poll results, and
              reskins the app to match YikYak. The original Offsides was
              created by Micah Lindley - if the app helps you, consider
              supporting him too.
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => Linking.openURL('https://github.com/darek225/offsides-improved')}>
              Offsides+ GitHub
            </Button>
            <Button onPress={() => Linking.openURL("https://buymeacoffee.com/micahlt")}>
              Support Micah
            </Button>
          </Card.Actions>
        </Card>
        <Button
          mode="outlined"
          icon="eye-outline"
          onPress={unhideAll}
          style={{ marginBottom: 15 }}>
          Unhide all users
        </Button>
        <Divider />
        <Text
          style={{
            textAlign: 'center',
            marginTop: 20,
            color: colors.onSurfaceDisabled,
            userSelect: 'text',
          }}>
          User ID: {appState.userID}
        </Text>
        {!!currentGroup && <Text
          style={{
            textAlign: 'center',
            marginBottom: 10,
            color: colors.onSurfaceDisabled,
            userSelect: 'text',
          }}>
          Group ID: {currentGroup.id}
        </Text>}
        <Text
          style={{
            textAlign: 'center',
            maxWidth: '85%',
            color: colors.onSurfaceDisabled,
          }}
          variant="bodySmall">
          Offsides+ is an unofficial third-party client and is not
          affiliated with Sidechat, YikYak, or Flower Ave. Based on
          Offsides by Micah Lindley.
        </Text>
      </ScrollView>
    </View>
  );
}

export default SettingsScreen;
