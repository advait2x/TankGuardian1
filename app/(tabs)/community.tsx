import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Plus,
  Send,
  Image as ImageIcon,
  X,
  Search,
  UserCircle2
} from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/components/ui/Toast';
import { samplePosts, sampleUsers } from '@/data/mockData';
import * as Haptics from 'expo-haptics';

export default function CommunityScreen() {
  const router = useRouter();
  const { currentUser, posts, likePost, createPost, users } = useApp();
  const { showToast } = useToast();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Combine mock posts with user posts, ensuring unique IDs
  const allPosts = [...posts, ...samplePosts]
    .filter((post, index, self) => 
      // Remove duplicates based on ID
      index === self.findIndex(p => p.id === post.id)
    )
    .sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Filter posts and users based on search
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return allPosts;
    
    const query = searchQuery.toLowerCase();
    return allPosts.filter(post => {
      const author = getAuthor(post.authorId);
      return (
        post.text.toLowerCase().includes(query) ||
        author.displayName.toLowerCase().includes(query) ||
        author.handle.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, allPosts]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return sampleUsers.filter(user => 
      user.displayName.toLowerCase().includes(query) ||
      user.handle.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleLike = async (postId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (likedPosts.has(postId)) {
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    } else {
      setLikedPosts(prev => new Set([...prev, postId]));
      likePost(postId);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostText.trim()) return;
    
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createPost(newPostText);
    setNewPostText('');
    setShowCreateModal(false);
    showToast('Post created!', 'success');
  };

  const handleUserPress = async (userId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/profile/${userId}` as any);
  };

  const getAuthor = (authorId: string) => {
    // Check mock users first
    const mockUser = sampleUsers.find(u => u.id === authorId);
    if (mockUser) return mockUser;
    
    // Check if it's the current user
    if (currentUser && currentUser.id === authorId) return currentUser;
    
    // Return a placeholder
    return { displayName: 'Unknown', handle: 'unknown', avatarUrl: '', role: 'user' as const };
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground variant="light" />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(220)} style={styles.header}>
          <Text style={styles.title}>Community</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View entering={FadeInDown.delay(80).duration(220)} style={styles.searchContainer}>
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Search size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search posts, users..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D7377" />
          }
        >
          {/* Show filtered users when searching */}
          {searchQuery.trim() && filteredUsers.length > 0 && (
            <Animated.View entering={FadeInDown.delay(80).duration(220)}>
              <Text style={styles.sectionTitle}>People</Text>
              {filteredUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => handleUserPress(user.id)}
                  activeOpacity={0.7}
                >
                  <GlassCard style={styles.userResultCard}>
                    <View style={styles.userResultAvatar}>
                      <Text style={styles.userResultAvatarText}>
                        {user.displayName.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.userResultInfo}>
                      <View style={styles.userResultNameRow}>
                        <Text style={styles.userResultName}>{user.displayName}</Text>
                        {user.role === 'creator' && (
                          <Badge label="Creator" variant="info" size="small" />
                        )}
                      </View>
                      <Text style={styles.userResultHandle}>@{user.handle}</Text>
                    </View>
                    <UserCircle2 size={20} color="#64748B" />
                  </GlassCard>
                </TouchableOpacity>
              ))}
              <View style={styles.sectionDivider} />
            </Animated.View>
          )}

          {/* Featured Creators */}
          {!searchQuery.trim() && (
            <Animated.View entering={FadeInDown.delay(80).duration(220)}>
            <Text style={styles.sectionTitle}>Featured Creators</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.creatorsRow}
            >
              {sampleUsers.filter(u => u.role === 'creator').map((creator, index) => (
                  <TouchableOpacity 
                    key={creator.id} 
                    style={styles.creatorCard}
                    onPress={() => handleUserPress(creator.id)}
                    activeOpacity={0.7}
                  >
                  <View style={styles.creatorAvatar}>
                    <Text style={styles.creatorAvatarText}>
                      {creator.displayName.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.creatorName} numberOfLines={1}>
                    {creator.displayName}
                  </Text>
                  <Text style={styles.creatorHandle}>@{creator.handle}</Text>
                  {creator.role === 'creator' && (
                    <Badge label="Creator" variant="info" size="small" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
          )}

          {/* Feed */}
          <Animated.View entering={FadeInDown.delay(140).duration(220)}>
            <Text style={styles.sectionTitle}>
              {searchQuery.trim() ? 'Posts' : 'Latest Posts'}
            </Text>
            
            {filteredPosts.length === 0 && searchQuery.trim() && (
              <GlassCard style={styles.emptyState}>
                <Search size={48} color="#94A3B8" />
                <Text style={styles.emptyStateText}>No posts found</Text>
                <Text style={styles.emptyStateSubtext}>Try searching for something else</Text>
              </GlassCard>
            )}
            
            {filteredPosts.map((post, index) => {
              const author = getAuthor(post.authorId);
              const isLiked = likedPosts.has(post.id);
              
              return (
                <GlassCard 
                  key={post.id} 
                  style={styles.postCard}
                  delay={250 + index * 50}
                >
                  {/* Post Header */}
                  <TouchableOpacity
                    onPress={() => handleUserPress(post.authorId)}
                    activeOpacity={0.7}
                  >
                  <View style={styles.postHeader}>
                    <View style={styles.postAvatar}>
                      <Text style={styles.postAvatarText}>
                        {author.displayName.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.postAuthorInfo}>
                      <View style={styles.postAuthorRow}>
                        <Text style={styles.postAuthorName}>{author.displayName}</Text>
                        {author.role === 'creator' && (
                          <Badge label="Creator" variant="info" size="small" />
                        )}
                      </View>
                      <Text style={styles.postTime}>{formatTimeAgo(post.createdAt)}</Text>
                    </View>
                  </View>
                  </TouchableOpacity>

                  {/* Post Content */}
                  <Text style={styles.postText}>{post.text}</Text>

                  {/* Post Media */}
                  {post.mediaUrl && (
                    <View style={styles.postMedia}>
                      <View style={styles.postMediaPlaceholder}>
                        <ImageIcon size={32} color="#94A3B8" />
                        <Text style={styles.postMediaText}>Tank photo</Text>
                      </View>
                    </View>
                  )}

                  {/* Post Actions */}
                  <View style={styles.postActions}>
                    <TouchableOpacity 
                      style={styles.postAction}
                      onPress={() => handleLike(post.id)}
                    >
                      <Heart 
                        size={20} 
                        color={isLiked ? '#E57373' : '#64748B'} 
                        fill={isLiked ? '#E57373' : 'transparent'}
                      />
                      <Text style={[styles.postActionText, isLiked && styles.postActionTextLiked]}>
                        {post.likesCount + (isLiked ? 1 : 0)}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.postAction}>
                      <MessageCircle size={20} color="#64748B" />
                      <Text style={styles.postActionText}>{post.commentsCount}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.postAction}>
                      <Share2 size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              );
            })}
          </Animated.View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Post"
        size="medium"
      >
        <View style={styles.createPostContent}>
          <View style={styles.createPostHeader}>
            <View style={styles.createPostAvatar}>
              <Text style={styles.createPostAvatarText}>
                {currentUser?.displayName.charAt(0) || '?'}
              </Text>
            </View>
            <Text style={styles.createPostName}>{currentUser?.displayName || 'You'}</Text>
          </View>

          <TextInput
            style={styles.createPostInput}
            placeholder="Share something with the community..."
            placeholderTextColor="#94A3B8"
            value={newPostText}
            onChangeText={setNewPostText}
            multiline
            numberOfLines={4}
          />

          <View style={styles.createPostActions}>
            <TouchableOpacity style={styles.createPostAttach}>
              <ImageIcon size={22} color="#0D7377" />
              <Text style={styles.createPostAttachText}>Add Photo</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Post"
            onPress={handleCreatePost}
            variant="primary"
            fullWidth
            disabled={!newPostText.trim()}
            icon={<Send size={18} color="#fff" />}
            iconPosition="right"
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A252F',
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchBarFocused: {
    borderColor: '#0D7377',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginVertical: 20,
  },
  userResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
  },
  userResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userResultAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  userResultInfo: {
    flex: 1,
  },
  userResultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  userResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A252F',
  },
  userResultHandle: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  creatorsRow: {
    gap: 12,
    paddingBottom: 4,
    marginBottom: 24,
  },
  creatorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    width: 110,
  },
  creatorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  creatorAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  creatorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 2,
    textAlign: 'center',
  },
  creatorHandle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  postCard: {
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  postAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postAuthorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A252F',
  },
  postTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  postText: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22,
    marginBottom: 12,
  },
  postMedia: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  postMediaPlaceholder: {
    height: 180,
    backgroundColor: 'rgba(13, 115, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  postMediaText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  postActionTextLiked: {
    color: '#E57373',
  },
  bottomPadding: {
    height: 20,
  },
  createPostContent: {
    gap: 16,
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createPostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  createPostAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  createPostName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A252F',
  },
  createPostInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#2C3E50',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  createPostActions: {
    flexDirection: 'row',
  },
  createPostAttach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(13, 115, 119, 0.1)',
  },
  createPostAttachText: {
    fontSize: 14,
    color: '#0D7377',
    fontWeight: '500',
  },
});
