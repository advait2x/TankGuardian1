import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { 
  AlertTriangle, 
  CheckCircle, 
  Droplets, 
  Fish as FishIcon,
  ChevronRight,
  Clock,
  TrendingUp,
  Info
} from 'lucide-react-native';
import AnimatedBackground from '@/components/ui/AnimatedBackground';
import GlassCard from '@/components/ui/GlassCard';
import Mascot from '@/components/ui/Mascot';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/components/ui/Toast';
import { samplePosts, sampleUsers } from '@/data/mockData';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { currentUser, tanks, selectedTankId, tasks, completeTask } = useApp();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);

  const selectedTank = tanks.find(t => t.id === selectedTankId);
  const tankTasks = tasks.filter(t => t.tankId === selectedTankId);
  const todayTasks = tankTasks.filter(task => {
    const dueDate = new Date(task.nextDueAt);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  });

  // Calculate risk level
  const overdueTasks = tankTasks.filter(t => new Date(t.nextDueAt) < new Date());
  const riskScore = Math.min(100, overdueTasks.length * 25);
  const riskLevel = riskScore <= 25 ? 'low' : riskScore <= 50 ? 'medium' : 'high';

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleCompleteTask = async (taskId: string) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeTask(taskId);
    showToast('Task completed — nice work!', 'success');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D7377" />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{currentUser?.displayName || 'Aquarist'} 👋</Text>
            </View>
            <View style={styles.tankSelector}>
              <FishIcon size={16} color="#0D7377" />
              <Text style={styles.tankName}>{selectedTank?.name || 'No tank'}</Text>
            </View>
          </Animated.View>

          {/* Risk Meter Card */}
          {selectedTank && (
            <GlassCard style={styles.riskCard} delay={100}>
              <View style={styles.riskHeader}>
                <View style={styles.riskLabelContainer}>
                  <Text style={styles.riskLabel}>Tank Health</Text>
                  <TouchableOpacity 
                    onPress={() => setShowRiskModal(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Info size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <Badge 
                  label={riskLevel === 'low' ? 'Stable' : riskLevel === 'medium' ? 'Attention needed' : 'Action required'}
                  variant={riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'danger'}
                />
              </View>
              
              <ProgressBar 
                progress={100 - riskScore} 
                variant={riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'danger'}
                height={10}
              />
              
              <Text style={styles.riskMessage}>
                {riskLevel === 'low' 
                  ? "Nice — your tank looks stable today."
                  : riskLevel === 'medium'
                  ? "A few tasks need your attention."
                  : "Your tank needs immediate attention!"}
              </Text>
            </GlassCard>
          )}

          {/* Today's Tasks */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Tasks</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/mytank')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            {todayTasks.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <View style={styles.emptyContent}>
                  <Mascot variant="checklist" size="small" animate={false} />
                  <Text style={styles.emptyTitle}>All caught up!</Text>
                  <Text style={styles.emptyText}>No tasks due today. Your fish are happy.</Text>
                </View>
              </GlassCard>
            ) : (
              <View style={styles.tasksList}>
                {todayTasks.slice(0, 3).map((task, index) => (
                  <GlassCard key={task.id} style={styles.taskCard} delay={250 + index * 50}>
                    <TouchableOpacity 
                      style={styles.taskContent}
                      onPress={() => handleCompleteTask(task.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.taskIcon, { backgroundColor: getTaskColor(task.type) + '20' }]}>
                        {getTaskIcon(task.type)}
                      </View>
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        <View style={styles.taskMeta}>
                          <Clock size={12} color="#64748B" />
                          <Text style={styles.taskTime}>
                            {task.frequencyConfig.timeOfDay || 'Anytime'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.completeButton}>
                        <CheckCircle size={24} color="#4ECDC4" />
                      </View>
                    </TouchableOpacity>
                  </GlassCard>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Suggested Actions */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <Text style={styles.sectionTitle}>Suggested Actions</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionsScrollContent}
            >
              <GlassCard style={styles.actionCard} onPress={() => router.push('/(tabs)/mytank')}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(78, 205, 196, 0.2)' }]}>
                  <Droplets size={24} color="#4ECDC4" />
                </View>
                <Text style={styles.actionTitle}>Log Water Test</Text>
                <Text style={styles.actionSubtitle}>Track your parameters</Text>
              </GlassCard>

              <GlassCard style={styles.actionCard} onPress={() => router.push('/(tabs)/catalog')}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.2)' }]}>
                  <FishIcon size={24} color="#FF6B35" />
                </View>
                <Text style={styles.actionTitle}>Add Fish</Text>
                <Text style={styles.actionSubtitle}>Browse compatible species</Text>
              </GlassCard>

              <GlassCard style={styles.actionCard} onPress={() => router.push('/(tabs)/community')}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(13, 115, 119, 0.2)' }]}>
                  <TrendingUp size={24} color="#0D7377" />
                </View>
                <Text style={styles.actionTitle}>Get Inspired</Text>
                <Text style={styles.actionSubtitle}>Browse community tanks</Text>
              </GlassCard>
            </ScrollView>
          </Animated.View>

          {/* Community Preview */}
          <Animated.View entering={FadeInDown.delay(450).duration(400)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>From the Community</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/community')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            {samplePosts.slice(0, 2).map((post, index) => {
              const author = sampleUsers.find(u => u.id === post.authorId);
              return (
                <GlassCard 
                  key={post.id} 
                  style={styles.postCard} 
                  delay={500 + index * 50}
                  onPress={() => router.push('/(tabs)/community')}
                >
                  <View style={styles.postHeader}>
                    <View style={styles.postAvatar}>
                      <Text style={styles.postAvatarText}>
                        {author?.displayName.charAt(0) || '?'}
                      </Text>
                    </View>
                    <View style={styles.postAuthorInfo}>
                      <Text style={styles.postAuthorName}>{author?.displayName}</Text>
                      <Text style={styles.postTime}>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.postText} numberOfLines={2}>{post.text}</Text>
                  <View style={styles.postStats}>
                    <Text style={styles.postStat}>❤️ {post.likesCount}</Text>
                    <Text style={styles.postStat}>💬 {post.commentsCount}</Text>
                  </View>
                </GlassCard>
              );
            })}
          </Animated.View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Mascot - positioned as overlay */}
        <Animated.View 
          entering={FadeIn.delay(800).duration(600)}
          style={styles.mascotContainer}
        >
          <Mascot 
            variant="checklist" 
            size="small"
            position="right"
            tipText="Tap a task to complete it!"
          />
        </Animated.View>
      </SafeAreaView>

      {/* Risk Modal */}
      <Modal
        visible={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        title="Tank Health Score"
        size="medium"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalText}>
            Your tank health score is based on:
          </Text>
          <View style={styles.modalList}>
            <Text style={styles.modalListItem}>• Overdue tasks ({overdueTasks.length})</Text>
            <Text style={styles.modalListItem}>• Fish stocking levels</Text>
            <Text style={styles.modalListItem}>• Water test frequency</Text>
            <Text style={styles.modalListItem}>• Compatibility alerts</Text>
          </View>
          <Text style={styles.modalText}>
            Complete your tasks regularly to maintain a healthy tank!
          </Text>
          <Button 
            title="Got it" 
            onPress={() => setShowRiskModal(false)}
            variant="primary"
            fullWidth
          />
        </View>
      </Modal>
    </View>
  );
}

function getTaskIcon(type: string) {
  switch (type) {
    case 'feed':
      return <FishIcon size={20} color="#FF6B35" />;
    case 'water_change':
      return <Droplets size={20} color="#4ECDC4" />;
    case 'test':
      return <TrendingUp size={20} color="#0D7377" />;
    case 'maintenance':
      return <AlertTriangle size={20} color="#FFA726" />;
    default:
      return <CheckCircle size={20} color="#0D7377" />;
  }
}

function getTaskColor(type: string) {
  switch (type) {
    case 'feed':
      return '#FF6B35';
    case 'water_change':
      return '#4ECDC4';
    case 'test':
      return '#0D7377';
    case 'maintenance':
      return '#FFA726';
    default:
      return '#0D7377';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A252F',
  },
  tankSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 115, 119, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tankName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D7377',
  },
  riskCard: {
    marginBottom: 24,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riskLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A252F',
  },
  riskMessage: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D7377',
  },
  emptyCard: {
    marginBottom: 24,
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    padding: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A252F',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  tasksList: {
    gap: 10,
    marginBottom: 24,
  },
  taskCard: {
    padding: 14,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskTime: {
    fontSize: 12,
    color: '#64748B',
  },
  completeButton: {
    padding: 4,
  },
  actionsScrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  actionCard: {
    width: 140,
    padding: 14,
    marginBottom: 24,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  postCard: {
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0D7377',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  postAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A252F',
  },
  postTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  postText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    marginBottom: 10,
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  postStat: {
    fontSize: 13,
    color: '#64748B',
  },
  bottomPadding: {
    height: 20,
  },
  mascotContainer: {
    position: 'absolute',
    bottom: 100,
    right: 80,
  },
  modalContent: {
    gap: 16,
  },
  modalText: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22,
  },
  modalList: {
    backgroundColor: 'rgba(13, 115, 119, 0.05)',
    borderRadius: 12,
    padding: 14,
  },
  modalListItem: {
    fontSize: 14,
    color: '#2C3E50',
    paddingVertical: 4,
  },
});
