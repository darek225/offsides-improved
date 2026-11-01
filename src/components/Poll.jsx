import { SidechatPoll } from 'sidechat.js/src/types/SidechatTypes.js';
import * as React from 'react';
import { View, ToastAndroid } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { AppContext } from '../App';

/**
 * @typedef {Object} PollComponentProps
 * @property {SidechatPoll} poll
 */

/**
 * @param {PollComponentProps}
 */
function Poll({ poll }) {
  const { appState } = React.useContext(AppContext);
  const API = appState.API;
  const { colors } = useTheme();
  const [localPoll, setLocalPoll] = React.useState(poll);
  const [revealed, setRevealed] = React.useState(false);

  const totalVotes = (localPoll?.choices || []).reduce(
    (sum, c) => sum + (c.count || 0),
    0,
  );
  const showResults = localPoll?.participated || revealed;

  const viewResults = React.useCallback(() => {
    API.viewPollResults(localPoll.id)
      .then(res => {
        if (res?.poll?.choices) {
          setLocalPoll(res.poll);
        }
        setRevealed(true);
      })
      .catch(() => setRevealed(true));
  }, [localPoll]);

  const setVote = React.useCallback((choiceIndex) => {
    if (localPoll.participated) {
      ToastAndroid.show('You cannot change your vote', ToastAndroid.SHORT);
      return;
    }
    API.voteOnPoll(localPoll.id, choiceIndex).then(() => {
      setLocalPoll({
        ...localPoll,
        participated: true,
        choices: localPoll.choices.map((choice, index) => ({
          ...choice,
          selected: index === choiceIndex,
          count: index === choiceIndex ? choice.count + 1 : choice.count,
        })),
      });
    });
  }, [localPoll]);

  if (!localPoll) return null;
  return (
    <View>
      {localPoll.choices.map((option, index) => (
        <TouchableRipple
          key={index}
          onPress={() => setVote(index)}
          borderless={true}
          style={{
            marginBottom: 8,
            borderRadius: 12,
          }}>
          <View
            style={{
              backgroundColor: option.selected
                ? '#2F80ED'
                : colors.surfaceVariant,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            {!!option?.text ? (
              <Text
                style={{ color: '#FFFFFF', flex: 1, fontWeight: '600' }}
                variant="labelLarge">
                {option.text}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {showResults && (
              <Text
                variant="bodyMedium"
                style={{
                  color: option.selected
                    ? '#D6E9FF'
                    : colors.onSurfaceVariant,
                }}>
                {option.count || 0} votes
                {totalVotes > 0
                  ? ` · ${Math.round(((option.count || 0) / totalVotes) * 100)}%`
                  : ''}
              </Text>
            )}
          </View>
        </TouchableRipple>
      ))}
      {showResults && (
        <Text
          variant="bodySmall"
          style={{ color: colors.onSurfaceVariant, marginTop: 2 }}>
          {totalVotes} votes
        </Text>
      )}
      {!showResults && (
        <TouchableRipple
          onPress={viewResults}
          borderless={true}
          style={{ borderRadius: 10, alignSelf: 'flex-start' }}>
          <Text
            variant="labelLarge"
            style={{ color: colors.primary, paddingVertical: 4 }}>
            View results
          </Text>
        </TouchableRipple>
      )}
    </View>
  );
}

export default Poll;
