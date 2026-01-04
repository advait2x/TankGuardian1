import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { 
  ArrowLeft, 
  MessageCircle, 
  Heart, 
  Share2,
  Lock,
  Unlock,
  Send,
  Image as ImageIcon
} from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/components/ui/Toast';
import { sampleUsers, samplePosts } from '@/data/mockData';
import { Tank } from '@/data/types';
import * as Haptics from 'expo-haptics';

type TabType = 'posts' | 'tanks';

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { currentUser, posts, tanks, likePost } = useApp();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Get user data (from sample users or current user)
  const user = useMemo(() => {
    const sampleUser = sampleUsers.find(u => u.id === userId);
    if (sampleUser) return sampleUser;
    if (currentUser?.id === userId) return currentUser;
    return null;
  }, [userId, currentUser]);

  // Get user's posts
  const userPosts = useMemo(() => {
    return [...posts, ...samplePosts]
      .filter((post, index, self) => 
        // Remove duplicates based on ID
        index === self.findIndex(p => p.id === post.id)
      )
      .filter(p => p.authorId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [userId, posts]);

  // Get user's public tanks (mock data for now)
  const userTanks = useMemo(() => {
    // In a real app, this would filter tanks by userId and public status
    return tanks.filter(t => Math.random() > 0.5).slice(0, 3);
  }, [tanks]);

  const isOwnProfile = currentUser?.id === userId;

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleMessagePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Message sent!', 'success');
    setMessageText('');
    setShowMessageModal(false);
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

  if (!user) {
    return (
      <View style={styles.container}>
        <AnimatedBackground />
        <SafeAreaView style={styles.safeArea}>
          <GlassCard style={styles.errorCard}>
            <Text style={styles.errorText}>User not found</Text>
            <Button title="Go Back" onPress={handleBack} variant="secondary" />
          </GlassCard>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedBackground variant="light" />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(220)} style={styles.header}>
          <TouchableOpacity 
            onPress={handleBack}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.backButton} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <Animated.View entering={FadeInDown.delay(80).duration(220)}>
            <GlassCard style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {user.displayName.charAt(0)}
                </Text>
              </View>
              
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{user.displayName}</Text>
                {user.role === 'creator' && (
                  <Badge label="Creator" variant="info" size="medium" />
                )}
              </View>
              
              <Text style={styles.profileHandle}>@{user.handle}</Text>
              
              {user.bio && (
                <Text style={styles.profileBio}>{user.bio}</Text>
              )}

              <View style={styles.profileStats}>
                <View style={styles.profileStat}>
                  <Text style={styles.profileStatValue}>{userPosts.length}</Text>
                  <Text style={styles.profileStatLabel}>Posts</Text>
                </View>
                <View style={styles.profileStatDivider} />
                <View style={styles.profileStat}>
                  <Text style={styles.profileStatValue}>{userTanks.length}</Text>
                  <Text style={styles.profileStatLabel}>Public Tanks</Text>
                </View>
                <View style={styles.profileStatDivider} />
                <View style={styles.profileStat}>
                  <Text style={styles.profileStatValue}>
                    {Math.floor(Math.random() * 500) + 100}
                  </Text>
                  <Text style={styles.profileStatLabel}>Followers</Text>
                </View>
              </View>

              {!isOwnProfile && (
                <Button
                  title="Send Message"
                  onPress={handleMessagePress}
                  variant="secondary"
                  fullWidth
                  icon={<MessageCircle size={18} color="#fff" />}
                />
              )}
            </GlassCard>
          </Animated.View>

          {/* Tabs */}
          <Animated.View entering={FadeInDown.delay(140).duration(220)} style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
              onPress={() => setActiveTab('posts')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
                Posts
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'tanks' && styles.tabActive]}
              onPress={() => setActiveTab('tanks')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'tanks' && styles.tabTextActive]}>
                Tanks
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <Animated.View entering={FadeIn.duration(220)}>
              {userPosts.length === 0 ? (
                <GlassCard style={styles.emptyState}>
                  <MessageCircle size={48} color="#94A3B8" />
                  <Text style={styles.emptyStateText}>No posts yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {isOwnProfile ? 'Share something with the community!' : 'This user hasn\'t posted anything yet'}
                  </Text>
                </GlassCard>
              ) : (
                userPosts.map((post, index) => {
                  const isLiked = likedPosts.has(post.id);
                  
                  return (
                    <GlassCard 
                      key={post.id} 
                      style={styles.postCard}
                      delay={200 + index * 50}
                    >
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

                      {/* Post Meta */}
                      <View style={styles.postMeta}>
                        <Text style={styles.postTime}>{formatTimeAgo(post.createdAt)}</Text>
                      </View>

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
                })
              )}
            </Animated.View>
          )}

          {/* Tanks Tab */}
          {activeTab === 'tanks' && (
            <Animated.View entering={FadeIn.duration(220)}>
              {userTanks.length === 0 ? (
                <GlassCard style={styles.emptyState}>
                  <Lock size={48} color="#94A3B8" />
                  <Text style={styles.emptyStateText}>No public tanks</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {isOwnProfile ? 'Make your tanks public to share them!' : 'This user hasn\'t shared any tanks publicly'}
                  </Text>
                </GlassCard>
              ) : (
                userTanks.map((tank, index) => (
                  <GlassCard 
                    key={tank.id} 
                    style={styles.tankCard}
                    delay={200 + index * 50}
                  >
                    <View style={styles.tankHeader}>
                      <View>
                        <Text style={styles.tankName}>{tank.name}</Text>
                        <Text style={styles.tankDetails}>
                          {tank.sizeGallons} gallons • {tank.fishInstances.length} fish
                        </Text>
                      </View>
                      <Unlock size={20} color="#4ECDC4" />
                    </View>
                    
                    <Text style={styles.tankDescription}>
                      A beautiful community tank with various fish species living harmoniously together.
                    </Text>

                    <View style={styles.tankStats}>
                      <View style={styles.tankStat}>
                        <Text style={styles.tankStatLabel}>Water Type</Text>
                        <Text style={styles.tankStatValue}>{tank.waterType}</Text>
                      </View>
                      <View style={styles.tankStat}>
                        <Text style={styles.tankStatLabel}>Setup Date</Text>
                        <Text style={styles.tankStatValue}>
                          {new Date(tank.setupDate).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </GlassCard>
                ))
              )}
            </Animated.View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>

      {/* Message Modal */}
      <Modal
        visible={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={`Message @${user.handle}`}
        size="medium"
      >
        <View style={styles.messageContent}>
          <Text style={styles.messageInfo}>
            Send a private message to {user.displayName}
          </Text>

          <TextInput
            style={styles.messageInput}
            placeholder="Type your message..."
            placeholderTextColor="#94A3B8"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            numberOfLines={6}
          />

          <Button
            title="Send Message"
            onPress={handleSendMessage}
            variant="secondary"
            fullWidth
            disabled={!messageText.trim()}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A252F',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  errorCard: {
    margin: 20,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileAvatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A252F',
  },
  profileHandle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 12,
  },
  profileBio: {
    fontSize: 15,
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  profileStats: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 20,
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatDivider: {
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  profileStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 4,
  },
  profileStatLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#0D7377',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#fff',
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
    textAlign: 'center',
  },
  postCard: {
    marginBottom: 12,
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
  postMeta: {
    marginBottom: 8,
  },
  postTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
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
  tankCard: {
    marginBottom: 12,
  },
  tankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tankName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 4,
  },
  tankDetails: {
    fontSize: 13,
    color: '#64748B',
  },
  tankDescription: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    marginBottom: 16,
  },
  tankStats: {
    flexDirection: 'row',
    gap: 20,
  },
  tankStat: {
    flex: 1,
  },
  tankStatLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  tankStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A252F',
  },
  bottomPadding: {
    height: 20,
  },
  messageContent: {
    gap: 16,
  },
  messageInfo: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  messageInput: {
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
});

