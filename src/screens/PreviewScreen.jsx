import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Post from '../components/Post';

// Dev-only style preview for the v1.2.0 YikYak redesign check. Renders
// Post/Poll with sample data - no login or network needed. Only routed
// to when built with EXPO_PUBLIC_PREVIEW=1; release builds never open it.
const fakeAPI = { userToken: 'preview' };
const fakeNav = { push: () => {}, replace: () => {}, navigate: () => {} };

const baseGroup = {
  analytics_name: 'mc',
  color: '#0DD5B2',
  id: 'e953e1cc-7e17-46b9-b11a-98441e4135fe',
  name: 'MC',
};

function makePost(overrides) {
  return {
    id: Math.random().toString(36).slice(2),
    assets: [],
    attachments: [],
    authored_by_user: false,
    comment_count: 12,
    comments_disabled: false,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    destination: 'group',
    dms_disabled: false,
    group: baseGroup,
    group_id: baseGroup.id,
    identity: { name: 'Anonymous', posted_with_username: false },
    is_saved: false,
    pinned: false,
    tags: [],
    text: '',
    type: 'post',
    vote_status: 'none',
    vote_total: 0,
    ...overrides,
  };
}

export default function PreviewScreen() {
  const { colors } = useTheme();
  const posts = [
    makePost({
      text: 'Me after my day of doing nothing all day',
      vote_status: 'upvote',
      vote_total: 36,
      comment_count: 48,
    }),
    makePost({
      text: 'Best dining hall on campus? Settle it',
      vote_total: 512,
      comment_count: 96,
      poll: {
        id: 'preview-poll',
        participated: true,
        choices: [
          { text: 'The Pit', count: 301, selected: true },
          { text: 'SoVi', count: 148, selected: false },
          { text: 'Crown Commons', count: 63, selected: false },
        ],
      },
    }),
    makePost({
      text: 'Posting this anonymously to test that no username shows up anywhere on the card',
      authored_by_user: true,
      vote_total: 7,
      comment_count: 3,
    }),
    makePost({
      text: 'Unpopular opinion but the library third floor is actually the best nap spot and I will not be taking questions at this time',
      vote_status: 'downvote',
      vote_total: -4,
      identity: { name: 'curlyfries', posted_with_username: true },
      comment_count: 21,
    }),
  ];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Text variant="titleMedium" style={{ padding: 14, paddingTop: 44 }}>
        Style preview - sample data only
      </Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {posts.map(p => (
          <View key={p.id} style={{ marginHorizontal: 10, marginBottom: 10 }}>
            <Post
              post={p}
              nav={fakeNav}
              apiInstance={fakeAPI}
              themeColors={colors}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
